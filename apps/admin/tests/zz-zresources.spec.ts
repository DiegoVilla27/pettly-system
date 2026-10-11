import type { ApiResponse } from '@pettly/api-client';
import {
  test,
  expect,
  type APIResponse,
  type Response,
} from '@playwright/test';
import { signIn, accessible, resetIsolatedRates } from './helpers/identity';
const reason = 'Isolated resource calendar and capacity verification';
const json = async <T>(r: APIResponse | Response): Promise<T> => {
  expect(r.ok(), await r.text()).toBe(true);
  return (await r.json()) as T;
};
const local = (v: string) =>
  new Date(Date.parse(v) - 5 * 3600000).toISOString().slice(0, 16);
test('resource UI, weekly calendar, Colombia availability, block/release audits, occupied capacity and scope protection', async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(180000);
  const admin = await signIn(page, 'admin@example.com'),
    headers = { Authorization: 'Bearer ' + admin };
  const login = await json<ApiResponse<'login'>>(
      await context.request.post('/api/auth/login', {
        data: {
          email: 'customer@example.com',
          password: 'A sufficiently long password!',
          client: 'mobile',
        },
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
        name: 'Agendas Aurora',
        type: 'business',
        reason,
        profile: {
          legalName: 'Agendas Aurora SAS',
          registrationNumber: '901987662',
          email: 'agendas@example.com',
          phone: '+573005556682',
          countryCode: 'CO',
          city: 'Bogotá',
          address: 'Calle de pruebas 105',
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
  const ownContext = await browser.newContext({
    baseURL: process.env['ADMIN_TEST_URL'],
    timezoneId: 'Europe/Madrid',
  });
  try {
    const ownPage = await ownContext.newPage();
    await signIn(ownPage, 'customer@example.com');
    await ownPage.goto('/servicios/' + org.id + '/recursos/nuevo');
    await ownPage
      .getByLabel('Nombre del recurso', { exact: true })
      .fill('Estaciones Aurora');
    await ownPage.getByLabel('Capacidad simultánea', { exact: true }).fill('2');
    await ownPage
      .getByLabel('Motivo del cambio de recurso', { exact: true })
      .fill(reason);
    await ownPage
      .getByRole('button', { name: 'Añadir intervalo', exact: true })
      .click();
    await ownPage
      .getByRole('button', { name: 'Guardar recurso', exact: true })
      .click();
    await expect(ownPage.getByRole('alert')).toContainText('Revisa el horario');
    await ownPage.getByLabel('Día 2', { exact: true }).selectOption('2');
    for (let n = 3; n <= 7; n++) {
      await ownPage
        .getByRole('button', { name: 'Añadir intervalo', exact: true })
        .click();
      await ownPage
        .getByLabel('Día ' + n, { exact: true })
        .selectOption(String(n));
    }
    const create = ownPage.waitForResponse(
      (r) =>
        r.url().endsWith('/api/services/admin/resources') &&
        r.request().method() === 'POST',
    );
    await ownPage
      .getByRole('button', { name: 'Guardar recurso', exact: true })
      .click();
    let resource = await json<ApiResponse<'createServiceResource'>>(
      await create,
    );
    await expect(ownPage).toHaveURL(
      new RegExp('/recursos/' + resource.id + '$'),
    );
    await expect(
      ownPage.getByRole('list', { name: 'Cambios del recurso' }),
    ).toContainText('Creación');
    await accessible(ownPage);
    // A stale form cannot overwrite an external edit.
    const updated = await json<ApiResponse<'updateServiceResource'>>(
      await context.request.patch(
        '/api/services/admin/resources/' + resource.id,
        {
          headers: owner,
          data: {
            organizationId: org.id,
            expectedVersion: resource.version,
            reason,
            profile: {
              name: resource.name,
              kind: resource.kind,
              capacity: resource.capacity,
              status: resource.status,
              windows: resource.windows,
            },
          },
        },
      ),
    );
    await ownPage
      .getByRole('button', { name: 'Editar recurso y horarios', exact: true })
      .click();
    await ownPage
      .getByLabel('Motivo del cambio de recurso', { exact: true })
      .fill(reason);
    await ownPage
      .getByRole('button', { name: 'Guardar recurso', exact: true })
      .click();
    await expect(
      ownPage.getByText(
        'La información cambió. Actualiza la página antes de continuar.',
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      ownPage.getByRole('button', { name: 'Guardar recurso', exact: true }),
    ).toBeDisabled();
    await ownPage
      .getByRole('button', { name: 'Actualizar recurso', exact: true })
      .click();
    await expect(
      ownPage.getByText(
        'Versión ' + updated.version + ' · Activo · capacidad 2',
        { exact: true },
      ),
    ).toBeVisible();
    resource = updated;
    const profile = {
      name: 'Citas de cuidado Aurora',
      description: 'Cuidado profesional de mascotas en nuestra estación.',
      category: 'grooming',
      kind: 'appointment',
      priceMinor: 1000050,
      currency: 'COP',
      acceptedSpecies: ['dog'],
      requirements: 'Vacunas vigentes',
      terms: 'Llegar quince minutos antes.',
      collectionMode: 'pay_at_business',
      confirmationMode: 'automatic',
      durationMinutes: 60,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      checkInMinute: null,
      checkOutMinute: null,
      minNights: 1,
      maxNights: 1,
      minimumNoticeMinutes: 60,
      cancellationCutoffMinutes: 60,
      requestTtlMinutes: 60,
      resourceIds: [resource.id],
      veterinaryCredentialId: null,
    };
    let service = await json<ApiResponse<'createService'>>(
      await context.request.post('/api/services/admin', {
        headers: owner,
        data: { organizationId: org.id, reason, profile },
      }),
    );
    service = await json<ApiResponse<'submitService'>>(
      await context.request.post(
        '/api/services/admin/' + service.id + '/submit',
        { headers: owner, data: { reason, expectedVersion: service.version } },
      ),
    );
    service = await json<ApiResponse<'reviewService'>>(
      await context.request.post(
        '/api/services/admin/' + service.id + '/review',
        {
          headers,
          data: { reason, expectedVersion: service.version, approved: true },
        },
      ),
    );
    const day = new Date(Date.now() + 2 * 86400000 - 5 * 3600000)
      .toISOString()
      .slice(0, 10);
    await ownPage.goto('/servicios/' + org.id + '/' + service.id);
    await expect(ownPage).toHaveURL(new RegExp(service.id + '$'));
    await expect(
      ownPage.getByRole('heading', { name: service.name, exact: true }),
    ).toBeVisible();
    await expect(
      ownPage.getByText('Peluquería · Publicado', { exact: true }),
    ).toBeVisible();
    await ownPage
      .getByLabel('Recurso disponible', { exact: true })
      .selectOption(resource.id);
    await ownPage.getByLabel('Desde la fecha', { exact: true }).fill(day);
    await ownPage.getByLabel('Hasta la fecha', { exact: true }).fill(day);
    const availability = ownPage.waitForResponse((r) =>
      r.url().includes('/availability?'),
    );
    await ownPage
      .getByRole('button', { name: 'Consultar disponibilidad', exact: true })
      .click();
    const available = await json<ApiResponse<'getServiceAvailability'>>(
      await availability,
    );
    expect(available.slots.length).toBeGreaterThan(0);
    await expect(
      ownPage.getByRole('list', { name: 'Horarios disponibles' }),
    ).toContainText('2 cupos');
    const slot = available.slots[0]!;
    await accessible(ownPage);
    await ownPage.screenshot({
      path: 'tmp/admin-service-availability.png',
      fullPage: true,
    });
    // Block the real slot in Colombia wall time, even though the browser runs in Madrid.
    await ownPage.goto('/servicios/' + org.id + '/recursos/' + resource.id);
    await ownPage
      .getByLabel('Inicio del bloqueo', { exact: true })
      .fill(local(slot.startsAt));
    await ownPage
      .getByLabel('Fin del bloqueo', { exact: true })
      .fill(local(slot.endsAt));
    await ownPage
      .getByLabel('Motivo del bloqueo', { exact: true })
      .fill(reason);
    await ownPage
      .getByLabel('Confirmo que ocupará toda la capacidad', { exact: false })
      .check();
    const blocked = ownPage.waitForResponse(
      (r) =>
        r.url().endsWith('/resources/' + resource.id + '/blocks') &&
        r.request().method() === 'POST',
    );
    await ownPage
      .getByRole('button', { name: 'Bloquear agenda', exact: true })
      .click();
    const block = await json<ApiResponse<'blockServiceResource'>>(
      await blocked,
    );
    expect(block.startsAt).toBe(slot.startsAt);
    await expect(
      ownPage.getByRole('list', { name: 'Bloqueos activos' }),
    ).toContainText(block.id);
    await expect(
      ownPage.getByRole('list', { name: 'Cambios del recurso' }),
    ).toContainText('Bloqueo');
    const after = await json<ApiResponse<'getServiceAvailability'>>(
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
    expect(after.slots.some((s) => s.startsAt === slot.startsAt)).toBe(false);
    await ownPage
      .getByLabel('Bloqueo a liberar', { exact: true })
      .selectOption(block.id);
    await ownPage
      .getByLabel('Motivo de liberación', { exact: true })
      .fill(reason);
    await ownPage
      .getByLabel('Confirmo la liberación definitiva', { exact: false })
      .check();
    const release = ownPage.waitForResponse(
      (r) =>
        r.url().endsWith('/blocks/' + block.id) &&
        r.request().method() === 'DELETE',
    );
    await ownPage
      .getByRole('button', { name: 'Liberar bloqueo', exact: true })
      .click();
    expect(
      (await json<ApiResponse<'releaseServiceBlock'>>(await release))
        .releasedAt,
    ).not.toBeNull();
    await expect(
      ownPage.getByRole('list', { name: 'Bloqueos activos' }),
    ).toContainText('No hay bloqueos activos');
    await expect(
      ownPage.getByRole('list', { name: 'Cambios del recurso' }),
    ).toContainText('Liberación de bloqueo');
    const free = await json<ApiResponse<'getServiceAvailability'>>(
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
    expect(free.slots.some((s) => s.startsAt === slot.startsAt)).toBe(true);
    // Actual reservations protect both capacity and calendar edits.
    for (let n = 0; n < 2; n++) {
      const pet = await json<ApiResponse<'createAnimal'>>(
        await context.request.post('/api/animals', {
          headers: owner,
          data: {
            profile: { name: 'Agenda dog ' + n, species: 'dog' },
            reason,
          },
        }),
      );
      await json<ApiResponse<'createBooking'>>(
        await context.request.post('/api/bookings', {
          headers: owner,
          data: {
            serviceId: service.id,
            animalId: pet.id,
            idempotencyKey: crypto.randomUUID(),
            resourceId: resource.id,
            expectedServiceVersion: free.serviceVersion,
            expectedResourceVersion: free.resourceVersion,
            expectedTotalMinor: slot.totalMinor,
            slot: { kind: 'appointment', startsAt: slot.startsAt },
            contact: { name: 'Carlos Aurora', phone: '+573005556682' },
            consent: true,
          },
        }),
      );
    }
    const weekday = new Date(day + 'T00:00:00Z').getUTCDay() || 7;
    expect(
      (
        await context.request.patch(
          '/api/services/admin/resources/' + resource.id,
          {
            headers: owner,
            data: {
              organizationId: org.id,
              expectedVersion: free.resourceVersion,
              reason,
              profile: {
                name: resource.name,
                kind: resource.kind,
                capacity: resource.capacity,
                status: resource.status,
                windows: resource.windows.filter((w) => w.day !== weekday),
              },
            },
          },
        )
      ).status(),
    ).toBe(409);
    await ownPage
      .getByLabel('Inicio del bloqueo', { exact: true })
      .fill(local(slot.startsAt));
    await ownPage
      .getByLabel('Fin del bloqueo', { exact: true })
      .fill(local(slot.endsAt));
    await ownPage
      .getByLabel('Motivo del bloqueo', { exact: true })
      .fill(reason);
    await ownPage
      .getByLabel('Confirmo que ocupará toda la capacidad', { exact: false })
      .check();
    const conflict = ownPage.waitForResponse(
      (r) =>
        r.url().endsWith('/resources/' + resource.id + '/blocks') &&
        r.request().method() === 'POST',
    );
    await ownPage
      .getByRole('button', { name: 'Bloquear agenda', exact: true })
      .click();
    expect((await conflict).status()).toBe(409);
    await expect(
      ownPage.getByRole('button', { name: 'Bloquear agenda', exact: true }),
    ).toBeDisabled();
    await ownPage
      .getByRole('button', { name: 'Actualizar recurso', exact: true })
      .click();
    await ownPage
      .getByRole('button', { name: 'Editar recurso y horarios', exact: true })
      .click();
    await expect(
      ownPage.getByRole('button', { name: 'Guardar recurso', exact: true }),
    ).toBeEnabled();
    await ownPage.getByLabel('Capacidad simultánea', { exact: true }).fill('1');
    await ownPage
      .getByLabel('Motivo del cambio de recurso', { exact: true })
      .fill(reason);
    const capacity = ownPage.waitForResponse(
      (r) =>
        r.url().endsWith('/resources/' + resource.id) &&
        r.request().method() === 'PATCH',
    );
    await ownPage
      .getByRole('button', { name: 'Guardar recurso', exact: true })
      .click();
    expect((await capacity).status()).toBe(409);
    await ownPage
      .getByRole('button', { name: 'Actualizar recurso', exact: true })
      .click();
    await ownPage
      .getByRole('button', { name: 'Editar recurso y horarios', exact: true })
      .click();
    await expect(
      ownPage.getByLabel('Capacidad simultánea', { exact: true }),
    ).toHaveValue('2');
    await ownPage
      .getByRole('button', { name: 'Cerrar edición de recurso', exact: true })
      .click();
    await ownPage.setViewportSize({ width: 390, height: 844 });
    await accessible(ownPage);
    expect(
      await ownPage.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await ownPage.screenshot({
      path: 'tmp/admin-resource-mobile.png',
      fullPage: true,
    });
    await ownPage.goto('/servicios/recursos?organizationId=' + org.id);
    await expect(
      ownPage.getByRole('link', { name: 'Estaciones Aurora', exact: true }),
    ).toBeVisible();
    await accessible(ownPage);
    // Lodging canonicalizes full-day windows and never exposes hidden appointment times.
    await ownPage.goto('/servicios/' + org.id + '/recursos/nuevo');
    await ownPage
      .getByLabel('Nombre del recurso', { exact: true })
      .fill('Habitaciones Aurora');
    await ownPage
      .getByLabel('Modalidad del recurso', { exact: true })
      .selectOption('lodging');
    await expect(ownPage.getByLabel('Inicio 1', { exact: true })).toHaveCount(
      0,
    );
    await ownPage
      .getByLabel('Motivo del cambio de recurso', { exact: true })
      .fill(reason);
    const hotel = ownPage.waitForResponse(
      (r) =>
        r.url().endsWith('/api/services/admin/resources') &&
        r.request().method() === 'POST',
    );
    await ownPage
      .getByRole('button', { name: 'Guardar recurso', exact: true })
      .click();
    expect(
      (await json<ApiResponse<'createServiceResource'>>(await hotel)).windows,
    ).toEqual([{ day: 1, startMinute: 0, endMinute: 1440 }]);
    const audit = '/api/services/admin/resources/' + resource.id + '/audit';
    expect((await context.request.get(audit)).status()).toBe(401);
    expect(
      (await context.request.get(audit, { headers: owner })).status(),
    ).toBe(200);
    const mod = await json<ApiResponse<'login'>>(
      await context.request.post('/api/auth/login', {
        data: {
          email: 'camila@example.com',
          password: 'A sufficiently long password!',
          client: 'mobile',
        },
      }),
    );
    expect(
      (
        await context.request.get(audit, {
          headers: { Authorization: 'Bearer ' + mod.accessToken },
        })
      ).status(),
    ).toBe(403);
    await ownPage.goto(
      '/servicios/' + crypto.randomUUID() + '/recursos/' + resource.id,
    );
    await expect(ownPage.getByRole('alert')).toBeVisible();
    await expect(
      ownPage.getByRole('heading', {
        name: 'Historial del recurso',
        exact: true,
      }),
    ).toHaveCount(0);
  } finally {
    await ownContext.close();
  }
  await resetIsolatedRates();
});
