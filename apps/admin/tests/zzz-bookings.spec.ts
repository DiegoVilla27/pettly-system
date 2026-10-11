import { retainedResponse } from './helpers/responses';
import type { ApiRequest, ApiResponse } from '@pettly/api-client';
import { test, expect, type Page, type APIResponse } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { signIn, accessible, resetIsolatedRates } from './helpers/identity';
const reason = 'Isolated booking provider workflow verification';
const password = 'A sufficiently long password!';
const json = async <T>(r: APIResponse): Promise<T> => {
  expect(r.ok(), await r.text()).toBe(true);
  return (await r.json()) as T;
};
async function fillDecision(page: Page, action: string) {
  await page
    .getByLabel('Acción de reserva', { exact: true })
    .selectOption(action);
  await page
    .getByLabel('Motivo de la decisión de reserva', { exact: true })
    .fill(reason);
  await page
    .getByLabel('Confirmo la acción seleccionada y sus efectos', {
      exact: false,
    })
    .check();
}
async function decide(page: Page, action: string) {
  await fillDecision(page, action);
  const response = page.waitForResponse(
    (r) =>
      r.url().includes('/api/bookings/admin/') &&
      r.request().method() === 'POST',
  );
  await page
    .getByRole('button', { name: 'Registrar decisión de reserva', exact: true })
    .click();
  return retainedResponse(await response);
}
function trustedClock(
  action: string,
  booking: ApiResponse<'createBooking'>,
  time: string,
  actor: string,
) {
  const url = new URL(process.env['DATABASE_URL'] ?? 'http://invalid');
  if (
    process.env['NODE_ENV'] !== 'test' ||
    url.hostname !== '127.0.0.1' ||
    url.pathname !== '/pettly_test' ||
    !/^pettly-admin-test-\d+-\d+$/.test(process.env['REDIS_PREFIX'] ?? '')
  )
    throw Error('Requires isolated test infrastructure');
  execFileSync(
    process.execPath,
    [
      '--import',
      'tsx',
      'scripts/testing/booking-system-port.ts',
      action,
      booking.id,
      time,
      actor,
    ],
    { env: process.env, stdio: 'pipe' },
  );
}
test('real scoped booking search, accepted policies, provider decisions, expiry, attendance, history, lodging and transport uncertainty', async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(240000);
  const token = await signIn(page, 'admin@example.com'),
    headers = { Authorization: 'Bearer ' + token };
  const login = await json<ApiResponse<'login'>>(
      await context.request.post('/api/auth/login', {
        data: { email: 'customer@example.com', password, client: 'mobile' },
      }),
    ),
    owner = { Authorization: 'Bearer ' + login.accessToken };
  const user = await json<ApiResponse<'getCurrentUser'>>(
    await context.request.get('/api/users/me', { headers: owner }),
  );
  let org = await json<ApiResponse<'createOrganization'>>(
    await context.request.post('/api/organizations', {
      headers,
      data: {
        name: 'Reservas Aurora',
        type: 'business',
        reason,
        profile: {
          legalName: 'Reservas Aurora SAS',
          registrationNumber: '901987663',
          email: 'reservas@example.com',
          phone: '+573005556683',
          countryCode: 'CO',
          city: 'Bogotá',
          address: 'Calle de pruebas 106',
        },
      },
    }),
  );
  org = await json<ApiResponse<'getOrganizationProfile'>>(
    await context.request.post('/api/organizations/' + org.id + '/submit', {
      headers,
      data: { reason, expectedVersion: org.version },
    }),
  );
  org = await json<ApiResponse<'getOrganizationProfile'>>(
    await context.request.post('/api/organizations/' + org.id + '/approve', {
      headers,
      data: {
        reason,
        expectedVersion: org.version,
        responsibleUserId: user.id,
      },
    }),
  );
  const resource = await json<ApiResponse<'createServiceResource'>>(
    await context.request.post('/api/services/admin/resources', {
      headers: owner,
      data: {
        organizationId: org.id,
        reason,
        profile: {
          name: 'Estaciones Reservas Aurora',
          kind: 'appointment',
          capacity: 100,
          status: 'active',
          windows: Array.from({ length: 7 }, (_, i) => ({
            day: i + 1,
            startMinute: 480,
            endMinute: 1080,
          })),
        },
      },
    }),
  );
  const profile: ApiRequest<'createService'>['profile'] = {
    name: 'Baño Aurora',
    description: 'Atención y cuidado profesional de mascotas con agenda.',
    category: 'grooming',
    kind: 'appointment',
    priceMinor: 1000050,
    currency: 'COP',
    acceptedSpecies: ['dog'],
    requirements: 'Vacunas vigentes',
    terms: 'Condiciones originales aceptadas por el cliente.',
    collectionMode: 'pay_at_business',
    confirmationMode: 'manual',
    durationMinutes: 60,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 15,
    checkInMinute: null,
    checkOutMinute: null,
    minNights: 1,
    maxNights: 1,
    minimumNoticeMinutes: 15,
    cancellationCutoffMinutes: 60,
    requestTtlMinutes: 60,
    resourceIds: [resource.id],
    veterinaryCredentialId: null,
  };
  const publish = async (p: ApiRequest<'createService'>['profile']) => {
    let s = await json<ApiResponse<'createService'>>(
      await context.request.post('/api/services/admin', {
        headers: owner,
        data: { organizationId: org.id, reason, profile: p },
      }),
    );
    s = await json<ApiResponse<'submitService'>>(
      await context.request.post('/api/services/admin/' + s.id + '/submit', {
        headers: owner,
        data: { reason, expectedVersion: s.version },
      }),
    );
    return json<ApiResponse<'reviewService'>>(
      await context.request.post('/api/services/admin/' + s.id + '/review', {
        headers,
        data: { reason, expectedVersion: s.version, approved: true },
      }),
    );
  };
  const service = await publish(profile),
    automatic = await publish({
      ...profile,
      name: 'Atención automática Aurora',
      confirmationMode: 'automatic',
    });
  const day = new Date(Date.now() + 2 * 86400000 - 5 * 3600000)
    .toISOString()
    .slice(0, 10);
  const availability = await json<ApiResponse<'getServiceAvailability'>>(
    await context.request.get(
      '/api/services/' +
        service.id +
        '/availability?resourceId=' +
        resource.id +
        '&from=' +
        day +
        '&to=' +
        day,
    ),
  );
  const slot = availability.slots[0];
  if (!slot) throw Error('Expected available real slot');
  let petNumber = 0;
  const create = async (s = service) => {
    const pet = await json<ApiResponse<'createAnimal'>>(
      await context.request.post('/api/animals', {
        headers: owner,
        data: {
          profile: { name: 'Mascota Reserva ' + ++petNumber, species: 'dog' },
          reason,
        },
      }),
    );
    return json<ApiResponse<'createBooking'>>(
      await context.request.post('/api/bookings', {
        headers: owner,
        data: {
          serviceId: s.id,
          animalId: pet.id,
          idempotencyKey: crypto.randomUUID(),
          resourceId: resource.id,
          expectedServiceVersion: s.version,
          expectedResourceVersion: resource.version,
          expectedTotalMinor: s.priceMinor,
          slot: { kind: 'appointment', startsAt: slot.startsAt },
          contact: { name: 'Carlos Aurora', phone: '+573005556683' },
          consent: true,
        },
      }),
    );
  };
  const pending: ApiResponse<'createBooking'>[] = [];
  for (let i = 0; i < 11; i++) pending.push(await create());
  const attend = await create(automatic),
    missed = await create(automatic),
    uncertain = await create(automatic);
  const ownContext = await browser.newContext({
    baseURL: process.env['ADMIN_TEST_URL'],
    timezoneId: 'Europe/Madrid',
  });
  try {
    const ownPage = await ownContext.newPage();
    await signIn(ownPage, 'customer@example.com');
    await ownPage.goto(
      '/reservas?organizationId=' +
        org.id +
        '&search=aUrOrA&status=requested&serviceId=' +
        service.id +
        '&limit=10',
    );
    await expect(
      ownPage
        .getByRole('list', { name: 'Reservas encontradas' })
        .getByRole('listitem'),
    ).toHaveCount(10);
    await ownPage.reload();
    await expect(
      ownPage.getByLabel('Buscar reserva por nombre', { exact: true }),
    ).toHaveValue('aUrOrA');
    await ownPage
      .getByRole('button', { name: 'Siguiente', exact: true })
      .click();
    await expect(ownPage).toHaveURL(/page=2/);
    await expect(
      ownPage
        .getByRole('list', { name: 'Reservas encontradas' })
        .getByRole('listitem'),
    ).toHaveCount(1);
    await accessible(ownPage);
    const literal = await json<ApiResponse<'listManagedBookings'>>(
      await context.request.get(
        '/api/bookings/admin?organizationId=' +
          org.id +
          '&search=' +
          encodeURIComponent('%_'),
        { headers: owner },
      ),
    );
    expect(literal.total).toBe(0);
    const first = pending[0];
    if (!first) throw Error('Expected pending booking');
    // The provider sees the accepted contract even after the current service is edited.
    await json<ApiResponse<'updateService'>>(
      await context.request.patch('/api/services/admin/' + service.id, {
        headers: owner,
        data: {
          organizationId: org.id,
          expectedVersion: service.version,
          reason,
          profile: {
            ...profile,
            name: 'Nuevo nombre de servicio',
            priceMinor: 2000000,
            terms: 'Condiciones nuevas para futuras reservas.',
          },
        },
      }),
    );
    await ownPage.goto('/reservas/' + org.id + '/' + first.id);
    await expect(
      ownPage.getByRole('heading', {
        name: 'Baño Aurora para ' + first.acceptance.pet.name,
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      ownPage
        .locator('section[aria-labelledby="booking-accepted-heading"]')
        .getByText('Condiciones originales aceptadas por el cliente.', {
          exact: true,
        }),
    ).toBeVisible();
    await expect(
      ownPage.getByText('Condiciones nuevas para futuras reservas.', {
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      ownPage
        .locator('section[aria-labelledby="booking-accepted-heading"]')
        .getByText('COP 10.000,50', { exact: true }),
    ).toBeVisible();
    await accessible(ownPage);
    const confirmed = await json<ApiResponse<'confirmManagedBooking'>>(
      await decide(ownPage, 'confirm'),
    );
    expect(confirmed.status).toBe('confirmed');
    await expect(
      ownPage.getByText(
        'Resultado registrado: Confirmada. Consulta el historial de la reserva.',
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      ownPage.getByRole('list', { name: 'Cambios de la reserva' }),
    ).toContainText('Confirmar solicitud');
    await ownPage
      .getByText('Condiciones de la revisión 1', { exact: true })
      .click();
    await expect(
      ownPage
        .locator('details')
        .filter({ hasText: 'Condiciones de la revisión 1' })
        .getByText('Condiciones originales aceptadas por el cliente.', {
          exact: true,
        }),
    ).toBeVisible();
    // A stale provider decision must not overwrite another actor's decision.
    const stale = pending[1];
    if (!stale) throw Error('Expected stale booking');
    await ownPage.goto('/reservas/' + org.id + '/' + stale.id);
    await expect(
      ownPage.getByLabel('Acción de reserva', { exact: true }),
    ).toBeVisible();
    await json<ApiResponse<'confirmManagedBooking'>>(
      await context.request.post(
        '/api/bookings/admin/' + stale.id + '/confirm',
        { headers, data: { expectedVersion: stale.version, reason } },
      ),
    );
    expect((await decide(ownPage, 'reject')).status()).toBe(409);
    await expect(
      ownPage.getByRole('button', {
        name: 'Registrar decisión de reserva',
        exact: true,
      }),
    ).toBeDisabled();
    await ownPage
      .getByRole('button', { name: 'Actualizar reserva', exact: true })
      .click();
    await expect(
      ownPage.getByText('Confirmada · Colombia', { exact: true }),
    ).toBeVisible();
    await json<ApiResponse<'cancelManagedBooking'>>(
      await decide(ownPage, 'cancel'),
    );
    await expect(
      ownPage.getByLabel('Acción de reserva', { exact: true }),
    ).toHaveCount(0);
    const rejected = pending[2];
    if (!rejected) throw Error('Expected rejection');
    await ownPage.goto('/reservas/' + org.id + '/' + rejected.id);
    expect(
      (
        await json<ApiResponse<'rejectManagedBooking'>>(
          await decide(ownPage, 'reject'),
        )
      ).status,
    ).toBe('rejected');
    await expect(
      ownPage.getByText('Rechazada · Colombia', { exact: true }),
    ).toBeVisible();
    // Read-only UI calls never fake attendance with browser clock; the trusted helper runs only against pettly_test.
    trustedClock('start', attend, attend.startsAt, user.id);
    await ownPage.goto('/reservas/' + org.id + '/' + attend.id);
    await expect(
      ownPage.getByText('En curso · Colombia', { exact: true }),
    ).toBeVisible();
    expect(
      (
        await json<ApiResponse<'completeManagedBooking'>>(
          await decide(ownPage, 'complete'),
        )
      ).status,
    ).toBe('completed');
    await expect(
      ownPage.getByRole('list', { name: 'Cambios de la reserva' }),
    ).toContainText('Completar atención');
    trustedClock(
      'no_show',
      missed,
      new Date(Date.parse(missed.startsAt) + 15 * 60000).toISOString(),
      user.id,
    );
    await ownPage.goto('/reservas/' + org.id + '/' + missed.id);
    await expect(
      ownPage.getByText('Inasistencia · Colombia', { exact: true }),
    ).toBeVisible();
    await expect(
      ownPage.getByLabel('Acción de reserva', { exact: true }),
    ).toHaveCount(0);
    const expired = pending[3];
    if (!expired?.expiresAt) throw Error('Expected expiry');
    trustedClock('expire', expired, expired.expiresAt, user.id);
    await ownPage.goto('/reservas/' + org.id + '/' + expired.id);
    await expect(
      ownPage.getByText('Vencida · Colombia', { exact: true }),
    ).toBeVisible();
    await expect(
      ownPage.getByRole('list', { name: 'Cambios de la reserva' }),
    ).toContainText('Sistema');
    // Commit succeeds but response is lost: manual refresh must reveal one cancellation and no replay.
    await ownPage.goto('/reservas/' + org.id + '/' + uncertain.id);
    await expect(
      ownPage.getByLabel('Acción de reserva', { exact: true }),
    ).toBeVisible();
    await ownPage.route(
      '**/api/bookings/admin/' + uncertain.id + '/cancel',
      async (route) => {
        const response = await route.fetch();
        expect(response.ok()).toBe(true);
        await route.abort('failed');
      },
    );
    await fillDecision(ownPage, 'cancel');
    await ownPage
      .getByRole('button', {
        name: 'Registrar decisión de reserva',
        exact: true,
      })
      .click();
    await expect(
      ownPage.getByText(
        'El resultado es incierto. Actualiza la reserva y revisa el historial antes de repetir una acción.',
        { exact: true },
      ),
    ).toBeVisible();
    await ownPage.unroute('**/api/bookings/admin/' + uncertain.id + '/cancel');
    await expect(
      ownPage.getByRole('button', {
        name: 'Registrar decisión de reserva',
        exact: true,
      }),
    ).toBeDisabled();
    await ownPage
      .getByRole('button', { name: 'Actualizar reserva', exact: true })
      .click();
    await expect(
      ownPage.getByText('Cancelada · Colombia', { exact: true }),
    ).toBeVisible();
    const audit = await json<ApiResponse<'listManagedBookingAudit'>>(
      await context.request.get(
        '/api/bookings/admin/' + uncertain.id + '/audit',
        { headers: owner },
      ),
    );
    expect(audit.total).toBe(2);
    expect(audit.items.filter((a) => a.action === 'cancel')).toHaveLength(1);
    await accessible(ownPage);
    await ownPage.screenshot({
      path: 'tmp/admin-booking-detail.png',
      fullPage: true,
    });
    await ownPage.setViewportSize({ width: 390, height: 844 });
    await accessible(ownPage);
    expect(
      await ownPage.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await ownPage.screenshot({
      path: 'tmp/admin-booking-mobile.png',
      fullPage: true,
    });
    // Lodging uses accepted civil dates and nightly totals, without fabricating online payment.
    const rooms = await json<ApiResponse<'createServiceResource'>>(
      await context.request.post('/api/services/admin/resources', {
        headers: owner,
        data: {
          organizationId: org.id,
          reason,
          profile: {
            name: 'Habitaciones Reservas Aurora',
            kind: 'lodging',
            capacity: 10,
            status: 'active',
            windows: Array.from({ length: 7 }, (_, i) => ({
              day: i + 1,
              startMinute: 0,
              endMinute: 1440,
            })),
          },
        },
      }),
    );
    const hotel = await publish({
      ...profile,
      name: 'Hotel Aurora',
      category: 'lodging',
      kind: 'lodging',
      confirmationMode: 'automatic',
      durationMinutes: null,
      bufferAfterMinutes: 0,
      checkInMinute: 900,
      checkOutMinute: 720,
      minNights: 1,
      maxNights: 7,
      resourceIds: [rooms.id],
    });
    const pet = await json<ApiResponse<'createAnimal'>>(
      await context.request.post('/api/animals', {
        headers: owner,
        data: { profile: { name: 'Mascota Hotel', species: 'dog' }, reason },
      }),
    );
    const endDate = new Date(Date.parse(day + 'T00:00:00Z') + 2 * 86400000)
      .toISOString()
      .slice(0, 10);
    const hotelBooking = await json<ApiResponse<'createBooking'>>(
      await context.request.post('/api/bookings', {
        headers: owner,
        data: {
          serviceId: hotel.id,
          animalId: pet.id,
          idempotencyKey: crypto.randomUUID(),
          resourceId: rooms.id,
          expectedServiceVersion: hotel.version,
          expectedResourceVersion: rooms.version,
          expectedTotalMinor: hotel.priceMinor * 2,
          slot: { kind: 'lodging', startDate: day, endDate },
          contact: { name: 'Carlos Aurora', phone: '+573005556683' },
          consent: true,
        },
      }),
    );
    await ownPage.goto('/reservas/' + org.id + '/' + hotelBooking.id);
    await expect(
      ownPage
        .locator('section[aria-labelledby="booking-accepted-heading"]')
        .getByText('2 noches · Cobro en el establecimiento', {
          exact: true,
        }),
    ).toBeVisible();
    await expect(
      ownPage
        .locator('section[aria-labelledby="booking-accepted-heading"]')
        .getByText('COP 20.001,00', { exact: true }),
    ).toBeVisible();
    await accessible(ownPage);
    await ownPage.goto(
      '/reservas?organizationId=' +
        org.id +
        '&search=Mascota&status=confirmed&limit=10',
    );
    await expect(
      ownPage
        .getByRole('list', { name: 'Reservas encontradas' })
        .getByRole('listitem'),
    ).toHaveCount(2);
    await accessible(ownPage);
    await ownPage.screenshot({
      path: 'tmp/admin-bookings-list.png',
      fullPage: true,
    });
    // A route company mismatch cannot expose accepted contact, even to a member of the real company.
    await ownPage.goto('/reservas/' + crypto.randomUUID() + '/' + first.id);
    await expect(ownPage.getByRole('alert')).toBeVisible();
    await expect(
      ownPage.getByRole('heading', {
        name: 'Lo que el cliente aceptó',
        exact: true,
      }),
    ).toHaveCount(0);
    const moderatorContext = await browser.newContext({
      baseURL: process.env['ADMIN_TEST_URL'],
    });
    try {
      const moderatorPage = await moderatorContext.newPage(),
        mod = await signIn(moderatorPage, 'camila@example.com');
      await moderatorPage.goto('/reservas');
      await expect(moderatorPage).toHaveURL(/\/inicio$/);
      expect(
        (
          await moderatorContext.request.get(
            '/api/bookings/admin/' + first.id,
            { headers: { Authorization: 'Bearer ' + mod } },
          )
        ).status(),
      ).toBe(403);
    } finally {
      await moderatorContext.close();
    }
    expect(
      (await context.request.get('/api/bookings/admin/' + first.id)).status(),
    ).toBe(401);
    // Current company suspension is authoritative despite an already-rendered pending form.
    const suspended = pending[4];
    if (!suspended) throw Error('Expected pending suspension test');
    await ownPage.goto('/reservas/' + org.id + '/' + suspended.id);
    await expect(
      ownPage.getByLabel('Acción de reserva', { exact: true }),
    ).toBeVisible();
    await json<ApiResponse<'getOrganizationProfile'>>(
      await context.request.patch('/api/organizations/' + org.id + '/status', {
        headers,
        data: { expectedVersion: org.version, status: 'suspended', reason },
      }),
    );
    expect((await decide(ownPage, 'confirm')).status()).toBe(403);
    await expect(
      ownPage.getByRole('heading', {
        name: 'Lo que el cliente aceptó',
        exact: true,
      }),
    ).toHaveCount(0);
  } finally {
    await ownContext.close();
  }
  await resetIsolatedRates();
});
