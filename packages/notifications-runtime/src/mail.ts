export interface ActionEmail {
  userId?: string;
  id: string;
  to: string;
  token: string;
  purpose:
    | 'verification'
    | 'reset'
    | 'invitation'
    | 'email_change'
    | 'password_changed'
    | 'email_changed'
    | 'email_change_requested';
  expiresAt: string;
}
export interface MailTransport {
  send(message: {
    id: string;
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<void>;
}

export interface BookingEmail {
  id: string;
  to: string;
  userId: string;
  purpose: 'booking_update' | 'booking_reminder';
  bookingId: string;
  serviceName: string;
  organizationName: string;
  status: string;
  startsAt: string;
  endsAt: string;
  totalMinor: number;
  expiresAt: string;
}
export interface BusinessEmail {
  category: 'orders' | 'adoptions' | 'organizations' | 'bookings';
  id: string;
  to: string;
  userId: string;
  purpose: 'business_notice';
  title: string;
  body: string;
  expiresAt: string;
}
export type TransactionalEmail = ActionEmail | BookingEmail | BusinessEmail;
