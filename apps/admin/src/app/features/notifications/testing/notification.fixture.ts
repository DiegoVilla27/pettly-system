const id = '11111111-1111-4111-8111-111111111111';
export const notice = {
  id,
  category: 'organizations' as const,
  eventType: 'organization.created',
  subjectType: 'organization',
  subjectId: id,
  subjectVersion: 1,
  status: 'draft',
  title: 'Organización creada',
  body: 'Consulta tu organización.',
  createdAt: '2026-10-10T00:00:00.000Z',
  readAt: null,
};
export const preferences = {
  ordersEmail: true,
  adoptionsEmail: true,
  bookingsEmail: true,
  version: 0,
  updatedAt: notice.createdAt,
  organizationEmailMandatory: true as const,
  inAppMandatory: true as const,
};
export const delivery = {
  id,
  notificationId: id,
  subjectType: 'organization',
  subjectId: id,
  subjectVersion: 1,
  mailPurpose: 'business_notice',
  failureKind: 'delivery_failed',
  expiresAt: '2026-10-11T00:00:00.000Z',
  notBefore: notice.createdAt,
  failedAt: notice.createdAt,
  deliveredAt: null,
  attempts: 5,
  createdAt: notice.createdAt,
  retryOfId: null,
};
