import type { ApiResponse } from '@pettly/api-client';
import { test, expect, type APIResponse } from '@playwright/test';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { signIn, accessible, resetIsolatedRates } from './helpers/identity';
const reason = 'Isolated adoption publication workflow verification';
test('adoption publication preparation, snapshot privacy, private moderation photos, independent decisions, renewal, conflict, archive and suspension', async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(180000);
  const token = await signIn(page, 'admin@example.com'),
    headers = { Authorization: 'Bearer ' + token };
  const json = async <T>(r: APIResponse): Promise<T> => {
    expect(r.ok(), await r.text()).toBe(true);
    return (await r.json()) as T;
  };
  const customer = await json<ApiResponse<'login'>>(
    await context.request.post('/api/auth/login', {
      data: {
        email: 'customer@example.com',
        password: 'A sufficiently long password!',
        client: 'mobile',
      },
    }),
  );
  const owner = { Authorization: 'Bearer ' + customer.accessToken };
  const user = await json<ApiResponse<'getCurrentUser'>>(
    await context.request.get('/api/users/me', { headers: owner }),
  );
  let org = await json<ApiResponse<'createOrganization'>>(
    await context.request.post('/api/organizations', {
      headers,
      data: {
        name: 'Refugio Adopciones Aurora',
        type: 'adoption_entity',
        reason,
        profile: {
          legalName: 'Fundación Adopciones Aurora',
          registrationNumber: '901876459',
          email: 'adopciones@example.com',
          phone: '+573005556674',
          countryCode: 'CO',
          city: 'Bogotá',
          address: 'Calle de pruebas 109',
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
  const animal = await json<ApiResponse<'createAnimal'>>(
    await context.request.post('/api/animals', {
      headers: owner,
      data: {
        organizationId: org.id,
        reason,
        profile: {
          name: 'Nala Aurora',
          species: 'dog',
          breed: null,
          sex: 'female',
          size: 'medium',
          dateOfBirth: null,
          birthDateEstimated: false,
          weightGrams: null,
          color: 'Blanco',
          description: 'Animal tranquilo del refugio',
          specialNeeds: 'Paseos diarios',
          healthNotes: 'CLINICAL-MUST-STAY-PRIVATE',
          microchip: 'CHIP-MUST-STAY-PRIVATE',
          vaccinated: null,
          neutered: null,
        },
      },
    }),
  );
  const require = createRequire(resolve('apps/api/package.json'));
  const png = await require('sharp')({
    create: { width: 100, height: 100, channels: 3, background: '#e0e9dc' },
  })
    .png()
    .toBuffer();
  await json<ApiResponse<'uploadAnimalPhoto'>>(
    await context.request.post('/api/animals/' + animal.id + '/photos', {
      headers: owner,
      multipart: {
        file: { name: 'nala.png', mimeType: 'image/png', buffer: png },
        reason,
        expectedVersion: String(animal.version),
      },
    }),
  );
  const ownerContext = await browser.newContext(),
    reviewContext = await browser.newContext();
  try {
    const ownerPage = await ownerContext.newPage();
    await signIn(ownerPage, 'customer@example.com');
    await ownerPage.goto('/adopciones?organizationId=' + org.id + '&limit=10');
    await expect(
      ownerPage.getByRole('heading', {
        name: 'Publicaciones de adopción',
        exact: true,
      }),
    ).toBeVisible();
    await ownerPage
      .getByRole('link', { name: 'Preparar publicación', exact: true })
      .click();
    await ownerPage
      .getByLabel('UUID del animal activo', { exact: true })
      .fill(animal.id);
    await ownerPage
      .getByRole('button', { name: 'Consultar animal', exact: true })
      .click();
    await expect(
      ownerPage.getByText('Animal seleccionado: Nala Aurora', { exact: true }),
    ).toBeVisible();
    await ownerPage
      .getByLabel('Título público *', { exact: true })
      .fill('Nala busca familia Aurora');
    await ownerPage
      .getByLabel('Descripción pública *', { exact: true })
      .fill('Compañera tranquila y amigable busca una familia.');
    await ownerPage
      .getByLabel('Condiciones de adopción *', { exact: true })
      .fill('Adopción responsable con seguimiento del refugio.');
    await ownerPage.getByLabel('Ciudad *', { exact: true }).fill('Bogotá');
    await ownerPage
      .getByLabel('Motivo del registro o cambio *', { exact: true })
      .fill(reason);
    await ownerPage
      .getByLabel('Confirmo la ficha pública y el refugio seleccionado')
      .check();
    await accessible(ownerPage);
    await ownerPage
      .getByRole('button', { name: 'Crear publicación', exact: true })
      .click();
    await expect(
      ownerPage.getByRole('heading', {
        name: 'Nala busca familia Aurora',
        exact: true,
      }),
    ).toBeVisible();
    const id = ownerPage.url().split('/').at(-1) as string,
      endpoint = '/api/adoptions/publications/' + id;
    const decide = async (action: string, note: string) => {
      await ownerPage.getByLabel('Acción de publicación').selectOption(action);
      await ownerPage
        .getByLabel('Motivo de la decisión *', { exact: true })
        .fill(note);
      await ownerPage
        .getByLabel('Confirmo la decisión y sus efectos sobre la publicación')
        .check();
      const decisionResponse = ownerPage.waitForResponse(
        (r) =>
          r
            .url()
            .endsWith(
              action === 'archive' ? endpoint : endpoint + '/' + action,
            ) &&
          r.request().method() === (action === 'archive' ? 'DELETE' : 'POST'),
      );
      await ownerPage
        .getByRole('button', { name: 'Registrar decisión', exact: true })
        .click();
      expect((await decisionResponse).ok()).toBe(true);
      await expect(
        ownerPage.getByText('Cambio de publicación registrado.', {
          exact: true,
        }),
      ).toBeVisible();
    };
    await decide('submit', 'Envío inicial del snapshot para revisión');
    await expect(
      ownerPage.getByRole('button', { name: 'Ver fotografía 1', exact: true }),
    ).toBeVisible();
    await expect(
      ownerPage.getByRole('button', { name: 'Guardar ficha', exact: true }),
    ).toHaveCount(0);
    let publication = await json<ApiResponse<'getManagedAdoptionPublication'>>(
      await context.request.get(endpoint + '/manage', { headers: owner }),
    );
    expect(publication.status).toBe('pending');
    expect(publication.snapshot).not.toHaveProperty('healthNotes');
    expect(publication.snapshot).not.toHaveProperty('microchip');
    expect((await context.request.get(endpoint)).status()).toBe(404);
    const photo = publication.snapshot?.photos[0];
    if (!photo) throw Error('Missing submitted photo');
    expect(
      (
        await context.request.get(endpoint + '/manage/photos/' + photo.mediaId)
      ).status(),
    ).toBe(401);
    expect(
      (
        await context.request.post(endpoint + '/review', {
          headers: owner,
          data: {
            approved: true,
            reason,
            expectedVersion: publication.version,
          },
        })
      ).status(),
    ).toBe(403);
    const reviewerPage = await reviewContext.newPage(),
      reviewerToken = await signIn(reviewerPage, 'camila@example.com'),
      reviewer = { Authorization: 'Bearer ' + reviewerToken };
    await reviewerPage.goto('/adopciones/revision');
    await reviewerPage
      .getByRole('link', { name: new RegExp('Nala busca familia Aurora') })
      .click();
    await expect(
      reviewerPage.getByRole('heading', {
        name: 'Perfil público capturado',
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      reviewerPage.getByText('CLINICAL-MUST-STAY-PRIVATE', { exact: true }),
    ).toHaveCount(0);
    await reviewerPage
      .getByRole('button', { name: 'Ver fotografía 1', exact: true })
      .click();
    await expect(
      reviewerPage.getByAltText(
        'Fotografía del snapshot de Nala busca familia Aurora',
      ),
    ).toBeVisible();
    const bytes = await context.request.get(
      endpoint + '/manage/photos/' + photo.mediaId,
      { headers: reviewer },
    );
    expect(bytes.status()).toBe(200);
    expect(bytes.headers()['cache-control']).toContain('no-store');
    expect(bytes.headers()['content-type']).toContain('image/jpeg');
    expect(
      (
        await context.request.get(
          endpoint + '/manage/photos/' + crypto.randomUUID(),
          { headers: reviewer },
        )
      ).status(),
    ).toBe(404);
    await accessible(reviewerPage);
    await reviewerPage
      .getByRole('heading', { name: 'Nala busca familia Aurora', exact: true })
      .click();
    await reviewerPage.evaluate(() => scrollTo(0, 0));
    await reviewerPage.screenshot({
      path: 'dist/test-results/admin/adoptions-review-desktop.png',
      fullPage: true,
    });
    await reviewerPage.setViewportSize({ width: 390, height: 844 });
    await accessible(reviewerPage);
    expect(
      await reviewerPage.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await reviewerPage.screenshot({
      path: 'dist/test-results/admin/adoptions-review-mobile.png',
      fullPage: true,
    });
    await reviewerPage
      .getByLabel('Acción de publicación')
      .selectOption('reject');
    await reviewerPage
      .getByLabel('Motivo de la decisión *', { exact: true })
      .fill('Es necesario concretar las condiciones públicas');
    await reviewerPage
      .getByLabel('Confirmo la decisión y sus efectos sobre la publicación')
      .check();
    await reviewerPage
      .getByRole('button', { name: 'Registrar decisión', exact: true })
      .click();
    await expect(
      reviewerPage.getByText(
        'Esta publicación ya no está pendiente de revisión.',
        { exact: true },
      ),
    ).toBeVisible();
    await ownerPage
      .getByRole('button', { name: 'Actualizar publicación', exact: true })
      .click();
    await expect(
      ownerPage.getByRole('button', { name: 'Guardar ficha', exact: true }),
    ).toBeVisible();
    await ownerPage
      .getByLabel('Condiciones de adopción *', { exact: true })
      .fill('Seguimiento mensual y hogar seguro para Nala.');
    await ownerPage
      .getByLabel('Motivo del registro o cambio *', { exact: true })
      .fill('Precisión de condiciones según revisión independiente');
    await ownerPage
      .getByLabel('Confirmo la ficha pública y el refugio seleccionado')
      .check();
    await ownerPage
      .getByRole('button', { name: 'Guardar ficha', exact: true })
      .click();
    await expect(
      ownerPage.getByLabel('Motivo del registro o cambio *', { exact: true }),
    ).toHaveValue('');
    await decide('submit', 'Reenvío de ficha corregida a revisión');
    await reviewerPage
      .getByRole('button', { name: 'Actualizar publicación', exact: true })
      .click();
    await expect(
      reviewerPage.getByRole('button', {
        name: 'Registrar decisión',
        exact: true,
      }),
    ).toBeVisible();
    await reviewerPage
      .getByLabel('Acción de publicación')
      .selectOption('approve');
    await reviewerPage
      .getByLabel('Motivo de la decisión *', { exact: true })
      .fill('Ficha y fotografías revisadas de forma independiente');
    await reviewerPage
      .getByLabel('Confirmo la decisión y sus efectos sobre la publicación')
      .check();
    await reviewerPage
      .getByRole('button', { name: 'Registrar decisión', exact: true })
      .click();
    await expect(
      reviewerPage.getByText(
        'Esta publicación ya no está pendiente de revisión.',
        { exact: true },
      ),
    ).toBeVisible();
    const publicListing = await json<ApiResponse<'getPublicAdoption'>>(
      await context.request.get(endpoint),
    );
    expect(publicListing.conditions).toBe(
      'Seguimiento mensual y hogar seguro para Nala.',
    );
    expect(JSON.stringify(publicListing)).not.toContain(
      'CLINICAL-MUST-STAY-PRIVATE',
    );
    const attachedAnimal = await json<ApiResponse<'getAnimal'>>(
      await context.request.get('/api/animals/' + animal.id, {
        headers: owner,
      }),
    );
    await json<ApiResponse<'removeAnimalPhoto'>>(
      await context.request.delete(
        '/api/animals/' + animal.id + '/photos/' + photo.mediaId,
        {
          headers: owner,
          data: {
            expectedVersion: attachedAnimal.version,
            reason: 'Retirada de fotografía del snapshot aprobado',
          },
        },
      ),
    );
    expect(
      (
        await context.request.get(
          endpoint + '/manage/photos/' + photo.mediaId,
          { headers: reviewer },
        )
      ).status(),
    ).toBe(404);
    expect((await context.request.get(endpoint)).status()).toBe(404);
    await ownerPage
      .getByRole('button', { name: 'Actualizar publicación', exact: true })
      .click();
    await expect(ownerPage.getByLabel('Acción de publicación')).toHaveValue(
      'pause',
    );
    await decide('pause', 'Pausa operativa de disponibilidad del refugio');
    await expect(ownerPage.getByLabel('Acción de publicación')).toHaveValue(
      'submit',
    );
    expect((await context.request.get(endpoint)).status()).toBe(404);
    publication = await json<ApiResponse<'getManagedAdoptionPublication'>>(
      await context.request.get(endpoint + '/manage', { headers: owner }),
    );
    await json<ApiResponse<'updateAdoptionPublication'>>(
      await context.request.patch(endpoint, {
        headers: owner,
        data: {
          profile: { city: 'Medellín' },
          reason: 'Actualización concurrente de localidad pública',
          expectedVersion: publication.version,
        },
      }),
    );
    await ownerPage
      .getByLabel('Motivo del registro o cambio *', { exact: true })
      .fill('Intento sobre versión anterior de publicación');
    await ownerPage
      .getByLabel('Confirmo la ficha pública y el refugio seleccionado')
      .check();
    await ownerPage
      .getByRole('button', { name: 'Guardar ficha', exact: true })
      .click();
    await expect(
      ownerPage.getByText(
        'Actualiza y revisa la publicación antes de continuar.',
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      ownerPage.getByRole('button', { name: 'Guardar ficha', exact: true }),
    ).toBeDisabled();
    await ownerPage
      .getByRole('button', { name: 'Actualizar publicación', exact: true })
      .click();
    await expect(ownerPage.getByLabel('Ciudad *', { exact: true })).toHaveValue(
      'Medellín',
    );
    await decide('archive', 'Archivo definitivo del borrador del refugio');
    await expect(
      ownerPage.getByText('Esta publicación es de solo lectura.', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      ownerPage.getByRole('button', { name: 'Guardar ficha', exact: true }),
    ).toHaveCount(0);
    await accessible(ownerPage);
    const audit = await json<ApiResponse<'listAdoptionAudit'>>(
      await context.request.get(endpoint + '/audit', { headers: owner }),
    );
    expect(audit.items.some((e) => e.action === 'publication.approved')).toBe(
      true,
    );
    expect(audit.items.some((e) => e.action === 'publication.deleted')).toBe(
      true,
    );
    expect(
      (
        await context.request.get(endpoint + '/audit', { headers: reviewer })
      ).status(),
    ).toBe(403);
    await resetIsolatedRates();
    await json<ApiResponse<'getOrganizationProfile'>>(
      await context.request.patch('/api/organizations/' + org.id + '/status', {
        headers,
        data: {
          status: 'suspended',
          reason: 'Suspensión para comprobar protección de publicaciones',
          expectedVersion: org.version,
        },
      }),
    );
    expect(
      (
        await context.request.get(
          endpoint + '/manage/photos/' + photo.mediaId,
          { headers: reviewer },
        )
      ).status(),
    ).toBe(404);
    await ownerPage.goto('/adopciones/' + org.id + '/' + id);
    await expect(
      ownerPage.getByRole('heading', {
        name: 'Nala busca familia Aurora',
        exact: true,
      }),
    ).toHaveCount(0);
  } finally {
    await ownerContext.close();
    await reviewContext.close();
  }
});
