import type { ApiResponse } from '@pettly/api-client';
import { test, expect, type APIResponse } from '@playwright/test';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { signIn, accessible, resetIsolatedRates } from './helpers/identity';
const reason = 'Isolated adoption publication workflow verification';
test('shelter request consent, contact privacy, decisions, conflict, actual handover, uncertain response and atomic closure', async ({
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
        name: 'Refugio Solicitudes Aurora',
        type: 'adoption_entity',
        reason,
        profile: {
          legalName: 'Fundación Solicitudes Aurora',
          registrationNumber: '901876460',
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
          name: 'Nala Solicitudes',
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

  const reviewerLogin = await json<ApiResponse<'login'>>(
    await context.request.post('/api/auth/login', {
      data: {
        email: 'camila@example.com',
        password: 'A sufficiently long password!',
        client: 'mobile',
      },
    }),
  );
  const reviewer = { Authorization: 'Bearer ' + reviewerLogin.accessToken };
  for (const h of [headers, reviewer])
    await json<ApiResponse<'updateCurrentUser'>>(
      await context.request.patch('/api/users/me', {
        headers: h,
        data: { phone: '+573004445566', countryCode: 'CO', city: 'Bogotá' },
      }),
    );
  let publication = await json<ApiResponse<'createAdoptionPublication'>>(
    await context.request.post('/api/adoptions/publications', {
      headers: owner,
      data: {
        animalId: animal.id,
        reason,
        profile: {
          title: 'Nala Solicitudes busca hogar',
          description: 'Compañera tranquila para un hogar responsable.',
          conditions: 'Hogar seguro con seguimiento del refugio.',
          countryCode: 'CO',
          city: 'Bogotá',
        },
      },
    }),
  );
  const endpoint = '/api/adoptions/publications/' + publication.id;
  const publish = async () => {
    publication = await json<ApiResponse<'submitAdoptionPublication'>>(
      await context.request.post(endpoint + '/submit', {
        headers: owner,
        data: { reason, expectedVersion: publication.version },
      }),
    );
    publication = await json<ApiResponse<'reviewAdoptionPublication'>>(
      await context.request.post(endpoint + '/review', {
        headers: reviewer,
        data: { reason, approved: true, expectedVersion: publication.version },
      }),
    );
  };
  await publish();
  const apply = async (h: Record<string, string>) =>
    json<ApiResponse<'submitAdoptionRequest'>>(
      await context.request.post(endpoint + '/requests', {
        headers: h,
        data: {
          message: 'Tengo un hogar seguro y quiero adoptar responsablemente.',
          consent: true,
          expectedPublicationVersion: publication.version,
        },
      }),
    );
  const old = await apply(headers),
    competitor = await apply(reviewer);
  const ownerContext = await browser.newContext();
  try {
    const ownerPage = await ownerContext.newPage();
    await signIn(ownerPage, 'customer@example.com');
    const base = '/adopciones/' + org.id + '/' + publication.id;
    await ownerPage.goto(base);
    await ownerPage
      .getByRole('link', { name: 'Gestionar solicitudes', exact: true })
      .click();
    await expect(
      ownerPage.getByRole('heading', {
        name: 'Solicitudes de adopción',
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      ownerPage
        .getByRole('list', { name: 'Solicitudes de adopción' })
        .getByRole('link'),
    ).toHaveCount(2);
    const listed = await json<ApiResponse<'listShelterAdoptionRequests'>>(
      await context.request.get(endpoint + '/requests', { headers: owner }),
    );
    expect(listed.items.every((x) => !('contact' in x))).toBe(true);
    expect(
      (
        await context.request.get('/api/adoptions/requests/' + old.id, {
          headers: reviewer,
        })
      ).status(),
    ).toBe(403);
    await accessible(ownerPage);
    await ownerPage.goto(base + '/solicitudes/' + old.id);
    await expect(
      ownerPage.getByRole('heading', { name: 'Contacto privado autorizado' }),
    ).toBeVisible();
    await expect(
      ownerPage.getByText('admin@example.com', { exact: true }),
    ).toBeVisible();
    expect(await ownerPage.locator('main').innerText()).not.toContain(
      'CLINICAL-MUST-STAY-PRIVATE',
    );
    await page.goto(base + '/solicitudes/' + old.id);
    await expect(
      page.getByRole('heading', { name: 'Contacto privado autorizado' }),
    ).toBeVisible();
    await expect(page.getByLabel('Acción de solicitud')).toHaveCount(0);
    await ownerPage.setViewportSize({ width: 390, height: 844 });
    await accessible(ownerPage);
    expect(
      await ownerPage.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await ownerPage.screenshot({
      path: 'dist/test-results/admin/adoption-request-mobile.png',
      fullPage: true,
    });
    await ownerPage.setViewportSize({ width: 1280, height: 900 });
    await ownerPage.screenshot({
      path: 'dist/test-results/admin/adoption-request-desktop.png',
      fullPage: true,
    });
    publication = await json<ApiResponse<'updateAdoptionPublication'>>(
      await context.request.patch(endpoint, {
        headers: owner,
        data: {
          profile: {
            conditions: 'Hogar seguro con seguimiento mensual actualizado.',
          },
          reason,
          expectedVersion: publication.version,
        },
      }),
    );
    await publish();
    await ownerPage
      .getByRole('button', { name: 'Actualizar solicitud', exact: true })
      .click();
    await expect(
      ownerPage.getByText(/Las condiciones cambiaron/),
    ).toBeVisible();
    await expect(ownerPage.getByLabel('Acción de solicitud')).toHaveValue(
      'rejected',
    );
    const decide = async (action: string, note: string) => {
      await ownerPage.getByLabel('Acción de solicitud').selectOption(action);
      await ownerPage
        .getByLabel('Motivo de la decisión *', { exact: true })
        .fill(note);
      await ownerPage
        .getByLabel('Confirmo la decisión sobre esta solicitud', {
          exact: true,
        })
        .check();
      const response = ownerPage.waitForResponse(
        (r) =>
          r
            .url()
            .endsWith(
              '/api/adoptions/requests/' +
                ownerPage.url().split('/').at(-1) +
                '/review',
            ) && r.request().method() === 'PATCH',
      );
      await ownerPage
        .getByRole('button', {
          name: 'Registrar decisión de solicitud',
          exact: true,
        })
        .click();
      expect((await response).ok()).toBe(true);
      await expect(
        ownerPage.getByText('Decisión de solicitud registrada.', {
          exact: true,
        }),
      ).toBeVisible();
    };
    await decide(
      'rejected',
      'Cierre de solicitud por renovación de consentimiento',
    );
    await expect(ownerPage.getByLabel('Acción de solicitud')).toHaveCount(0);
    const current = await apply(headers);
    await ownerPage.goto(base + '/solicitudes/' + current.id);
    await expect(ownerPage.getByLabel('Acción de solicitud')).toHaveValue(
      'in_review',
    );
    await json<ApiResponse<'reviewAdoptionRequest'>>(
      await context.request.patch(
        '/api/adoptions/requests/' + current.id + '/review',
        {
          headers: owner,
          data: {
            status: 'in_review',
            reason,
            expectedVersion: current.version,
          },
        },
      ),
    );
    await ownerPage.getByLabel('Acción de solicitud').selectOption('approved');
    await ownerPage
      .getByLabel('Motivo de la decisión *', { exact: true })
      .fill(reason);
    await ownerPage
      .getByLabel('Confirmo la decisión sobre esta solicitud', { exact: true })
      .check();
    await ownerPage
      .getByRole('button', {
        name: 'Registrar decisión de solicitud',
        exact: true,
      })
      .click();
    await expect(
      ownerPage.getByText(
        'Actualiza y revisa la solicitud y el historial antes de continuar.',
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      ownerPage.getByRole('button', {
        name: 'Registrar decisión de solicitud',
        exact: true,
      }),
    ).toBeDisabled();
    await ownerPage
      .getByRole('button', { name: 'Actualizar solicitud', exact: true })
      .click();
    await expect(ownerPage.getByLabel('Acción de solicitud')).toHaveValue(
      'approved',
    );
    await decide(
      'approved',
      'Solicitante seleccionado tras revisión del refugio',
    );
    const before = await json<ApiResponse<'getAnimal'>>(
      await context.request.get('/api/animals/' + animal.id, {
        headers: owner,
      }),
    );
    expect(before.status).toBe('active');
    await ownerPage.getByLabel('Acción de solicitud').selectOption('complete');
    await ownerPage
      .getByLabel('Motivo de la decisión *', { exact: true })
      .fill('Entrega física confirmada por el refugio responsable');
    await ownerPage
      .getByRole('button', { name: 'Confirmar entrega', exact: true })
      .click();
    await expect(
      ownerPage.getByText(
        'Confirma la acción y sus efectos antes de continuar.',
        { exact: true },
      ),
    ).toBeVisible();
    await ownerPage
      .getByLabel(
        'Confirmo que el animal ya fue entregado al solicitante aprobado',
        { exact: true },
      )
      .check();
    await accessible(ownerPage);
    let committed = false;
    const pattern = '**/api/adoptions/requests/' + current.id + '/complete';
    await ownerPage.route(pattern, async (route) => {
      const response = await route.fetch();
      expect(response.ok()).toBe(true);
      committed = true;
      await route.abort('failed');
    });
    await ownerPage
      .getByRole('button', { name: 'Confirmar entrega', exact: true })
      .click();
    await expect(ownerPage.getByText(/El resultado es incierto/)).toBeVisible();
    expect(committed).toBe(true);
    await expect(
      ownerPage.getByRole('button', { name: 'Confirmar entrega', exact: true }),
    ).toBeDisabled();
    await ownerPage.unroute(pattern);
    await ownerPage
      .getByRole('button', { name: 'Actualizar solicitud', exact: true })
      .click();
    await expect(ownerPage.getByText(/Entrega confirmada el/)).toBeVisible();
    await expect(ownerPage.getByLabel('Acción de solicitud')).toHaveCount(0);
    const adopted = await json<ApiResponse<'getAnimal'>>(
      await context.request.get('/api/animals/' + animal.id, {
        headers: owner,
      }),
    );
    expect(adopted.status).toBe('adopted');
    const closed = await json<ApiResponse<'getManagedAdoptionPublication'>>(
      await context.request.get(endpoint + '/manage', { headers: owner }),
    );
    expect(closed.status).toBe('closed');
    const other = await json<ApiResponse<'getAdoptionRequest'>>(
      await context.request.get('/api/adoptions/requests/' + competitor.id, {
        headers: owner,
      }),
    );
    expect(other.status).toBe('closed');
    expect((await context.request.get(endpoint)).status()).toBe(404);
    const audit = await json<ApiResponse<'listAdoptionAudit'>>(
      await context.request.get(endpoint + '/audit', { headers: owner }),
    );
    expect(
      audit.items.filter(
        (x) => x.action === 'request.completed' && x.requestId === current.id,
      ),
    ).toHaveLength(1);
    await expect(
      ownerPage
        .getByRole('list', { name: 'Historial de adopción' })
        .getByText('Entrega confirmada', { exact: true }),
    ).toBeVisible();
    await accessible(ownerPage);
    await ownerPage.goto(base + '/solicitudes?status=closed&limit=10');
    await expect(
      ownerPage
        .getByRole('list', { name: 'Solicitudes de adopción' })
        .getByRole('link'),
    ).toHaveCount(1);
    await ownerPage.goto(base + '/solicitudes/' + current.id);
    await expect(
      ownerPage.getByRole('heading', { name: 'Contacto privado autorizado' }),
    ).toBeVisible();
    await json<ApiResponse<'getOrganizationProfile'>>(
      await context.request.patch('/api/organizations/' + org.id + '/status', {
        headers,
        data: { status: 'suspended', reason, expectedVersion: org.version },
      }),
    );
    await ownerPage
      .getByRole('button', { name: 'Actualizar solicitud', exact: true })
      .click();
    await expect(ownerPage.getByRole('alert')).toBeVisible();
    await expect(
      ownerPage.getByRole('heading', { name: 'Contacto privado autorizado' }),
    ).toHaveCount(0);
    await ownerPage.goto(base + '/solicitudes/' + current.id);
    await expect(ownerPage).toHaveURL(/\/inicio$/);
  } finally {
    await ownerContext.close();
    await resetIsolatedRates();
  }
});
