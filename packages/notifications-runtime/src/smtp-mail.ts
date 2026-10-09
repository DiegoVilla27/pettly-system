import * as nodemailer from 'nodemailer';
import type { TransactionalEmail, MailTransport } from './mail';
import type { RuntimeConfig } from './config';
export class SmtpMailTransport implements MailTransport {
  private readonly transport: nodemailer.Transporter;
  constructor(private readonly settings: RuntimeConfig) {
    this.transport = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpSecure,
      auth: settings.smtpUser
        ? { user: settings.smtpUser, pass: settings.smtpPassword }
        : undefined,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }
  async send(message: {
    id: string;
    to: string;
    subject: string;
    text: string;
    html: string;
  }) {
    await this.transport.sendMail({
      from: this.settings.mailFrom,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      messageId: `<${message.id}@pettly.mail>`,
    });
  }
  close() {
    this.transport.close();
  }
}
function escape(value: string) {
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return value.replace(/[&<>"']/g, (c) => entities[c] || c);
}
export function renderActionEmail(email: TransactionalEmail, webUrl: string) {
  if (email.purpose === 'business_notice') {
    const text = `${email.title}\n\n${email.body}\n\nEste aviso refleja un evento registrado en Pettly. Consulta el estado actual en tu cuenta.`;
    return {
      id: email.id,
      to: email.to,
      subject: email.title,
      text,
      html: `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escape(email.title)}</title></head><body style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5"><h1>${escape(email.title)}</h1><p>${escape(text).replace(/\n/g, '<br>')}</p></body></html>`,
    };
  }
  if ('bookingId' in email) {
    const title =
      email.purpose === 'booking_reminder'
        ? 'Recordatorio de tu reserva'
        : 'Actualización de tu reserva';
    const date = (s: string) =>
      new Intl.DateTimeFormat('es-CO', {
        timeZone: 'America/Bogota',
        dateStyle: 'full',
        timeStyle: 'short',
      }).format(new Date(s));
    const amount = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
    }).format(email.totalMinor / 100);
    const statuses: Record<string, string> = {
      requested: 'pendiente de confirmación',
      confirmed: 'confirmada',
      in_progress: 'en atención',
      completed: 'completada',
      cancelled: 'cancelada',
      rejected: 'rechazada',
      expired: 'vencida',
      no_show: 'inasistencia',
    };
    const text = `${title} en Pettly\nReserva: ${email.bookingId}\n${email.serviceName} — ${email.organizationName}\nEstado: ${statuses[email.status] ?? email.status}\nInicio: ${date(email.startsAt)}\nFin: ${date(email.endsAt)}\nValor: ${amount}. Pago en el establecimiento; Pettly no ha cobrado esta reserva.\nTodos los horarios corresponden a Colombia (America/Bogota).`;
    return {
      id: email.id,
      to: email.to,
      subject: title,
      text,
      html: `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${title}</title></head><body style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5"><h1>${title}</h1><p>${escape(text).replace(/\n/g, '<br>')}</p></body></html>`,
    };
  }
  const actions = {
    verification: {
      title: 'Verify your email',
      path: '/verify-email',
      instruction: 'verify your account email',
    },
    reset: {
      title: 'Reset your password',
      path: '/reset-password',
      instruction: 'choose a new password',
    },
    invitation: {
      title: 'Accept your invitation',
      path: '/accept-invitation',
      instruction: 'choose your password and activate your invited account',
    },
    email_change: {
      title: 'Confirm your email change',
      path: '/confirm-email-change',
      instruction: 'confirm this address as your new account email',
    },
  };
  const notices = {
    password_changed: {
      title: 'Your password was changed',
      text: 'Your Pettly password was changed and all sessions were revoked.',
    },
    email_changed: {
      title: 'Your email was changed',
      text: 'Your Pettly account email was changed and all sessions were revoked.',
    },
    email_change_requested: {
      title: 'An email change was requested',
      text: 'A request to change your Pettly account email was received. The change will only take effect after verification of the new address.',
    },
  };
  if (email.purpose in notices) {
    const notice = notices[email.purpose as keyof typeof notices];
    const text = `${notice.text} If this was not you, contact Pettly support immediately.`;
    return {
      id: email.id,
      to: email.to,
      subject: `${notice.title} for Pettly`,
      text,
      html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${notice.title}</title></head><body><h1>${notice.title}</h1><p>${escape(text)}</p></body></html>`,
    };
  }
  const action = actions[email.purpose as keyof typeof actions];
  if (!action) throw new Error('Unsupported transactional email purpose.');
  const url = new URL(action.path, webUrl);
  // Fragments keep sensitive tokens out of HTTP access logs and referrers.
  url.hash = new URLSearchParams({ token: email.token }).toString();
  const expiry = new Date(email.expiresAt).toISOString();
  const text = `${action.title} for Pettly\n\n${url.toString()}\n\nThis link can be used once and expires at ${expiry}. If you did not request this email, you can ignore it.`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${action.title} for Pettly</title></head><body style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5"><h1>${action.title} for Pettly</h1><p>Use the button below to ${action.instruction}.</p><p><a href="${escape(url.toString())}" style="display:inline-block;padding:14px 24px;background:#165b3d;color:#fff">${action.title}</a></p><p>This link can be used once and expires at ${escape(expiry)}.</p><p>If you did not request this email, you can ignore it.</p></body></html>`;
  return {
    id: email.id,
    to: email.to,
    subject: `${action.title} for Pettly`,
    text,
    html,
  };
}
