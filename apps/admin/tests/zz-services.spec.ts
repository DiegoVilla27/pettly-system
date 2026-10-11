import type { ApiRequest, ApiResponse } from '@pettly/api-client';
import {
  test,
  expect,
  type APIResponse,
  type Response,
  type Page,
} from '@playwright/test';
import { signIn, accessible, resetIsolatedRates } from './helpers/identity';
const reason = 'Isolated service policy and publication verification';
const password = 'A sufficiently long password!';
const json = async <T>(r: APIResponse | Response): Promise<T> => {
  expect(r.ok(), await r.text()).toBe(true);
  return (await r.json()) as T;
};
async function decide(page: Page, action: string) {
  await page.getByLabel('Acción de servicio').selectOption(action);
  await page.getByLabel('Motivo de la decisión de servicio').fill(reason);
  await page
    .getByLabel('Confirmo la acción seleccionada', { exact: false })
    .check();
  const mutation = page.waitForResponse(
    (r) =>
      r.url().includes('/api/services/admin/') &&
      ['POST', 'DELETE'].includes(r.request().method()),
  );
  await page
    .getByRole('button', {
      name: 'Registrar decisión de servicio',
      exact: true,
    })
    .click();
  // The UI below verifies the resulting state; Chrome may discard a consumed body.
  expect((await mutation).ok()).toBe(true);
  const state: Record<string, string> = {
    submit: 'En revisión',
    approve: 'Publicado',
    reject: 'Rechazado',
    pause: 'Pausado',
    archive: 'Archivado',
  };
  await expect(
    page.getByText('Cambio registrado. Estado actual: ' + state[action] + '.', {
      exact: true,
    }),
  ).toBeVisible();
}
async function fillProfile(page: Page, name: string, price: string) {
  await page.getByLabel('Nombre del servicio', { exact: true }).fill(name);
  await page
    .getByLabel('Descripción del servicio', { exact: true })
    .fill('Cuidado profesional con condiciones claras para tu mascota.');
  await page.getByLabel('Precio en COP', { exact: true }).fill(price);
  await page.getByLabel('Perro', { exact: true }).check();
  await page
    .getByLabel('Requisitos del servicio', { exact: true })
    .fill('Vacunas vigentes y mascota acompañada.');
  await page
    .getByLabel('Condiciones de reserva', { exact: true })
    .fill(
      'Llegar quince minutos antes. El cobro se realiza al recibir el servicio.',
    );
  await page
    .getByLabel('Motivo del cambio de servicio', { exact: true })
    .fill(reason);
}
test('real business services, exact COP policy, independent publication, stale writes, lodging, veterinary denial and immutable history', async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(180000);
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
        name: 'Servicios Aurora',
        type: 'business',
        reason,
        profile: {
          legalName: 'Servicios Aurora SAS',
          registrationNumber: '901987661',
          email: 'servicios@example.com',
          phone: '+573005556681',
          countryCode: 'CO',
          city: 'Bogotá',
          address: 'Calle de pruebas 104',
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
          name: 'Sala de cuidado Aurora',
          kind: 'appointment',
          capacity: 1,
          status: 'active',
          windows: [{ day: 1, startMinute: 480, endMinute: 1080 }],
        },
      },
    }),
  );
  const lodging = await json<ApiResponse<'createServiceResource'>>(
    await context.request.post('/api/services/admin/resources', {
      headers: owner,
      data: {
        organizationId: org.id,
        reason,
        profile: {
          name: 'Habitaciones Aurora',
          kind: 'lodging',
          capacity: 3,
          status: 'active',
          windows: [{ day: 1, startMinute: 0, endMinute: 1440 }],
        },
      },
    }),
  );
  const ownerContext = await browser.newContext({
    baseURL: process.env['ADMIN_TEST_URL'],
  });
  try {
    const ownerPage = await ownerContext.newPage();
    const ownerToken = await signIn(ownerPage, 'customer@example.com'),
      liveOwner = { Authorization: 'Bearer ' + ownerToken };
    await ownerPage.goto('/servicios');
    await ownerPage
      .getByRole('button', { name: 'Consultar servicios', exact: true })
      .click();
    await expect(ownerPage.getByLabel('Empresa de servicios')).toBeFocused();
    await expect(
      ownerPage.getByLabel('Buscar empresa de servicios'),
    ).toHaveCount(0);
    await ownerPage.getByLabel('Empresa de servicios').selectOption(org.id);
    await ownerPage
      .getByRole('button', { name: 'Consultar servicios', exact: true })
      .click();
    await ownerPage
      .getByRole('link', { name: 'Crear servicio', exact: true })
      .click();
    await ownerPage
      .getByRole('button', { name: 'Guardar borrador', exact: true })
      .click();
    await expect(
      ownerPage.getByLabel('Nombre del servicio', { exact: true }),
    ).toBeFocused();
    await fillProfile(ownerPage, 'Baño Servicios Aurora', '10000,50');
    await ownerPage
      .getByLabel('Recursos asignados')
      .selectOption([
        { label: resource.name + ' · capacidad ' + resource.capacity },
      ]);
    const creation = ownerPage.waitForResponse(
      (r) =>
        r.url().endsWith('/api/services/admin') &&
        r.request().method() === 'POST',
    );
    await ownerPage
      .getByRole('button', { name: 'Guardar borrador', exact: true })
      .click();
    let service = await json<ApiResponse<'createService'>>(await creation);
    expect(service.priceMinor).toBe(1000050);
    expect(service.status).toBe('draft');
    expect(service.resourceIds).toEqual([resource.id]);
    await expect(ownerPage).toHaveURL(
      new RegExp('/servicios/' + org.id + '/' + service.id + '$'),
    );
    await expect(
      ownerPage.getByRole('list', { name: 'Cambios del servicio' }),
    ).toContainText('Creación');
    await decide(ownerPage, 'submit');
    await expect(
      ownerPage.getByText('Cambio registrado. Estado actual: En revisión.', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      ownerPage.getByRole('button', {
        name: 'Editar perfil de servicio',
        exact: true,
      }),
    ).toHaveCount(0);
    await page.goto('/servicios/revision');
    await page
      .getByRole('link', { name: 'Baño Servicios Aurora', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Lo que ofrece este servicio' }),
    ).toBeVisible();
    await accessible(page);
    await decide(page, 'approve');
    await expect(
      page.getByText('Cambio registrado. Estado actual: Publicado.', {
        exact: true,
      }),
    ).toBeVisible();
    await ownerPage
      .getByRole('button', { name: 'Actualizar servicio', exact: true })
      .click();
    await expect(
      ownerPage.getByText('Peluquería · Publicado', { exact: true }),
    ).toBeVisible();
    await ownerPage
      .getByRole('button', { name: 'Editar perfil de servicio', exact: true })
      .click();
    service = await json<ApiResponse<'getManagedService'>>(
      await ownerContext.request.get('/api/services/admin/' + service.id, {
        headers: liveOwner,
      }),
    );
    const {
      id,
      organizationId,
      status,
      version,
      createdBy,
      reviewedBy,
      reviewedAt,
      reviewReason,
      createdAt,
      updatedAt,
      timeZone,
      ...profile
    } = service;
    void [
      id,
      organizationId,
      status,
      createdBy,
      reviewedBy,
      reviewedAt,
      reviewReason,
      createdAt,
      updatedAt,
      timeZone,
    ];
    const newer = await json<ApiResponse<'updateService'>>(
      await ownerContext.request.patch('/api/services/admin/' + service.id, {
        headers: liveOwner,
        data: {
          organizationId: org.id,
          expectedVersion: version,
          reason,
          profile: { ...profile, priceMinor: 2000000 },
        },
      }),
    );
    await ownerPage
      .getByLabel('Precio en COP', { exact: true })
      .fill('19999,95');
    await ownerPage
      .getByLabel('Motivo del cambio de servicio', { exact: true })
      .fill(reason);
    await ownerPage
      .getByRole('button', { name: 'Guardar borrador', exact: true })
      .click();
    await expect(
      ownerPage.getByText(
        'La información cambió. Actualiza la página antes de continuar.',
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      ownerPage.getByRole('button', { name: 'Guardar borrador', exact: true }),
    ).toBeDisabled();
    await ownerPage
      .getByRole('button', { name: 'Actualizar servicio', exact: true })
      .click();
    await expect(
      ownerPage.getByText('Peluquería · Borrador', { exact: true }),
    ).toBeVisible();
    await ownerPage
      .getByRole('button', { name: 'Editar perfil de servicio', exact: true })
      .click();
    await ownerPage
      .getByLabel('Precio en COP', { exact: true })
      .fill('19999,95');
    await ownerPage
      .getByLabel('Motivo del cambio de servicio', { exact: true })
      .fill(reason);
    const changed = ownerPage.waitForResponse(
      (r) =>
        r.url().endsWith('/api/services/admin/' + service.id) &&
        r.request().method() === 'PATCH',
    );
    await ownerPage
      .getByRole('button', { name: 'Guardar borrador', exact: true })
      .click();
    service = await json<ApiResponse<'updateService'>>(await changed);
    expect(service.version).toBe(newer.version + 1);
    expect(service.priceMinor).toBe(1999995);
    await decide(ownerPage, 'submit');
    await page.goto('/servicios/revision/' + service.id);
    await decide(page, 'reject');
    await expect(
      page.getByText('Cambio registrado. Estado actual: Rechazado.', {
        exact: true,
      }),
    ).toBeVisible();
    await ownerPage
      .getByRole('button', { name: 'Actualizar servicio', exact: true })
      .click();
    await expect(
      ownerPage.getByRole('heading', { name: 'Última revisión' }),
    ).toBeVisible();
    await decide(ownerPage, 'submit');
    await page.goto('/servicios/revision/' + service.id);
    await decide(page, 'approve');
    await ownerPage
      .getByRole('button', { name: 'Actualizar servicio', exact: true })
      .click();
    await decide(ownerPage, 'pause');
    await expect(
      ownerPage.getByText('Cambio registrado. Estado actual: Pausado.', {
        exact: true,
      }),
    ).toBeVisible();
    await accessible(ownerPage);
    await ownerPage.screenshot({
      path: 'tmp/admin-service-detail.png',
      fullPage: true,
    });
    await ownerPage.setViewportSize({ width: 390, height: 844 });
    await accessible(ownerPage);
    expect(
      await ownerPage.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await ownerPage.screenshot({
      path: 'tmp/admin-service-mobile.png',
      fullPage: true,
    });
    await ownerPage.setViewportSize({ width: 1280, height: 900 });
    await decide(ownerPage, 'archive');
    await expect(
      ownerPage.getByText('Peluquería · Archivado', { exact: true }),
    ).toBeVisible();
    await expect(
      ownerPage.getByRole('button', {
        name: 'Registrar decisión de servicio',
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      ownerPage.getByRole('list', { name: 'Cambios del servicio' }),
    ).toContainText('Archivo');
    await ownerPage.goto('/servicios/' + org.id + '/nuevo');
    await fillProfile(ownerPage, 'Hotel Servicios Aurora', '80000');
    await ownerPage
      .getByLabel('Categoría del servicio', { exact: true })
      .selectOption('lodging');
    await ownerPage
      .getByLabel('Recursos asignados')
      .selectOption([
        { label: lodging.name + ' · capacidad ' + lodging.capacity },
      ]);
    await ownerPage.getByLabel('Máximo de noches').fill('7');
    await ownerPage.getByLabel('Hora de salida').fill('16:00');
    await ownerPage
      .getByRole('button', { name: 'Guardar borrador', exact: true })
      .click();
    await expect(ownerPage.getByRole('alert')).toContainText(
      'Revisa las especies',
    );
    await ownerPage.getByLabel('Hora de salida').fill('12:00');
    const hotelResponse = ownerPage.waitForResponse(
      (r) =>
        r.url().endsWith('/api/services/admin') &&
        r.request().method() === 'POST',
    );
    await ownerPage
      .getByRole('button', { name: 'Guardar borrador', exact: true })
      .click();
    const hotel = await json<ApiResponse<'createService'>>(await hotelResponse);
    expect(hotel.kind).toBe('lodging');
    expect(hotel.durationMinutes).toBeNull();
    expect(hotel.maxNights).toBe(7);
    await ownerPage.goto(
      '/servicios?organizationId=' +
        org.id +
        '&search=Hotel&category=lodging&status=draft&limit=10',
    );
    await expect(
      ownerPage
        .getByRole('list', { name: 'Servicios encontrados' })
        .getByRole('listitem'),
    ).toHaveCount(1);
    await ownerPage.reload();
    await expect(
      ownerPage.getByLabel('Buscar servicio por nombre'),
    ).toHaveValue('Hotel');
    await accessible(ownerPage);
    await ownerPage.screenshot({
      path: 'tmp/admin-services-list.png',
      fullPage: true,
    });
    // A credential UUID is not an accreditation: real API rejects a nonexistent professional even with a capacity-one resource.
    await ownerPage.goto('/servicios/' + org.id + '/nuevo');
    await fillProfile(ownerPage, 'Consulta no acreditada', '50000');
    await ownerPage
      .getByLabel('Categoría del servicio', { exact: true })
      .selectOption('veterinary');
    await ownerPage
      .getByLabel('Recursos asignados')
      .selectOption([
        { label: resource.name + ' · capacidad ' + resource.capacity },
      ]);
    await expect(
      ownerPage
        .getByLabel('Profesional veterinario', { exact: true })
        .locator('option'),
    ).toHaveCount(1);
    await ownerPage
      .getByRole('button', { name: 'Guardar borrador', exact: true })
      .click();
    await expect(ownerPage.getByRole('alert')).toBeVisible();
    expect(
      (
        await context.request.post('/api/services/admin', {
          headers: owner,
          data: {
            organizationId: org.id,
            reason,
            profile: {
              ...profile,
              category: 'veterinary',
              resourceIds: [resource.id],
              veterinaryCredentialId: crypto.randomUUID(),
            },
          },
        })
      ).status(),
    ).toBe(404);
    // Cross-company URL never exposes private records.
    await ownerPage.goto(
      '/servicios/' + crypto.randomUUID() + '/' + service.id,
    );
    await expect(ownerPage.getByRole('alert')).toBeVisible();
    await expect(
      ownerPage.getByRole('heading', { name: 'Lo que ofrece este servicio' }),
    ).toHaveCount(0);
    // Superadmin creation cannot be self-approved even without organization membership.
    const own = await json<ApiResponse<'createService'>>(
      await context.request.post('/api/services/admin', {
        headers,
        data: {
          organizationId: org.id,
          profile: profile as ApiRequest<'createService'>['profile'],
          reason,
        },
      }),
    );
    const pending = await json<ApiResponse<'submitService'>>(
      await context.request.post('/api/services/admin/' + own.id + '/submit', {
        headers,
        data: { expectedVersion: own.version, reason },
      }),
    );
    await page.goto('/servicios/revision/' + pending.id);
    await expect(
      page.getByText(
        'El creador y los miembros de la empresa no pueden revisar sus propios servicios.',
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByRole('button', {
        name: 'Registrar decisión de servicio',
        exact: true,
      }),
    ).toBeDisabled();
    expect(
      (
        await context.request.post(
          '/api/services/admin/' + pending.id + '/review',
          {
            headers,
            data: { expectedVersion: pending.version, reason, approved: true },
          },
        )
      ).status(),
    ).toBe(403);
    const moderatorContext = await browser.newContext({
      baseURL: process.env['ADMIN_TEST_URL'],
    });
    try {
      const moderatorPage = await moderatorContext.newPage();
      const moderatorToken = await signIn(moderatorPage, 'camila@example.com');
      await moderatorPage.goto('/servicios');
      await expect(moderatorPage).toHaveURL(/\/servicios\/revision$/);
      await moderatorPage.goto('/servicios/revision/' + pending.id);
      await decide(moderatorPage, 'approve');
      await expect(
        moderatorPage.getByText(
          'Cambio registrado. Estado actual: Publicado.',
          { exact: true },
        ),
      ).toBeVisible();
      expect(
        (
          await moderatorContext.request.get(
            '/api/services/admin?organizationId=' + org.id,
            { headers: { Authorization: 'Bearer ' + moderatorToken } },
          )
        ).status(),
      ).toBe(403);
    } finally {
      await moderatorContext.close();
    }
    // Suspension blocks publication changes despite a previously rendered page.
    await json<ApiResponse<'getOrganizationProfile'>>(
      await context.request.patch('/api/organizations/' + org.id + '/status', {
        headers,
        data: { expectedVersion: org.version, status: 'suspended', reason },
      }),
    );
    expect(
      (
        await context.request.post(
          '/api/services/admin/' + pending.id + '/pause',
          { headers, data: { expectedVersion: pending.version + 1, reason } },
        )
      ).status(),
    ).toBe(409);
  } finally {
    await ownerContext.close();
  }
  await resetIsolatedRates();
});
