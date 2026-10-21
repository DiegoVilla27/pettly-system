import type { ApiResponse } from '@pettly/api-client';
import {
  test,
  expect,
  type APIResponse,
  type APIRequestContext,
} from '@playwright/test';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { signIn, accessible, resetIsolatedRates } from './helpers/identity';
const reason = 'Isolated complete backoffice workflow verification';
async function json<T>(r: APIResponse): Promise<T> {
  expect(r.ok(), await r.text()).toBe(true);
  return r.json() as Promise<T>;
}
async function mailToken(
  request: APIRequestContext,
  email: string,
  subject: string,
) {
  let token = '';
  await expect
    .poll(
      async () => {
        const list = await (
          await request.get(
            process.env['MAILPIT_TEST_URL'] + '/api/v1/messages',
          )
        ).json();
        for (const m of list.messages ?? []) {
          if (
            !m.To.some((t: { Address: string }) => t.Address === email) ||
            !m.Subject.includes(subject)
          )
            continue;
          const mail = await (
            await request.get(
              process.env['MAILPIT_TEST_URL'] + '/api/v1/message/' + m.ID,
            )
          ).json();
          token = mail.Text.match(/token=([A-Za-z0-9_-]{43})/)?.[1] ?? '';
          if (token) return true;
        }
        return false;
      },
      { timeout: 25000 },
    )
    .toBe(true);
  return token;
}
test('business owner prepares private clinical evidence, own credentials and eligible named selection', async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(180000);
  const admin = await signIn(page, 'admin@example.com'),
    headers = { Authorization: 'Bearer ' + admin };
  const mobile = await json<ApiResponse<'login'>>(
    await context.request.post('/api/auth/login', {
      data: {
        email: 'customer@example.com',
        password: 'A sufficiently long password!',
        client: 'mobile',
      },
    }),
  );
  const ownerHeaders = { Authorization: 'Bearer ' + mobile.accessToken };
  const user = await json<ApiResponse<'getCurrentUser'>>(
    await context.request.get('/api/users/me', { headers: ownerHeaders }),
  );
  let org = await json<ApiResponse<'createOrganization'>>(
    await context.request.post('/api/organizations', {
      headers,
      data: {
        name: 'Clínica Colibrí Integral',
        type: 'business',
        reason,
        profile: {
          legalName: 'Colibrí Integral SAS',
          registrationNumber: '901876462',
          email: 'clinica-integral@example.com',
          phone: '+573001234567',
          countryCode: 'CO',
          city: 'Bogotá',
          address: 'Carrera de pruebas 123',
        },
      },
    }),
  );
  org = await json(
    await context.request.post('/api/organizations/' + org.id + '/submit', {
      headers,
      data: { expectedVersion: org.version, reason },
    }),
  );
  org = await json(
    await context.request.post('/api/organizations/' + org.id + '/approve', {
      headers,
      data: {
        expectedVersion: org.version,
        reason,
        responsibleUserId: user.id,
      },
    }),
  );
  const resource = await json<ApiResponse<'createServiceResource'>>(
    await context.request.post('/api/services/admin/resources', {
      headers,
      data: {
        organizationId: org.id,
        reason,
        profile: {
          name: 'Consulta Colibrí Individual',
          kind: 'appointment',
          capacity: 1,
          status: 'active',
          windows: [{ day: 1, startMinute: 480, endMinute: 1080 }],
        },
      },
    }),
  );
  const owner = await browser.newContext({
    baseURL: process.env['ADMIN_TEST_URL'],
  });
  try {
    const p = await owner.newPage();
    const token = await signIn(p, 'customer@example.com'),
      h = { Authorization: 'Bearer ' + token };
    await p.goto('/veterinaria');
    await expect(p).toHaveURL(/mis-acreditaciones$/);
    await p.getByRole('link', { name: 'Preparar acreditación' }).click();
    await p.getByLabel('Empresa de acreditación').selectOption(org.id);
    await expect(
      p.getByLabel('Profesional titular').locator('option'),
    ).toHaveCount(2);
    await p.getByLabel('Profesional titular').selectOption(user.id);
    await p.getByLabel('Agenda dedicada').selectOption(resource.id);
    await p.getByLabel('Matrícula profesional').fill('100000991');
    await p
      .getByLabel('Universidad', { exact: true })
      .fill('Universidad de pruebas clínicas');
    await p.getByLabel('Motivo del perfil profesional').fill(reason);
    await p.getByLabel('El profesional ha consentido').check();
    await p.getByRole('button', { name: 'Guardar perfil profesional' }).click();
    await expect(p).toHaveURL(/\/veterinaria\/[0-9a-f-]+\/preparar$/);
    const credentialId = p.url().split('/').at(-2);
    if (!credentialId)
      throw Error('The created credential URL contains no identifier.');
    const require = createRequire(resolve('apps/api/package.json'));
    const image = await require('sharp')({
      create: { width: 400, height: 300, channels: 3, background: '#edf3e7' },
    })
      .png()
      .toBuffer();
    for (const kind of [
      'professional_card',
      'qualification',
      'standing_certificate',
    ]) {
      await p.getByLabel('Acción de acreditación').selectOption('upload');
      await p.getByLabel('Tipo de evidencia').selectOption(kind);
      await p.getByLabel('Imagen de la evidencia').setInputFiles({
        name: 'clinical.png',
        mimeType: 'image/png',
        buffer: image,
      });
      await p.getByLabel('Motivo de la acreditación').fill(reason);
      await p.getByLabel('Confirmo la acción y la retirada').check();
      const r = p.waitForResponse(
        (r) =>
          r.url().endsWith('/documents') && r.request().method() === 'POST',
      );
      await p
        .getByRole('button', { name: 'Registrar cambio de acreditación' })
        .click();
      expect((await r).ok()).toBe(true);
      await expect(p.getByLabel('Acción de acreditación')).toHaveValue('');
    }
    await accessible(p);
    await p.getByLabel('Acción de acreditación').selectOption('submit');
    await p.getByLabel('Motivo de la acreditación').fill(reason);
    await p.getByLabel('Confirmo la acción y la retirada').check();
    await p
      .getByRole('button', { name: 'Registrar cambio de acreditación' })
      .click();
    await expect(
      p.getByText('La acreditación está en revisión;', { exact: false }),
    ).toBeVisible();
    const mine = await json<ApiResponse<'listOwnVeterinaryCredentials'>>(
      await owner.request.get(
        '/api/veterinary/credentials/mine?organizationId=' + org.id,
        { headers: h },
      ),
    );
    expect(mine.items).toHaveLength(1);
    expect(mine.items[0].professionalId).toBe(user.id);
    const approved = await json<ApiResponse<'reviewVeterinaryCredential'>>(
      await context.request.post(
        '/api/veterinary/credentials/' + credentialId + '/review',
        {
          headers,
          data: {
            expectedVersion: 5,
            approved: true,
            reason,
            officialRegisterChecked: true,
            verificationReference:
              'https://registro-profesional.example/100000991',
            verifiedUntil: new Date(Date.now() + 30 * 86400000).toISOString(),
          },
        },
      ),
    );
    expect(approved.status).toBe('approved');
    const eligible = await json<
      ApiResponse<'listEligibleVeterinaryCredentials'>
    >(
      await owner.request.get(
        '/api/veterinary/credentials/eligible?organizationId=' + org.id,
        { headers: h },
      ),
    );
    expect(eligible.items).toHaveLength(1);
    expect(eligible.items[0]).toEqual(
      expect.objectContaining({
        id: credentialId,
        professionalId: user.id,
        resourceId: resource.id,
        professionalName: 'Carlos Pettly',
      }),
    );
    expect(Object.keys(eligible.items[0]).sort()).toEqual(
      [
        'id',
        'organizationId',
        'professionalId',
        'professionalName',
        'resourceId',
        'verifiedUntil',
      ].sort(),
    );
    await p.goto('/servicios/' + org.id + '/nuevo');
    await p
      .getByLabel('Categoría del servicio', { exact: true })
      .selectOption('veterinary');
    await p
      .getByLabel('Profesional veterinario', { exact: true })
      .selectOption(credentialId);
    await expect(
      p.getByLabel('Recursos asignados').locator('option:checked'),
    ).toHaveText([resource.name + ' · capacidad 1']);
    await accessible(p);
    await p.goto('/condiciones-comerciales?organizationId=' + org.id);
    await expect(
      p.getByLabel('Empresa comercial', { exact: true }),
    ).toHaveValue(org.id);
    await p.getByLabel('Habilitar compras con estas condiciones').check();
    await p.getByRole('button', { name: 'Añadir ciudad de envío' }).click();
    await p.getByLabel('Ciudad de envío 1', { exact: true }).fill('Bogotá');
    await p
      .getByLabel('Tarifa de envío COP 1', { exact: true })
      .fill('12500,50');
    await p
      .getByLabel('Condiciones de compra', { exact: true })
      .fill('Entrega en Bogotá y condiciones comerciales verificadas.');
    await p.getByLabel('Motivo de cambio comercial').fill(reason);
    await p.getByLabel('Confirmo las condiciones para futuras compras').check();
    await p
      .getByRole('button', { name: 'Guardar condiciones comerciales' })
      .click();
    await expect(
      p.getByText('Condiciones comerciales guardadas.', { exact: true }),
    ).toBeVisible();
    await expect(
      p
        .getByRole('list', { name: 'Historial comercial' })
        .getByRole('listitem'),
    ).toHaveCount(1);
    await accessible(p);
    const policy = await json<ApiResponse<'getCommercialPolicy'>>(
      await owner.request.get(
        '/api/organizations/' + org.id + '/order-policy',
        { headers: h },
      ),
    );
    expect(policy.policy?.shippingRules[0].feeMinor).toBe(1250050);
    expect(policy.policy?.collector).toBe('platform');
    await p.goto('/organizaciones');
    await expect(p).toHaveURL(/mis-equipos$/);
    await p.getByRole('link', { name: new RegExp(org.name) }).click();
    await expect(
      p.getByRole('heading', {
        name: 'Equipo de mi organización',
        exact: true,
      }),
    ).toBeVisible();
    await accessible(p);
    await expect(
      p
        .getByRole('list', { name: 'Historial de mi organización' })
        .getByRole('listitem')
        .first(),
    ).toBeVisible();
    await expect(p.getByRole('alert')).toHaveCount(0);
    await p.setViewportSize({ width: 390, height: 844 });
    expect(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await p.screenshot({
      path: 'tmp/admin-own-team-mobile.png',
    });
    await p
      .getByRole('list', { name: 'Historial de mi organización' })
      .scrollIntoViewIfNeeded();
    await p.screenshot({ path: 'tmp/admin-own-team-history-mobile.png' });
    await json(
      await context.request.post(
        '/api/veterinary/credentials/' + credentialId + '/revoke',
        { headers, data: { expectedVersion: approved.version, reason } },
      ),
    );
    const after = await json<ApiResponse<'listEligibleVeterinaryCredentials'>>(
      await owner.request.get(
        '/api/veterinary/credentials/eligible?organizationId=' + org.id,
        { headers: h },
      ),
    );
    expect(after.items).toHaveLength(0);
    await page.goto('/organizaciones/' + org.id + '/revision');
    await page.getByLabel('Motivo de archivo de organización').fill(reason);
    await page.getByLabel('Confirmo la eliminación definitiva').check();
    await page
      .getByRole('button', { name: 'Archivar organización', exact: true })
      .click();
    await expect(
      page.getByText('Organización archivada y anonimizada.', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('La organización está archivada.', { exact: false }),
    ).toBeVisible();
    await accessible(page);
  } finally {
    await owner.close();
  }
  await resetIsolatedRates();
});
test('invitation, own profile, sessions, password reset and account lifecycle use real email links', async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(150000);
  const token = await signIn(page, 'admin@example.com'),
    headers = { Authorization: 'Bearer ' + token };
  const email = 'closure-profile@example.com';
  const invitation = await context.request.post('/api/users', {
    headers,
    data: { email, name: 'Lucía', lastName: 'Pruebas', reason },
  });
  expect(invitation.status()).toBe(202);
  const invited = await browser.newContext({
    baseURL: process.env['ADMIN_TEST_URL'],
  });
  try {
    const p = await invited.newPage();
    const t = await mailToken(context.request, email, 'Accept your invitation');
    await p.goto('/accept-invitation#token=' + t);
    await expect(p).toHaveURL(/accept-invitation$/);
    await p
      .getByLabel('Nueva contraseña', { exact: true })
      .fill('A sufficiently long password!');
    await p
      .getByLabel('Repite la contraseña', { exact: true })
      .fill('A sufficiently long password!');
    await p.getByRole('button', { name: 'Guardar contraseña' }).click();
    await expect(
      p.getByText('Acción completada.', { exact: false }),
    ).toBeVisible();
    const invitedUsers = await json<ApiResponse<'listUsers'>>(
      await context.request.get('/api/users?search=' + email, { headers }),
    );
    const invitedId = invitedUsers.items.find((u) => u.email === email)?.id;
    if (!invitedId) throw Error('The invited account was not found.');
    await json(
      await context.request.patch('/api/users/' + invitedId + '/role', {
        headers,
        data: { role: 'moderator', reason },
      }),
    );
    const own = await signIn(p, email);
    await p.goto('/cuenta');
    await p.getByLabel('Nombres', { exact: true }).fill('Lucía María');
    await p
      .getByRole('button', { name: 'Guardar perfil', exact: true })
      .click();
    await expect(
      p.getByText('Cambio registrado. Actualiza para comprobar el estado.', {
        exact: true,
      }),
    ).toBeVisible();
    await p.getByRole('button', { name: 'Actualizar mi cuenta' }).click();
    await expect(p.getByLabel('Nombres', { exact: true })).toHaveValue(
      'Lucía María',
    );
    await accessible(p);
    await json(
      await invited.request.post('/api/auth/login', {
        data: {
          email,
          password: 'A sufficiently long password!',
          client: 'mobile',
        },
      }),
    );
    await p.getByRole('button', { name: 'Actualizar mi cuenta' }).click();
    await expect(
      p
        .getByRole('list', { name: 'Mis sesiones activas' })
        .getByRole('listitem'),
    ).toHaveCount(2);
    await p.getByLabel('Cambio de seguridad').selectOption('logout-all');
    await p.getByLabel('Confirmo la acción seleccionada y sus efectos').check();
    await p
      .getByRole('button', { name: 'Aplicar cambio de seguridad' })
      .click();
    await expect(p).toHaveURL(/acceso$/);
    expect(
      (
        await invited.request.get('/api/users/me', {
          headers: { Authorization: 'Bearer ' + own },
        })
      ).status(),
    ).toBe(401);
    await p.goto('/forgot-password');
    await p.getByLabel('Correo electrónico', { exact: true }).fill(email);
    await p.getByRole('button', { name: 'Enviar enlace' }).click();
    await expect(
      p.getByText('Si la cuenta cumple los requisitos,', { exact: false }),
    ).toBeVisible();
    const reset = await mailToken(
      context.request,
      email,
      'Reset your password',
    );
    await p.goto('/reset-password#token=' + reset);
    await expect(p).toHaveURL(/reset-password$/);
    await p
      .getByLabel('Nueva contraseña', { exact: true })
      .fill('A different sufficient password!');
    await p
      .getByLabel('Repite la contraseña', { exact: true })
      .fill('A different sufficient password!');
    await p.getByRole('button', { name: 'Guardar contraseña' }).click();
    await expect(
      p.getByText('Acción completada.', { exact: false }),
    ).toBeVisible();
    await accessible(p);
    await p.setViewportSize({ width: 390, height: 844 });
    expect(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(p.locator('app-brand')).toHaveCount(1);
    await expect(p.locator('main')).toHaveCount(1);
    await p.screenshot({
      path: 'tmp/admin-recovery-mobile.png',
      fullPage: true,
    });
  } finally {
    await invited.close();
  }
  const users = await json<ApiResponse<'listUsers'>>(
    await context.request.get('/api/users?search=' + email, { headers }),
  );
  const id = users.items.find((u) => u.email === email)?.id;
  if (!id) throw Error('The account selected for deletion was not found.');
  await page.goto('/usuarios/' + id);
  await page.getByLabel('Motivo de eliminación de cuenta').fill(reason);
  await page.getByLabel('Confirmo la eliminación definitiva').check();
  await page.getByRole('button', { name: 'Eliminar cuenta' }).click();
  await expect(
    page.getByText('Cuenta eliminada y anonimizada.', { exact: true }),
  ).toBeVisible();
  await resetIsolatedRates();
});
