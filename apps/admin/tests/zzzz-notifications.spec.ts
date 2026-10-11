import {
  test,
  expect,
  type APIResponse,
  type Response,
} from '@playwright/test';
import type { ApiResponse } from '@pettly/api-client';
import { execFileSync } from 'node:child_process';
import { signIn, accessible, resetIsolatedRates } from './helpers/identity';
const reason = 'SMTP service restored; recover informational delivery.';
async function json<T>(r: APIResponse | Response): Promise<T> {
  expect(r.ok(), await r.text()).toBe(true);
  return (await r.json()) as T;
}
function fixture(action: string, id: string) {
  return JSON.parse(
    execFileSync(
      process.execPath,
      [
        '--import',
        'tsx',
        'scripts/testing/notifications-fixture.ts',
        action,
        id,
      ],
      { env: process.env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    ),
  ) as {
    eligible: string;
    legacy: string;
    superseded: string;
    childId: string | null;
    delivered: boolean;
    audited: boolean;
    reason: string | null;
  };
}
test('personal inbox, bounded read cutoff, versioned preferences, private delivery recovery and permissions', async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(180000);
  const token = await signIn(page, 'admin@example.com'),
    headers = { Authorization: 'Bearer ' + token };
  let number = 0;
  const event = async () => {
    const n = ++number;
    const org = await json<ApiResponse<'requestOrganization'>>(
      await context.request.post('/api/organizations/requests', {
        headers,
        data: {
          name: 'Avisos Aurora ' + n,
          type: 'business',
          profile: {
            legalName: 'Avisos Aurora SAS ' + n,
            registrationNumber: '901733' + String(n).padStart(3, '0'),
            email: 'avisos@example.com',
            phone: '+573005556688',
            countryCode: 'CO',
            city: 'Bogotá',
            address: 'Calle de pruebas 107',
          },
        },
      }),
    );
    await json<ApiResponse<'getOrganizationProfile'>>(
      await context.request.post('/api/organizations/' + org.id + '/submit', {
        headers,
        data: { reason, expectedVersion: org.version },
      }),
    );
    return org;
  };
  for (let i = 0; i < 12; i++) await event();
  await page.goto(
    '/notificaciones?category=organizations&unreadOnly=true&limit=10',
  );
  const list = page.getByRole('list', { name: 'Notificaciones personales' });
  await expect(list.getByRole('listitem')).toHaveCount(10);
  await page.reload();
  await expect(
    page.getByLabel('Categoría de notificación', { exact: true }),
  ).toHaveValue('organizations');
  await expect(
    page.getByLabel('Mostrar solo sin leer', { exact: true }),
  ).toBeChecked();
  await accessible(page);
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(list.getByRole('listitem').first()).toBeVisible();
  const readResponse = page.waitForResponse(
    (r) =>
      r.url().includes('/notifications/') &&
      r.url().endsWith('/read') &&
      r.request().method() === 'POST',
  );
  await page
    .getByRole('button', { name: 'Marcar como leída', exact: true })
    .first()
    .click();
  const read = await json<ApiResponse<'readOwnNotification'>>(
    await readResponse,
  );
  expect(read.readAt).not.toBeNull();
  const replay = await json<ApiResponse<'readOwnNotification'>>(
    await context.request.post('/api/notifications/' + read.id + '/read', {
      headers,
      data: {},
    }),
  );
  expect(replay.readAt).toBe(read.readAt);
  await page.goto(
    '/notificaciones?category=organizations&unreadOnly=true&limit=10',
  );
  await expect(list.getByRole('listitem')).toHaveCount(10);
  const newerOrg = await event();
  const bulkResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith('/notifications/read-all') &&
      r.request().method() === 'POST',
  );
  await page
    .getByLabel('Confirmo marcar las notificaciones anteriores como leídas', {
      exact: true,
    })
    .check();
  await page
    .getByRole('button', { name: 'Marcar anteriores como leídas', exact: true })
    .click();
  const bulk = await json<ApiResponse<'readAllOwnNotifications'>>(
    await bulkResponse,
  );
  expect(bulk.updated).toBeGreaterThan(0);
  const after = await json<ApiResponse<'listOwnNotifications'>>(
    await context.request.get(
      '/api/notifications?category=organizations&unreadOnly=true',
      { headers },
    ),
  );
  expect(
    after.items.some((n) => n.subjectId === newerOrg.id && n.readAt === null),
  ).toBe(true);
  await page
    .getByRole('button', { name: 'Actualizar bandeja', exact: true })
    .click();
  await expect(list.getByRole('listitem')).toHaveCount(after.items.length);
  await accessible(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: 'tmp/admin-notifications-inbox.png',
    fullPage: true,
  });
  await page.goto('/notificaciones/preferencias');
  await expect(
    page.getByLabel('Correos de pedidos', { exact: true }),
  ).toBeChecked();
  await accessible(page);
  await page.getByLabel('Correos de pedidos', { exact: true }).uncheck();
  const savedResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith('/notifications/preferences') &&
      r.request().method() === 'PUT',
  );
  await page
    .getByRole('button', { name: 'Guardar preferencias', exact: true })
    .click();
  const saved = await json<ApiResponse<'changeOwnNotificationPreferences'>>(
    await savedResponse,
  );
  expect(saved.ordersEmail).toBe(false);
  expect(saved.organizationEmailMandatory).toBe(true);
  await expect(
    page.getByText(
      'Preferencias guardadas. Los canales obligatorios siguen activos.',
      { exact: true },
    ),
  ).toBeVisible();
  await json<ApiResponse<'changeOwnNotificationPreferences'>>(
    await context.request.put('/api/notifications/preferences', {
      headers,
      data: {
        expectedVersion: saved.version,
        ordersEmail: true,
        adoptionsEmail: false,
        bookingsEmail: true,
      },
    }),
  );
  const staleResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith('/notifications/preferences') &&
      r.request().method() === 'PUT',
  );
  await page
    .getByRole('button', { name: 'Guardar preferencias', exact: true })
    .click();
  expect((await staleResponse).status()).toBe(409);
  await expect(
    page.getByRole('button', { name: 'Guardar preferencias', exact: true }),
  ).toBeDisabled();
  await page
    .getByRole('button', { name: 'Actualizar preferencias', exact: true })
    .click();
  await expect(
    page.getByLabel('Correos de pedidos', { exact: true }),
  ).toBeChecked();
  await expect(
    page.getByLabel('Correos de adopciones', { exact: true }),
  ).not.toBeChecked();
  await page.route('**/api/notifications/preferences', async (route) => {
    if (route.request().method() !== 'PUT') return route.continue();
    const r = await route.fetch();
    expect(r.ok()).toBe(true);
    await route.abort('failed');
  });
  await page
    .getByLabel('Correos de reservas y recordatorios', { exact: true })
    .uncheck();
  await page
    .getByRole('button', { name: 'Guardar preferencias', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Guardar preferencias', exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      'Actualiza y revisa los valores guardados antes de volver a guardar. No se repite la operación automáticamente.',
      { exact: true },
    ),
  ).toBeVisible();
  await page.unroute('**/api/notifications/preferences');
  await page
    .getByRole('button', { name: 'Actualizar preferencias', exact: true })
    .click();
  await expect(
    page.getByLabel('Correos de reservas y recordatorios', { exact: true }),
  ).not.toBeChecked();
  const prefs = await json<ApiResponse<'getOwnNotificationPreferences'>>(
    await context.request.get('/api/notifications/preferences', { headers }),
  );
  await json<ApiResponse<'changeOwnNotificationPreferences'>>(
    await context.request.put('/api/notifications/preferences', {
      headers,
      data: {
        expectedVersion: prefs.version,
        ordersEmail: true,
        adoptionsEmail: true,
        bookingsEmail: true,
      },
    }),
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: 'tmp/admin-notifications-preferences.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await accessible(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: 'tmp/admin-notifications-preferences-mobile.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  const all = await json<ApiResponse<'listOwnNotifications'>>(
    await context.request.get('/api/notifications?category=organizations', {
      headers,
    }),
  );
  const notice = all.items[0];
  if (!notice) throw Error('Expected real notification');
  const seeded = fixture('seed', notice.id);
  await page.goto('/notificaciones/entregas?limit=50');
  const failures = page.getByRole('list', {
    name: 'Entregas de correo fallidas',
  });
  await expect(failures).toContainText(seeded.eligible);
  const eligible = failures
      .getByRole('listitem')
      .filter({ hasText: seeded.eligible }),
    legacy = failures.getByRole('listitem').filter({ hasText: seeded.legacy });
  await expect(
    legacy.getByRole('button', { name: 'Revisar reintento', exact: true }),
  ).toHaveCount(0);
  await accessible(page);
  await eligible
    .getByRole('button', { name: 'Revisar reintento', exact: true })
    .click();
  await page.getByLabel('Motivo del reintento', { exact: true }).fill(reason);
  await page
    .getByLabel('Confirmo crear un nuevo intento de esta entrega', {
      exact: true,
    })
    .check();
  const retryResponse = page.waitForResponse((r) =>
    r.url().endsWith('/' + seeded.eligible + '/retry'),
  );
  await page
    .getByRole('button', { name: 'Registrar reintento', exact: true })
    .click();
  const child = await json<ApiResponse<'retryFailedNotificationDelivery'>>(
    await retryResponse,
  );
  expect(child.retryOfId).toBe(seeded.eligible);
  await expect(
    page.getByRole('heading', { name: 'Intento registrado', exact: true }),
  ).toBeVisible();
  const same = await json<ApiResponse<'retryFailedNotificationDelivery'>>(
    await context.request.post(
      '/api/notifications/admin/deliveries/' + seeded.eligible + '/retry',
      { headers, data: { reason } },
    ),
  );
  expect(same.id).toBe(child.id);
  await expect
    .poll(() => fixture('status', seeded.eligible).delivered, {
      timeout: 20000,
    })
    .toBe(true);
  const status = fixture('status', seeded.eligible);
  expect(status.audited).toBe(true);
  expect(status.reason).toBe(reason);
  await accessible(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: 'tmp/admin-notifications-deliveries.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await accessible(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: 'tmp/admin-notifications-mobile.png',
    fullPage: true,
  });
  const memberContext = await browser.newContext({
    baseURL: process.env['ADMIN_TEST_URL'],
  });
  try {
    const memberPage = await memberContext.newPage(),
      memberToken = await signIn(memberPage, 'customer@example.com'),
      memberHeaders = { Authorization: 'Bearer ' + memberToken };
    await memberPage.goto('/notificaciones');
    await expect(
      memberPage.getByRole('heading', {
        name: 'Cada novedad, en un lugar.',
        exact: true,
      }),
    ).toBeVisible();
    await accessible(memberPage);
    expect(
      (
        await memberContext.request.post(
          '/api/notifications/' + notice.id + '/read',
          { headers: memberHeaders, data: {} },
        )
      ).status(),
    ).toBe(404);
    await memberPage.goto('/notificaciones/entregas');
    await expect(memberPage).toHaveURL(/\/inicio$/);
    expect(
      (
        await memberContext.request.get(
          '/api/notifications/admin/failed-deliveries',
          { headers: memberHeaders },
        )
      ).status(),
    ).toBe(403);
  } finally {
    await memberContext.close();
  }
  await resetIsolatedRates();
});
