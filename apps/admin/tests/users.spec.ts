import { test, expect, type APIRequestContext } from '@playwright/test';
import { signIn, accessible } from './helpers/identity';
const password = 'A sufficiently long password!';
const reason = 'Account management integration verification';

async function invitationToken(request: APIRequestContext, previous = '') {
  let token = '';
  await expect
    .poll(
      async () => {
        const list = await (
          await request.get(
            process.env['MAILPIT_TEST_URL'] + '/api/v1/messages',
          )
        ).json();
        for (const message of list.messages ?? []) {
          if (
            !message.To.some(
              (to: { Address: string }) => to.Address === 'camila@example.com',
            ) ||
            !message.Subject.includes('Accept your invitation')
          )
            continue;
          const detail = await (
            await request.get(
              process.env['MAILPIT_TEST_URL'] + '/api/v1/message/' + message.ID,
            )
          ).json();
          const found = detail.Text.match(/token=([A-Za-z0-9_-]{43})/)?.[1];
          if (found && found !== previous) {
            token = found;
            return true;
          }
        }
        return false;
      },
      { timeout: 25000 },
    )
    .toBe(true);
  return token;
}

test('superadmin manages real users, invitations, profiles, status, roles, memberships and audit', async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(180000);
  const token = await signIn(page, 'admin@example.com');
  const headers = { Authorization: 'Bearer ' + token };
  const me = await (
    await context.request.get('/api/users/me', { headers })
  ).json();
  for (let i = 0; i < 11; i++) {
    const response = await context.request.post('/api/users', {
      headers,
      data: {
        email: `pagination-${i}@example.com`,
        name: 'Persona',
        lastName: 'Prueba',
        reason,
      },
    });
    expect(response.status()).toBe(202);
  }
  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: 'Usuarios', exact: true })
    .click();
  await expect(
    page
      .getByRole('list', { name: 'Resultados de usuarios' })
      .getByRole('listitem'),
  ).toHaveCount(13);
  await accessible(page);
  await page.getByLabel('Resultados por página').selectOption('10');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(
    page
      .getByRole('list', { name: 'Resultados de usuarios' })
      .getByRole('listitem'),
  ).toHaveCount(10);
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(
    page
      .getByRole('list', { name: 'Resultados de usuarios' })
      .getByRole('listitem'),
  ).toHaveCount(3);
  await page.reload();
  await expect(page.getByLabel('Resultados por página')).toHaveValue('10');
  await expect(
    page
      .getByRole('list', { name: 'Resultados de usuarios' })
      .getByRole('listitem'),
  ).toHaveCount(3);
  await page.getByLabel('Buscar usuarios').fill('Carlos');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(
    page
      .getByRole('list', { name: 'Resultados de usuarios' })
      .getByRole('listitem'),
  ).toHaveCount(1);
  await expect(
    page.getByRole('link', { name: 'Carlos Pettly', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: 'tmp/admin-users-list.png', fullPage: true });
  await page
    .getByRole('link', { name: 'Invitar usuario', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Enviar invitación', exact: true }),
  ).toBeVisible();
  await accessible(page);
  await page
    .getByRole('button', { name: 'Enviar invitación', exact: true })
    .click();
  await expect(page.getByLabel('Correo electrónico')).toBeFocused();
  await page.getByLabel('Correo electrónico').fill('camila@example.com');
  await page.getByLabel('Nombres', { exact: true }).fill('Camila');
  await page.getByLabel('Apellidos', { exact: true }).fill('Rivera');
  await page.getByLabel('Teléfono', { exact: true }).fill('+573001234567');
  await page.getByLabel('País', { exact: true }).selectOption('CO');
  await page.getByLabel('Motivo administrativo').fill(reason);
  await page
    .getByRole('button', { name: 'Enviar invitación', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Camila Rivera', exact: true }),
  ).toBeVisible();
  const userId = new URL(page.url()).pathname.split('/')[2];
  const first = await invitationToken(context.request);
  await page.getByLabel('Motivo de reenvío').fill(reason);
  await page
    .getByRole('button', { name: 'Reenviar invitación', exact: true })
    .click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Invitación reenviada.' }),
  ).toBeVisible();
  const next = await invitationToken(context.request, first);
  expect(
    (
      await context.request.post('/api/auth/accept-invitation', {
        data: { token: first, password },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await context.request.post('/api/auth/accept-invitation', {
        data: { token: next, password },
      })
    ).status(),
  ).toBe(200);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Camila Rivera', exact: true }),
  ).toBeVisible();
  await accessible(page);
  await page.getByRole('link', { name: 'Editar perfil', exact: true }).click();
  await page.getByLabel('Ciudad', { exact: true }).fill('Medellín');
  await page
    .getByLabel('Dirección', { exact: true })
    .fill('Calle de prueba 27');
  await page.getByLabel('Teléfono', { exact: true }).fill('');
  await page.getByLabel('Motivo administrativo').fill(reason);
  await accessible(page);
  await page
    .getByRole('button', { name: 'Guardar perfil', exact: true })
    .click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Perfil actualizado.' }),
  ).toBeVisible();
  const profile = await (
    await context.request.get(`/api/users/${userId}`, { headers })
  ).json();
  expect(profile.city).toBe('Medellín');
  expect(profile.phone).toBeNull();
  expect(profile.countryCode).toBe('CO');
  await page.getByRole('link', { name: 'Detalle', exact: true }).click();
  await page.getByLabel('Motivo de cambio de estado').fill(reason);
  await page.getByRole('button', { name: 'Confirmar desactivación' }).click();
  await expect(
    page.getByRole('button', { name: 'Confirmar reactivación' }),
  ).toBeVisible();
  await page.getByLabel('Motivo de cambio de estado').fill(reason);
  await page.getByRole('button', { name: 'Confirmar reactivación' }).click();
  await expect(
    page.getByRole('button', { name: 'Confirmar desactivación' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Acceso y roles', exact: true }).click();
  await page.getByLabel('Nuevo rol global').selectOption('moderator');
  await page.getByLabel('Motivo del cambio de rol').fill(reason);
  await page.getByRole('button', { name: 'Confirmar cambio de rol' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Rol global actualizado.' }),
  ).toBeVisible();
  await expect(page.getByLabel('Nuevo rol global')).toHaveValue('moderator');
  const company = await context.request.post('/api/organizations', {
    headers,
    data: { name: 'Clínica de prueba', type: 'business', reason },
  });
  expect(company.status()).toBe(201);
  const organization = await company.json();
  await page.getByLabel('Buscar empresa o refugio').fill('Clínica');
  await page
    .getByRole('button', { name: 'Buscar organización', exact: true })
    .click();
  await page.getByRole('radio', { name: 'Clínica de prueba, Empresa' }).check();
  await expect(
    page.getByLabel('Rol de membresía').locator('option'),
  ).toHaveCount(2);
  await page.getByLabel('Motivo de asignación').fill(reason);
  await page
    .getByRole('button', { name: 'Guardar membresía', exact: true })
    .click();
  await expect(
    page.getByRole('button', {
      name: 'Retirar membresía de Clínica de prueba',
    }),
  ).toBeVisible();
  await accessible(page);
  const access = await (
    await context.request.get(`/api/authorization/users/${userId}`, { headers })
  ).json();
  expect(access.globalRole).toBe('moderator');
  expect(access.organizations).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        organizationId: organization.id,
        role: 'business_operator',
      }),
    ]),
  );
  await page
    .getByRole('button', { name: 'Retirar membresía de Clínica de prueba' })
    .click();
  await page.getByLabel('Motivo de retirada').fill(reason);
  await page
    .getByRole('button', { name: 'Confirmar retirada', exact: true })
    .click();
  await expect(page.getByText('No tiene membresías asignadas.')).toBeVisible();
  await page.getByRole('link', { name: 'Auditoría', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Perfil actualizado', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Rol global actualizado', exact: true }),
  ).toBeVisible();
  await accessible(page);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: 'tmp/admin-user-audit.png', fullPage: true });
  await page.goto(`/usuarios/${me.id}/acceso`);
  await page.getByLabel('Nuevo rol global').selectOption('user');
  await page.getByLabel('Motivo del cambio de rol').fill(reason);
  await page.getByRole('button', { name: 'Confirmar cambio de rol' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'El cambio fue bloqueado',
  );
  expect(
    (await (await context.request.get('/api/users/me', { headers })).json())
      .globalRole,
  ).toBe('super_admin');
  const otherContext = await browser.newContext({
    baseURL: process.env['ADMIN_TEST_URL'],
  });
  try {
    const other = await otherContext.newPage();
    const moderator = await signIn(other, 'camila@example.com');
    await expect(
      other.getByRole('link', { name: 'Usuarios', exact: true }),
    ).toHaveCount(0);
    await other.goto('/usuarios');
    await expect(other).toHaveURL(/\/inicio$/);
    expect(
      (
        await otherContext.request.get('/api/users', {
          headers: { Authorization: 'Bearer ' + moderator },
        })
      ).status(),
    ).toBe(403);
  } finally {
    await otherContext.close();
  }
});
