import type { ApiResponse } from '@pettly/api-client';
import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { signIn, accessible, resetIsolatedRates } from './helpers/identity';
const reason = 'Isolated veterinary review integration verification';
test('superadmin reviews real private veterinary evidence, independent decisions, conflicts and revocation', async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(150000);
  const token = await signIn(page, 'admin@example.com');
  const headers = { Authorization: 'Bearer ' + token };
  const expectJson = async <T = ApiResponse<'getVeterinaryCredential'>>(
    response: Awaited<ReturnType<typeof context.request.post>>,
  ): Promise<T> => {
    expect(response.ok()).toBe(true);
    return (await response.json()) as T;
  };
  const customer = await expectJson<ApiResponse<'login'>>(
    await context.request.post('/api/auth/login', {
      data: {
        client: 'mobile',
        email: 'customer@example.com',
        password: 'A sufficiently long password!',
      },
    }),
  );
  const owner = { Authorization: 'Bearer ' + customer.accessToken };
  const professional = await expectJson<ApiResponse<'getCurrentUser'>>(
    await context.request.get('/api/users/me', { headers: owner }),
  );
  const organization = await expectJson<ApiResponse<'createOrganization'>>(
    await context.request.post('/api/organizations', {
      headers,
      data: {
        name: 'Empresa Veterinaria Aurora',
        type: 'business',
        reason,
        profile: {
          legalName: 'Aurora Pruebas SAS',
          registrationNumber: '901987657',
          email: 'aurora@example.com',
          phone: '+573005556677',
          countryCode: 'CO',
          city: 'Bogotá',
          address: 'Calle de pruebas 100',
        },
      },
    }),
  );
  let org = await expectJson<ApiResponse<'getOrganizationProfile'>>(
    await context.request.post(`/api/organizations/${organization.id}/submit`, {
      headers,
      data: { reason, expectedVersion: organization.version },
    }),
  );
  org = await expectJson<ApiResponse<'getOrganizationProfile'>>(
    await context.request.post(`/api/organizations/${org.id}/approve`, {
      headers,
      data: {
        reason,
        expectedVersion: org.version,
        responsibleUserId: professional.id,
      },
    }),
  );
  const resource = async (name: string) =>
    expectJson<ApiResponse<'createServiceResource'>>(
      await context.request.post('/api/services/admin/resources', {
        headers,
        data: {
          organizationId: org.id,
          reason,
          profile: {
            name,
            kind: 'appointment',
            capacity: 1,
            status: 'active',
            windows: [{ day: 1, startMinute: 480, endMinute: 1080 }],
          },
        },
      }),
    );
  const create = async (registrationNumber: string) => {
    const schedule = await resource('Agenda profesional ' + registrationNumber);
    return expectJson(
      await context.request.post('/api/veterinary/credentials', {
        headers: owner,
        data: {
          organizationId: org.id,
          professionalId: professional.id,
          resourceId: schedule.id,
          profile: {
            profession: 'veterinarian',
            registrationNumber,
            university: 'Universidad de pruebas',
            consent: true,
          },
          reason,
        },
      }),
    );
  };
  let credential = await create('87878787');
  const path = '/api/veterinary/credentials/' + credential.id;
  const require = createRequire(resolve('apps/api/package.json'));
  const image = await require('sharp')({
    create: { width: 600, height: 400, channels: 3, background: '#edf3e7' },
  })
    .png()
    .toBuffer();
  for (const kind of [
    'professional_card',
    'qualification',
    'standing_certificate',
  ])
    credential = await expectJson(
      await context.request.post(path + '/documents', {
        headers: owner,
        multipart: {
          file: {
            name: 'test-evidence.png',
            mimeType: 'image/png',
            buffer: image,
          },
          kind,
          reason,
          expectedVersion: String(credential.version),
        },
      }),
    );
  const submit = async () => {
    credential = await expectJson(
      await context.request.post(path + '/submit', {
        headers: owner,
        data: { reason, expectedVersion: credential.version },
      }),
    );
  };
  await submit();
  for (let i = 0; i < 10; i++) await create(String(88000000 + i));
  await page.goto('/veterinaria');
  await expect(
    page.getByRole('heading', {
      name: 'Acreditaciones veterinarias',
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel('Resultados por página').selectOption('10');
  await page.getByRole('button', { name: 'Filtrar', exact: true }).click();
  await expect(
    page
      .getByRole('list', { name: 'Resultados de acreditaciones' })
      .locator('li'),
  ).toHaveCount(10);
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(
    page
      .getByRole('list', { name: 'Resultados de acreditaciones' })
      .locator('li'),
  ).toHaveCount(1);
  await page.reload();
  await expect(
    page
      .getByRole('list', { name: 'Resultados de acreditaciones' })
      .locator('li'),
  ).toHaveCount(1);
  await page.getByLabel('Estado', { exact: true }).selectOption('pending');
  await page.getByLabel('ID de organización', { exact: true }).fill(org.id);
  await page.getByRole('button', { name: 'Filtrar', exact: true }).click();
  await expect(
    page
      .getByRole('list', { name: 'Resultados de acreditaciones' })
      .locator('li'),
  ).toHaveCount(1);
  await accessible(page);
  await page.screenshot({
    path: 'tmp/admin-veterinary-list.png',
    fullPage: true,
  });
  const evidenceReads: string[] = [];
  page.on('request', (request) => {
    if (/\/documents\//.test(request.url())) evidenceReads.push(request.url());
  });
  await page
    .getByRole('link', { name: 'Matrícula 87878787', exact: true })
    .click();
  await expect(page.getByText('Carlos Pettly', { exact: true })).toBeVisible();
  await expect(
    page
      .getByRole('list', { name: 'Documentos de acreditación' })
      .locator('li'),
  ).toHaveCount(3);
  expect(evidenceReads).toHaveLength(0);
  const privateRead = page.waitForResponse(
    (r) => r.url().includes('/documents/') && r.status() === 200,
  );
  await page
    .getByRole('button', {
      name: 'Ver Tarjeta profesional, página 1',
      exact: true,
    })
    .click();
  const evidence = await privateRead;
  expect(evidence.headers()['content-type']).toContain('image/jpeg');
  expect(evidence.headers()['cache-control']).toBe('no-store');
  await expect(
    page.getByRole('img', { name: 'Tarjeta profesional de la acreditación' }),
  ).toBeVisible();
  expect(evidenceReads).toHaveLength(1);
  await accessible(page);
  await page
    .getByRole('button', { name: 'Cerrar evidencia', exact: true })
    .click();
  await expect(page.getByRole('img')).toHaveCount(0);
  const outsider = await browser.newContext({
    baseURL: process.env['ADMIN_TEST_URL'],
  });
  try {
    const other = await outsider.newPage();
    const otherToken = await signIn(other, 'camila@example.com');
    await other.goto('/veterinaria');
    await expect(other).toHaveURL(/\/inicio$/);
    expect(
      (
        await outsider.request.get(
          path + '/documents/' + credential.documents[0].mediaId,
          { headers: { Authorization: 'Bearer ' + otherToken } },
        )
      ).status(),
    ).toBe(403);
  } finally {
    await outsider.close();
  }
  await page
    .getByRole('link', { name: 'Revisión y estado', exact: true })
    .click();
  await expect(
    page.getByText('Profesional: Carlos Pettly', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Registrar decisión', exact: true })
    .click();
  await expect(page.getByLabel('Decisión', { exact: true })).toBeFocused();
  const administrator = await expectJson<ApiResponse<'getCurrentUser'>>(
    await context.request.get('/api/users/me', { headers }),
  );
  expect(
    (
      await context.request.put(
        `/api/organizations/${org.id}/members/${administrator.id}/role`,
        { headers, data: { role: 'business_operator', reason } },
      )
    ).ok(),
  ).toBe(true);
  await page.reload();
  await expect(
    page.getByText(
      'La revisión debe hacerla otro superadministrador, ajeno al profesional y a esta empresa.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Registrar decisión', exact: true }),
  ).toBeDisabled();
  expect(
    (
      await context.request.post(path + '/review', {
        headers,
        data: {
          approved: false,
          officialRegisterChecked: true,
          verifiedUntil: null,
          verificationReference: null,
          reason,
          expectedVersion: credential.version,
        },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await context.request.delete(
        `/api/organizations/${org.id}/members/${administrator.id}/role`,
        { headers, data: { reason } },
      )
    ).ok(),
  ).toBe(true);
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Registrar decisión', exact: true }),
  ).toBeEnabled();
  credential = await expectJson(
    await context.request.post(path + '/revoke', {
      headers,
      data: { reason, expectedVersion: credential.version },
    }),
  );
  await page.getByLabel('Decisión', { exact: true }).selectOption('reject');
  await page.getByLabel('Confirmo que comprobé', { exact: false }).check();
  await page.getByLabel('Motivo de revisión', { exact: true }).fill(reason);
  await page
    .getByRole('button', { name: 'Registrar decisión', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText('La acreditación cambió');
  await page
    .getByRole('button', { name: 'Actualizar datos', exact: true })
    .click();
  await expect(page.getByText('Revocada', { exact: true })).toBeVisible();
  await submit();
  await page
    .getByRole('button', { name: 'Actualizar datos', exact: true })
    .click();
  await page.getByLabel('Decisión', { exact: true }).selectOption('reject');
  await page.getByLabel('Confirmo que comprobé', { exact: false }).check();
  await page.getByLabel('Motivo de revisión', { exact: true }).fill(reason);
  await accessible(page);
  await page
    .getByRole('button', { name: 'Registrar decisión', exact: true })
    .click();
  await expect(page.getByText('Rechazada', { exact: true })).toBeVisible();
  credential = await expectJson(await context.request.get(path, { headers }));
  await submit();
  await page
    .getByRole('button', { name: 'Actualizar datos', exact: true })
    .click();
  await page.getByLabel('Decisión', { exact: true }).selectOption('approve');
  await page.getByLabel('Confirmo que comprobé', { exact: false }).check();
  await page
    .getByLabel('Referencia de verificación oficial')
    .fill('Official isolated test certificate reference');
  const localTime = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };
  await page
    .getByLabel('Fecha de nueva revisión')
    .fill(localTime(new Date(Date.now() + 91 * 86400000)));
  await page.getByLabel('Motivo de revisión', { exact: true }).fill(reason);
  await page
    .getByRole('button', { name: 'Registrar decisión', exact: true })
    .click();
  await expect(page.getByLabel('Fecha de nueva revisión')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await page
    .getByLabel('Fecha de nueva revisión')
    .fill(localTime(new Date(Date.now() + 7 * 86400000)));
  await accessible(page);
  await page.screenshot({
    path: 'tmp/admin-veterinary-review.png',
    fullPage: true,
  });
  await page
    .getByRole('button', { name: 'Registrar decisión', exact: true })
    .click();
  await expect(page.getByText('Aprobada', { exact: true })).toBeVisible();
  credential = await expectJson(await context.request.get(path, { headers }));
  expect(credential.verificationReference).toBe(
    'Official isolated test certificate reference',
  );
  expect(
    (
      await context.request.post(path + '/review', {
        headers: owner,
        data: {
          approved: true,
          officialRegisterChecked: true,
          verifiedUntil: new Date(Date.now() + 86400000).toISOString(),
          verificationReference: 'Cannot self approve this credential',
          reason,
          expectedVersion: credential.version,
        },
      })
    ).status(),
  ).toBe(403);
  await page.getByLabel('Motivo de revocación', { exact: true }).fill(reason);
  await page
    .getByRole('button', { name: 'Confirmar revocación', exact: true })
    .click();
  await expect(page.getByText('Revocada', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Auditoría', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Acreditación aprobada', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Solicitud rechazada', exact: true }),
  ).toBeVisible();
  await accessible(page);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'tmp/admin-veterinary-audit.png',
    fullPage: true,
  });
  await page.goto('/veterinaria/not-a-uuid');
  await expect(page.getByRole('alert')).toContainText(
    'Revisa los identificadores',
  );
  await resetIsolatedRates();
});
