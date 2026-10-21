import { test, expect } from '@playwright/test';
import { signIn, accessible, resetIsolatedRates } from './helpers/identity';
const password = 'A sufficiently long password!';
const reason = 'Organization management integration verification';
test('superadmin reviews real organizations, version conflicts, operational permissions, responsibilities and audit', async ({
  page,
  context,
}) => {
  test.setTimeout(150000);
  const token = await signIn(page, 'admin@example.com');
  const headers = { Authorization: 'Bearer ' + token };
  const admin = await (
    await context.request.get('/api/users/me', { headers })
  ).json();
  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: 'Organizaciones', exact: true })
    .click();
  await expect(
    page.getByText('No encontramos organizaciones con estos filtros.'),
  ).toBeVisible();
  await accessible(page);
  await page
    .getByRole('link', { name: 'Crear organización', exact: true })
    .click();
  await accessible(page);
  await page
    .getByRole('button', { name: 'Crear borrador', exact: true })
    .click();
  await expect(page.getByLabel('Nombre de la organización')).toBeFocused();
  for (const [label, value] of [
    ['Nombre de la organización', 'Empresa Sendero'],
    ['Razón social', 'Sendero SAS'],
    ['Número de registro', '900.123-456'],
    ['Correo de contacto', 'sendero@example.com'],
    ['Teléfono', '+573001234567'],
    ['Ciudad', 'Medellín'],
    ['Dirección', 'Calle de prueba 27'],
    ['Motivo administrativo', reason],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel('País', { exact: true }).selectOption('CO');
  await page
    .getByRole('button', { name: 'Crear borrador', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Empresa Sendero', exact: true }),
  ).toBeVisible();
  const id = new URL(page.url()).pathname.split('/')[2];
  await expect(
    page.getByText(
      'La carga y consulta de documentos legales todavía no está habilitada.',
      { exact: false },
    ),
  ).toBeVisible();
  await accessible(page);
  await page
    .getByRole('link', { name: 'Revisión y estado', exact: true })
    .click();
  await page.getByLabel('Motivo de envío').fill(reason);
  await page
    .getByRole('button', { name: 'Enviar a revisión', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Aprobar solicitud', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Confirmar aprobación', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText('Selecciona una cuenta');
  await page
    .getByRole('radio', { name: 'Ana Pettly, admin@example.com', exact: true })
    .check();
  await page.getByLabel('Motivo de aprobación').fill(reason);
  await accessible(page);
  await page
    .getByRole('button', { name: 'Confirmar aprobación', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Suspender organización', exact: true }),
  ).toBeVisible();
  let profile = await (
    await context.request.get(`/api/organizations/${id}/profile`, { headers })
  ).json();
  expect(profile.status).toBe('active');
  expect(profile.responsibleUserId).toBe(admin.id);
  expect(profile.registrationNumber).toBe('900123456');
  let access = await (
    await context.request.get('/api/authorization/me', { headers })
  ).json();
  expect(access.organizations).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        organizationId: id,
        role: 'business_admin',
        status: 'active',
      }),
    ]),
  );
  await page.screenshot({
    path: 'tmp/admin-organization-review.png',
    fullPage: true,
  });
  // Change the version through another real client before the UI confirms suspension.
  const concurrent = await context.request.patch(
    `/api/organizations/${id}/profile`,
    {
      headers,
      data: {
        profile: { city: 'Bogotá' },
        reason,
        expectedVersion: profile.version,
      },
    },
  );
  expect(concurrent.status()).toBe(200);
  await page.getByLabel('Motivo del cambio de estado').fill(reason);
  const conflict = page.waitForResponse((r) =>
    r.url().endsWith(`/organizations/${id}/status`),
  );
  await page
    .getByRole('button', { name: 'Confirmar suspensión', exact: true })
    .click();
  expect((await conflict).status()).toBe(409);
  await expect(page.getByRole('alert')).toContainText('Actualiza los datos');
  await page
    .getByRole('button', { name: 'Actualizar datos', exact: true })
    .click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByLabel('Motivo del cambio de estado').fill(reason);
  await page
    .getByRole('button', { name: 'Confirmar suspensión', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Reactivar organización', exact: true }),
  ).toBeVisible();
  access = await (
    await context.request.get('/api/authorization/me', { headers })
  ).json();
  expect(
    access.organizations.find(
      (org: { organizationId: string }) => org.organizationId === id,
    ),
  ).toMatchObject({ status: 'suspended' });
  const suspended = access.organizations.find(
    (org: { organizationId: string }) => org.organizationId === id,
  );
  expect(suspended.permissions).not.toContain('catalog.manage');
  expect(suspended.permissions).not.toContain('inventory.manage');
  expect(suspended.permissions).not.toContain('services.manage');
  await page.getByLabel('Motivo del cambio de estado').fill(reason);
  await page
    .getByRole('button', { name: 'Confirmar reactivación', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Suspender organización', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Editar perfil', exact: true }).click();
  await page.getByLabel('Razón social').fill('Sendero Colombia SAS');
  await page.getByLabel('Motivo administrativo').fill(reason);
  await accessible(page);
  await page
    .getByRole('button', { name: 'Guardar perfil', exact: true })
    .click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Perfil actualizado.' }),
  ).toBeVisible();
  profile = await (
    await context.request.get(`/api/organizations/${id}/profile`, { headers })
  ).json();
  expect(profile.status).toBe('pending');
  await page
    .getByRole('link', { name: 'Revisión y estado', exact: true })
    .click();
  await page
    .getByRole('radio', { name: 'Ana Pettly, admin@example.com', exact: true })
    .check();
  await page.getByLabel('Motivo de aprobación').fill(reason);
  await page
    .getByRole('button', { name: 'Confirmar aprobación', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Cambiar responsable', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('radio', {
      name: 'Carlos Pettly, customer@example.com',
      exact: true,
    })
    .check();
  await page.getByLabel('Motivo del cambio de responsable').fill(reason);
  await page
    .getByRole('button', { name: 'Confirmar nuevo responsable', exact: true })
    .click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Responsable actualizado.' }),
  ).toBeVisible();
  const customer = await (
    await context.request.get('/api/users?search=customer%40example.com', {
      headers,
    })
  ).json();
  const customerId = customer.items[0].id;
  profile = await (
    await context.request.get(`/api/organizations/${id}/profile`, { headers })
  ).json();
  expect(profile.responsibleUserId).toBe(customerId);
  await page
    .getByRole('radio', { name: 'Ana Pettly, admin@example.com', exact: true })
    .check();
  await page.getByLabel('Motivo del cambio de responsable').fill(reason);
  const transferred = page.waitForResponse(
    (r) =>
      r.url().endsWith(`/organizations/${id}/responsible`) &&
      r.status() === 200,
  );
  await page
    .getByRole('button', { name: 'Confirmar nuevo responsable', exact: true })
    .click();
  await transferred;
  // Restore the seed customer's original access for the independent identity suite.
  expect(
    (
      await context.request.delete(
        `/api/organizations/${id}/members/${customerId}/role`,
        { headers, data: { reason } },
      )
    ).status(),
  ).toBe(200);
  await page.getByRole('link', { name: 'Miembros', exact: true }).click();
  await expect(
    page
      .getByRole('list', { name: 'Miembros de la organización' })
      .getByRole('listitem'),
  ).toHaveCount(1);
  await expect(
    page.getByText('Responsable de la organización', { exact: true }),
  ).toBeVisible();
  await accessible(page);
  await page.getByRole('link', { name: 'Auditoría', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Organización aprobada', exact: true }),
  ).toHaveCount(2);
  await expect(
    page.getByRole('heading', { name: 'Responsable actualizado', exact: true }),
  ).toHaveCount(2);
  await accessible(page);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'tmp/admin-organization-audit.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  // Real self-onboarding, rejection, correction/resubmission and adoption-specific approval.
  await resetIsolatedRates();
  const login = await context.request.post('/api/auth/login', {
    data: { email: 'customer@example.com', password, client: 'mobile' },
  });
  expect(login.status()).toBe(200);
  const customerToken = (await login.json()).accessToken;
  const customerHeaders = { Authorization: 'Bearer ' + customerToken };
  const requested = await context.request.post('/api/organizations/requests', {
    headers: customerHeaders,
    data: {
      name: 'Refugio Sendero',
      type: 'adoption_entity',
      profile: {
        legalName: 'Fundación Sendero',
        registrationNumber: '900.999-001',
        email: 'refugio@example.com',
        phone: '+573001234568',
        countryCode: 'CO',
        city: 'Medellín',
        address: 'Calle de prueba 28',
      },
    },
  });
  expect(requested.status()).toBe(201);
  const shelter = await requested.json();
  expect(
    (
      await context.request.post(`/api/organizations/${shelter.id}/submit`, {
        headers: customerHeaders,
        data: { reason, expectedVersion: shelter.version },
      })
    ).status(),
  ).toBe(201);
  expect(
    (
      await context.request.get('/api/organizations', {
        headers: customerHeaders,
      })
    ).status(),
  ).toBe(403);
  await page.goto(`/organizaciones/${shelter.id}/revision`);
  await page.getByLabel('Motivo de rechazo').fill(reason);
  await page
    .getByRole('button', { name: 'Confirmar rechazo', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Enviar a revisión', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Motivo de envío').fill(reason);
  await page
    .getByRole('button', { name: 'Enviar a revisión', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Aprobar solicitud', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('radio', { name: 'Ana Pettly, admin@example.com', exact: true })
    .check();
  await page.getByLabel('Motivo de aprobación').fill(reason);
  await page
    .getByRole('button', { name: 'Confirmar aprobación', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Cambiar responsable', exact: true }),
  ).toBeVisible();
  access = await (
    await context.request.get('/api/authorization/me', { headers })
  ).json();
  expect(
    access.organizations.find(
      (org: { organizationId: string }) => org.organizationId === shelter.id,
    ),
  ).toMatchObject({ role: 'adoption_admin', status: 'active' });
  for (let i = 0; i < 11; i++)
    expect(
      (
        await context.request.post('/api/organizations', {
          headers,
          data: {
            name: `Organización de prueba ${i}`,
            type: 'business',
            reason,
          },
        })
      ).status(),
    ).toBe(201);
  await page.goto('/organizaciones');
  await page.getByLabel('Resultados por página').selectOption('10');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(
    page
      .getByRole('list', { name: 'Resultados de organizaciones' })
      .getByRole('listitem'),
  ).toHaveCount(10);
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(
    page
      .getByRole('list', { name: 'Resultados de organizaciones' })
      .getByRole('listitem'),
  ).toHaveCount(3);
  await page.reload();
  await expect(page.getByLabel('Resultados por página')).toHaveValue('10');
  await page
    .getByLabel('Tipo', { exact: true })
    .selectOption('adoption_entity');
  await page.getByLabel('Estado', { exact: true }).selectOption('active');
  await page.getByLabel('Buscar organizaciones').fill('Sendero');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(
    page
      .getByRole('list', { name: 'Resultados de organizaciones' })
      .getByRole('listitem'),
  ).toHaveCount(1);
  await expect(
    page.getByRole('link', { name: 'Refugio Sendero', exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: 'tmp/admin-organizations-list.png',
    fullPage: true,
  });
  await page.goto('/organizaciones/not-a-uuid');
  await expect(page.getByRole('alert')).toContainText('Revisa los campos');
  await resetIsolatedRates();
});
