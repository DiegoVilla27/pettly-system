import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  Notification,
  emailEnabled,
  validateNotice,
  type NotificationState,
  type Preferences,
} from '../../src/modules/notifications/domain/notification';
import { NotificationsHandlers } from '../../src/modules/notifications/application/handlers/notifications.handlers';
import type {
  NotificationsRepository,
  NotificationsWork,
  EmailJob,
} from '../../src/modules/notifications/application/ports/out/notifications-repository';
import type { UsersDirectory } from '../../src/modules/users/application/ports/out/users-directory';
import {
  PreferencesDto,
  NotificationsQueryDto,
} from '../../src/modules/notifications/adapters/in/http/dtos/requests/notifications.requests';
import { renderActionEmail } from '@pettly/notifications-runtime';
const now = new Date('2026-10-09T10:00:00Z');
const state = (): NotificationState => ({
  id: randomUUID(),
  userId: randomUUID(),
  eventKey: randomUUID(),
  category: 'orders',
  eventType: 'order.created',
  subjectType: 'order',
  subjectId: randomUUID(),
  subjectVersion: 1,
  status: 'awaiting_payment',
  title: 'Pedido',
  body: 'El pedido está pendiente de pago.',
  details: null,
  createdAt: now,
  readAt: null,
});
test('notification read is one-way, idempotent and protects its snapshot', () => {
  const s = state(),
    n = Notification.restore(s);
  assert.equal(n.read(now), true);
  assert.equal(n.read(new Date(+now + 1000)), false);
  assert.deepEqual(n.snapshot().readAt, now);
  const copy = n.snapshot();
  copy.body = 'tampered';
  assert.equal(n.snapshot().body, s.body);
  assert.equal(s.readAt, null);
  assert.throws(() => validateNotice({ ...s, subjectVersion: 0 }));
  assert.throws(() => validateNotice({ ...s, eventType: 'bad event' }));
  assert.throws(() => validateNotice({ ...s, status: randomUUID() }));
  assert.throws(() => Notification.restore(s).read(new Date(+now - 1)));
});
test('strict preferences and pagination cannot override recipient or mandatory channels', () => {
  const p = {
    expectedVersion: 0,
    ordersEmail: false,
    adoptionsEmail: false,
    bookingsEmail: false,
  };
  assert.ok(PreferencesDto.schema.safeParse(p).success);
  assert.equal(
    PreferencesDto.schema.safeParse({ ...p, userId: randomUUID() }).success,
    false,
  );
  assert.equal(
    PreferencesDto.schema.safeParse({ ...p, organizationEmailMandatory: false })
      .success,
    false,
  );
  assert.equal(
    NotificationsQueryDto.schema.safeParse({ limit: '51' }).success,
    false,
  );
  const prefs = { ...p, userId: randomUUID(), version: 1, updatedAt: now };
  assert.equal(emailEnabled(prefs, 'orders'), false);
  assert.equal(emailEnabled(prefs, 'organizations'), true);
  assert.equal(emailEnabled(null, 'adoptions'), true);
});
test('publisher deduplicates recipients and events, skips inactive accounts and persists opt-out inbox without mail', async () => {
  const recipient = randomUUID(),
    inactive = randomUUID(),
    stored: NotificationState[] = [],
    jobs: EmailJob[] = [];
  let prefs: Preferences | null = null;
  const tx = {
    lock: async () => undefined,
    event: async (userId: string, key: string) =>
      stored.find((n) => n.userId === userId && n.eventKey === key) ?? null,
    create: async (n: NotificationState) => {
      stored.push(n);
    },
    preferences: async () => prefs,
    enqueue: async (j: EmailJob) => {
      jobs.push(j);
    },
  } as unknown as NotificationsWork;
  const repo: NotificationsRepository = { run: async (fn) => fn(tx) };
  const users = {
    findById: async (id: string) => ({
      id,
      email: 'recipient@example.test',
      status: id === inactive ? 'inactive' : 'active',
      emailVerifiedAt: now,
    }),
  } as unknown as UsersDirectory;
  const h = new NotificationsHandlers(
    repo,
    users,
    { now: () => now },
    { id: randomUUID, token: randomUUID, digest: (s) => s },
  );
  const s = state(),
    c = { ...s, recipientIds: [recipient, recipient, inactive], now };
  await h.publish(c);
  await h.publish(c);
  assert.equal(stored.length, 1);
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].purpose, 'business_notice');
  await assert.rejects(h.publish({ ...c, status: 'paid' }));
  prefs = {
    userId: recipient,
    ordersEmail: false,
    adoptionsEmail: false,
    bookingsEmail: false,
    version: 1,
    updatedAt: now,
  };
  await h.publish({ ...c, eventKey: randomUUID() });
  assert.equal(stored.length, 2);
  assert.equal(jobs.length, 1);
  await h.publish({ ...c, eventKey: randomUUID(), category: 'organizations' });
  assert.equal(stored.length, 3);
  assert.equal(jobs.length, 2);
});
test('business mail escapes event text and includes plain text without inventing client URLs', () => {
  const rendered = renderActionEmail(
    {
      id: randomUUID(),
      to: 'recipient@example.test',
      userId: randomUUID(),
      purpose: 'business_notice',
      category: 'orders',
      title: 'Pedido <script>',
      body: 'Estado <img src=x> & referencia',
      expiresAt: new Date(+now + 3600000).toISOString(),
    },
    'https://pettly.example.test',
  );
  assert.ok(rendered.html.includes('&lt;script&gt;'));
  assert.ok(!rendered.html.includes('<img src=x>'));
  assert.ok(rendered.text.includes('Estado <img src=x>'));
  assert.ok(!rendered.text.includes('https://pettly.example.test'));
});
