import type { ApiResponse } from '@pettly/api-client';
import { test, expect, type APIResponse } from '@playwright/test';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { signIn, accessible, resetIsolatedRates } from './helpers/identity';
const reason = 'Isolated shelter animal workflow verification';
test('shelter animal creation, paging, private photos, profile, conflict, archive and permission boundaries', async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(180000);
  const token = await signIn(page, 'admin@example.com');
  const headers = { Authorization: 'Bearer ' + token };
  const json = async <T>(response: APIResponse): Promise<T> => {
    expect(response.ok(), await response.text()).toBe(true);
    return (await response.json()) as T;
  };
  const admin = await json<ApiResponse<'getCurrentUser'>>(
    await context.request.get('/api/users/me', { headers }),
  );
  let org = await json<ApiResponse<'createOrganization'>>(
    await context.request.post('/api/organizations', {
      headers,
      data: {
        name: 'Refugio Animales Aurora',
        type: 'adoption_entity',
        reason,
        profile: {
          legalName: 'Fundación Animales Aurora',
          registrationNumber: '901876456',
          email: 'animales@example.com',
          phone: '+573005556679',
          countryCode: 'CO',
          city: 'Bogotá',
          address: 'Calle de pruebas 103',
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
        responsibleUserId: admin.id,
      },
    }),
  );
  await page.goto('/animales?organizationId=' + org.id + '&limit=10');
  await expect(
    page.getByRole('heading', { name: 'Animales del refugio' }),
  ).toBeVisible();
  await page
    .getByRole('link', { name: 'Registrar animal', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Crear animal' }),
  ).toBeVisible();
  await page.getByLabel('Nombre *', { exact: true }).fill('Luna Aurora');
  await page.getByLabel('Peso (kg)', { exact: true }).fill('12,345');
  await page
    .getByLabel('Fecha de nacimiento', { exact: true })
    .fill('2024-02-29');
  await page
    .locator('#animal-healthNotes')
    .fill('Seguimiento clínico privado de Luna');
  await page.locator('#animal-microchip').fill('PRIVATE-CHIP-001');
  await page.locator('#animal-vaccinated').selectOption('false');
  await accessible(page);
  const profileReason = page.getByLabel('Motivo del registro o cambio *', {
    exact: true,
  });
  const profileConfirm = page.getByLabel(
    'Confirmo los datos y el refugio de este registro',
  );
  await profileReason.fill(reason);
  await profileConfirm.check();
  await page.getByRole('button', { name: 'Crear animal' }).click();
  await expect(
    page.getByRole('heading', { name: 'Luna Aurora', exact: true }),
  ).toBeVisible();
  const id = page.url().split('/').at(-1) as string;
  const endpoint = '/api/animals/' + id;
  let animal = await json<ApiResponse<'getAnimal'>>(
    await context.request.get(endpoint, { headers }),
  );
  expect(animal.weightGrams).toBe(12345);
  expect(animal.vaccinated).toBe(false);
  expect(animal.neutered).toBeNull();
  expect(animal.organizationId).toBe(org.id);
  expect(animal.ownerUserId).toBeNull();
  await accessible(page);
  const action = async (mode: string, note: string) => {
    await page
      .getByLabel('Acción sobre el animal', { exact: true })
      .selectOption(mode);
    await page.getByLabel('Motivo de la acción *', { exact: true }).fill(note);
    await page
      .getByLabel('Confirmo la acción y sus efectos sobre este animal')
      .check();
  };
  const require = createRequire(resolve('apps/api/package.json'));
  const image = await require('sharp')({
    create: { width: 80, height: 80, channels: 3, background: '#cfe1ce' },
  })
    .png()
    .toBuffer();
  await action('upload', 'Registro de fotografía privada del refugio');
  await page
    .getByLabel('Fotografía del animal', { exact: true })
    .setInputFiles({
      name: 'animal.png',
      mimeType: 'image/png',
      buffer: image,
    });
  await page.getByRole('button', { name: 'Registrar acción' }).click();
  await expect(
    page.getByRole('button', { name: 'Ver fotografía 1', exact: true }),
  ).toBeVisible();
  animal = await json<ApiResponse<'getAnimal'>>(
    await context.request.get(endpoint, { headers }),
  );
  const photo = animal.photos[0];
  expect(photo).toBeDefined();
  if (!photo) throw Error('Missing confirmed photograph');
  const bytes = await context.request.get(
    endpoint + '/photos/' + photo.mediaId,
    { headers },
  );
  expect(bytes.status()).toBe(200);
  expect(bytes.headers()['content-type']).toContain('image/jpeg');
  expect(bytes.headers()['cache-control']).toContain('no-store');
  await page
    .getByRole('button', { name: 'Ver fotografía 1', exact: true })
    .click();
  await expect(
    page.getByAltText('Fotografía privada de Luna Aurora'),
  ).toBeVisible();
  await accessible(page);
  await page.getByLabel('Peso (kg)', { exact: true }).fill('');
  await page.locator('#animal-microchip').fill('');
  await profileReason.fill('Actualización de datos declarados del animal');
  await profileConfirm.check();
  await page.getByRole('button', { name: 'Guardar perfil' }).click();
  await expect(profileReason).toHaveValue('');
  animal = await json<ApiResponse<'getAnimal'>>(
    await context.request.get(endpoint, { headers }),
  );
  expect(animal.weightGrams).toBeNull();
  expect(animal.microchip).toBeNull();
  const currentVersion = animal.version;
  await json<ApiResponse<'updateAnimal'>>(
    await context.request.patch(endpoint, {
      headers,
      data: {
        profile: { color: 'Negro' },
        expectedVersion: currentVersion,
        reason: 'Actualización concurrente de color declarado',
      },
    }),
  );
  await profileReason.fill('Intento sobre una versión anterior del registro');
  await profileConfirm.check();
  await page.getByRole('button', { name: 'Guardar perfil' }).click();
  await expect(
    page.getByText('Actualiza y revisa el historial antes de continuar.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Guardar perfil' }),
  ).toBeDisabled();
  await page
    .getByRole('button', { name: 'Actualizar animal', exact: true })
    .click();
  await expect(page.locator('#animal-color')).toHaveValue('Negro');
  await expect(
    page.getByRole('button', { name: 'Guardar perfil' }),
  ).toBeEnabled();
  const uncertainReason = 'Cambio confirmado con respuesta de red perdida';
  const pattern = '**/api/animals/' + id;
  await page.route(pattern, async (route) => {
    if (route.request().method() !== 'PATCH') {
      await route.continue();
      return;
    }
    const result = await route.fetch();
    expect(result.status()).toBe(200);
    await route.abort('failed');
  });
  await page.locator('#animal-color').fill('Negro y blanco');
  await profileReason.fill(uncertainReason);
  await profileConfirm.check();
  await page.getByRole('button', { name: 'Guardar perfil' }).click();
  await expect(
    page.getByText('Actualiza y revisa el historial antes de continuar.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Guardar perfil' }),
  ).toBeDisabled();
  await page.unroute(pattern);
  await page
    .getByRole('button', { name: 'Actualizar animal', exact: true })
    .click();
  await expect(page.locator('#animal-color')).toHaveValue('Negro y blanco');
  const audit = await json<ApiResponse<'listAnimalAudit'>>(
    await context.request.get(endpoint + '/audit', { headers }),
  );
  expect(audit.items.filter((e) => e.reason === uncertainReason)).toHaveLength(
    1,
  );
  await action('remove', 'Retirada de fotografía privada del registro');
  await page
    .getByLabel('Fotografía que se eliminará')
    .selectOption(photo.mediaId);
  await page.getByRole('button', { name: 'Registrar acción' }).click();
  await expect(
    page.getByText('Todavía no hay fotografías.', { exact: true }),
  ).toBeVisible();
  expect(
    (
      await context.request.get(endpoint + '/photos/' + photo.mediaId, {
        headers,
      })
    ).status(),
  ).toBe(404);
  await action('archive', 'Archivo definitivo del registro del refugio');
  await page.getByRole('button', { name: 'Registrar acción' }).click();
  await expect(
    page.getByText('Este registro está archivado y es de solo lectura.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Guardar perfil' }),
  ).toHaveCount(0);
  await expect(
    page.getByText('Seguimiento clínico privado de Luna', { exact: true }),
  ).toBeVisible();
  await accessible(page);
  for (let i = 0; i < 11; i++) {
    if (i % 4 === 0) await resetIsolatedRates();
    await json<ApiResponse<'createAnimal'>>(
      await context.request.post('/api/animals', {
        headers,
        data: {
          organizationId: org.id,
          reason,
          profile: {
            name: 'Animal Aurora ' + i,
            species: 'cat',
            sex: 'unknown',
            size: 'unknown',
            birthDateEstimated: false,
            dateOfBirth: null,
            weightGrams: null,
            breed: null,
            color: null,
            description: null,
            specialNeeds: null,
            healthNotes: null,
            microchip: null,
            vaccinated: null,
            neutered: null,
          },
        },
      }),
    );
  }
  await page.goto('/animales?organizationId=' + org.id + '&limit=10');
  await expect(
    page
      .getByRole('list', { name: 'Animales del refugio', exact: true })
      .locator('li'),
  ).toHaveCount(10);
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(
    page
      .getByRole('list', { name: 'Animales del refugio', exact: true })
      .locator('li'),
  ).toHaveCount(2);
  await page.getByLabel('Buscar por nombre', { exact: true }).fill('Luna');
  await page.getByRole('button', { name: 'Buscar animales' }).click();
  await expect(
    page
      .getByRole('list', { name: 'Animales del refugio', exact: true })
      .locator('li'),
  ).toHaveCount(1);
  await accessible(page);
  await page
    .getByRole('heading', { name: 'Animales del refugio', exact: true })
    .click();
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: 'dist/test-results/admin/animals-desktop.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await accessible(page);
  await page
    .getByRole('heading', { name: 'Animales del refugio', exact: true })
    .click();
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: 'dist/test-results/admin/animals-mobile.png',
    fullPage: true,
  });
  await page
    .getByLabel('Consultar un animal por UUID en este refugio')
    .fill(id);
  await page.getByRole('button', { name: 'Abrir animal', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Luna Aurora', exact: true }),
  ).toBeVisible();
  const strangerContext = await browser.newContext();
  try {
    const strangerPage = await strangerContext.newPage();
    const strangerToken = await signIn(strangerPage, 'camila@example.com');
    expect(
      (
        await strangerContext.request.get(endpoint, {
          headers: { Authorization: 'Bearer ' + strangerToken },
        })
      ).status(),
    ).toBe(403);
    await strangerPage.goto('/animales?organizationId=' + org.id);
    await expect(strangerPage).toHaveURL(/\/inicio$/);
  } finally {
    await strangerContext.close();
  }
  await resetIsolatedRates();
  await json<ApiResponse<'getOrganizationProfile'>>(
    await context.request.patch('/api/organizations/' + org.id + '/status', {
      headers,
      data: {
        status: 'suspended',
        reason: 'Suspensión del refugio para verificar permisos',
        expectedVersion: org.version,
      },
    }),
  );
  expect((await context.request.get(endpoint, { headers })).status()).toBe(403);
  await page.goto('/animales/' + org.id + '/' + id);
  await expect(
    page.getByText('Seguimiento clínico privado de Luna', { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Guardar perfil' }),
  ).toHaveCount(0);
});
