import { retainedResponse } from './helpers/responses';
import type { ApiResponse } from '@pettly/api-client';
import {
  test,
  expect,
  type APIResponse,
  type Response,
} from '@playwright/test';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { signIn, accessible, resetIsolatedRates } from './helpers/identity';
const reason = 'Isolated catalog moderation integration verification';
// Runs after the user-management scenario that provisions the moderator account.
test('real category management and independent product moderation preserve private media, versions and eligibility', async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(180000);
  const token = await signIn(page, 'admin@example.com');
  const headers = { Authorization: 'Bearer ' + token };
  const json = async <T>(response: APIResponse | Response): Promise<T> => {
    response = retainedResponse(response);
    expect(response.ok(), await response.text()).toBe(true);
    return (await response.json()) as T;
  };
  await page.goto('/catalogo/categorias');
  await page
    .getByRole('link', { name: 'Crear categoría', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Crear categoría', exact: true })
    .click();
  await expect(
    page.getByLabel('Nombre de categoría', { exact: true }),
  ).toBeFocused();
  await page
    .getByLabel('Nombre de categoría', { exact: true })
    .fill('Alimentos Aurora');
  await page
    .getByLabel('Identificador de categoría', { exact: true })
    .fill('alimentos-aurora');
  await page
    .getByLabel('Descripción de categoría', { exact: true })
    .fill('Alimentos para animales de compañía');
  await page.getByLabel('Motivo del cambio de categoría').fill(reason);
  await accessible(page);
  const created = page.waitForResponse(
    (r) =>
      r.url().endsWith('/api/catalog/admin/categories') &&
      r.request().method() === 'POST',
  );
  await page
    .getByRole('button', { name: 'Crear categoría', exact: true })
    .click();
  let category = await json<ApiResponse<'createProductCategory'>>(
    await created,
  );
  await expect(
    page.getByRole('heading', { name: 'Alimentos Aurora', exact: true }),
  ).toBeVisible();
  // The form still holds version 1 while another actor updates the record.
  category = await json<ApiResponse<'updateProductCategory'>>(
    await context.request.patch(
      '/api/catalog/admin/categories/' + category.id,
      {
        headers,
        data: {
          profile: { description: null },
          reason,
          expectedVersion: category.version,
        },
      },
    ),
  );
  await page
    .getByLabel('Nombre de categoría', { exact: true })
    .fill('Alimentos Aurora Revisados');
  await page.getByLabel('Motivo del cambio de categoría').fill(reason);
  await page
    .getByRole('button', { name: 'Guardar categoría', exact: true })
    .click();
  await expect(
    page.getByText('La categoría cambió o el identificador ya existe.', {
      exact: false,
    }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Actualizar categoría', exact: true })
    .click();
  await expect(
    page.getByLabel('Descripción de categoría', { exact: true }),
  ).toHaveValue('');
  await page
    .getByLabel('Nombre de categoría', { exact: true })
    .fill('Alimentos Aurora Revisados');
  await page.getByLabel('Motivo del cambio de categoría').fill(reason);
  const updated = page.waitForResponse(
    (r) =>
      r.url().endsWith('/categories/' + category.id) &&
      r.request().method() === 'PATCH',
  );
  await page
    .getByRole('button', { name: 'Guardar categoría', exact: true })
    .click();
  category = await json<ApiResponse<'updateProductCategory'>>(await updated);
  await expect(
    page.getByRole('heading', { name: category.name, exact: true }),
  ).toBeVisible();
  await page
    .getByRole('link', { name: 'Auditoría de categoría', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Categoría creada', exact: true }),
  ).toBeVisible();
  await accessible(page);
  await page.screenshot({
    path: 'tmp/admin-category-audit.png',
    fullPage: true,
  });
  const login = await json<ApiResponse<'login'>>(
    await context.request.post('/api/auth/login', {
      data: {
        client: 'mobile',
        email: 'customer@example.com',
        password: 'A sufficiently long password!',
      },
    }),
  );
  const owner = { Authorization: 'Bearer ' + login.accessToken };
  const user = await json<ApiResponse<'getCurrentUser'>>(
    await context.request.get('/api/users/me', { headers: owner }),
  );
  let org = await json<ApiResponse<'createOrganization'>>(
    await context.request.post('/api/organizations', {
      headers,
      data: {
        name: 'Empresa Catálogo Aurora',
        type: 'business',
        reason,
        profile: {
          legalName: 'Catálogo Aurora SAS',
          registrationNumber: '901987658',
          email: 'catalogo@example.com',
          phone: '+573005556678',
          countryCode: 'CO',
          city: 'Bogotá',
          address: 'Calle de pruebas 101',
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
  const require = createRequire(resolve('apps/api/package.json'));
  const image: Buffer = await require('sharp')({
    create: { width: 120, height: 120, channels: 3, background: '#b7d4be' },
  })
    .png()
    .toBuffer();
  const products: ApiResponse<'reviewCatalogProduct'>[] = [];
  for (let i = 0; i < 12; i++) {
    await resetIsolatedRates();
    let p = await json<ApiResponse<'createCatalogProduct'>>(
      await context.request.post('/api/catalog/admin/products', {
        headers: owner,
        data: {
          organizationId: org.id,
          profile: {
            name: 'Alimento Aurora ' + String(i).padStart(2, '0'),
            description: 'Alimento completo para perros adultos.',
            brand: 'Aurora',
            categoryId: category.id,
          },
          currency: 'COP',
          reason,
        },
      }),
    );
    const variant = await json<ApiResponse<'createProductVariant'>>(
      await context.request.post(
        '/api/catalog/admin/products/' + p.id + '/variants',
        {
          headers: owner,
          data: {
            profile: {
              sku: 'AURORA-' + i,
              priceMinor: 1250000,
              attributes: { size: 'small' },
            },
            reason,
            expectedVersion: p.version,
          },
        },
      ),
    );
    const uploaded = await json<ApiResponse<'uploadProductPhoto'>>(
      await context.request.post(
        '/api/catalog/admin/products/' + p.id + '/photos',
        {
          headers: owner,
          multipart: {
            file: { name: 'fixture.png', mimeType: 'image/png', buffer: image },
            reason,
            expectedVersion: String(variant.product.version),
          },
        },
      ),
    );
    p = await json<ApiResponse<'submitCatalogProduct'>>(
      await context.request.post(
        '/api/catalog/admin/products/' + p.id + '/submit',
        {
          headers: owner,
          data: { reason, expectedVersion: uploaded.product.version },
        },
      ),
    );
    products.push(p);
  }
  const product = products[0];
  if (!product) throw Error('Missing fixture');
  const previewPath = '/api/catalog/admin/moderation/products/' + product.id;
  expect(
    (await context.request.get(previewPath, { headers: owner })).status(),
  ).toBe(403);
  const admin = await json<ApiResponse<'getCurrentUser'>>(
    await context.request.get('/api/users/me', { headers }),
  );
  expect(
    (
      await context.request.put(
        '/api/organizations/' + org.id + '/members/' + admin.id + '/role',
        { headers, data: { role: 'business_operator', reason } },
      )
    ).ok(),
  ).toBe(true);
  expect((await context.request.get(previewPath, { headers })).status()).toBe(
    403,
  );
  expect(
    (
      await context.request.post(
        '/api/catalog/admin/products/' + product.id + '/review',
        {
          headers,
          data: { approved: true, reason, expectedVersion: product.version },
        },
      )
    ).status(),
  ).toBe(403);
  await page.goto('/catalogo/productos/' + product.id);
  await expect(
    page.getByRole('heading', {
      name: 'Producto no disponible para revisión',
      exact: true,
    }),
  ).toBeVisible();
  expect(
    (
      await context.request.delete(
        '/api/organizations/' + org.id + '/members/' + admin.id + '/role',
        { headers, data: { reason } },
      )
    ).ok(),
  ).toBe(true);
  await page.goto('/catalogo');
  await page
    .getByLabel('Buscar productos', { exact: true })
    .fill('Alimento Aurora');
  await page.getByLabel('ID de empresa', { exact: true }).fill(org.id);
  await page.getByLabel('ID de categoría', { exact: true }).fill(category.id);
  await page.getByLabel('Productos por página').selectOption('10');
  await page
    .getByRole('button', { name: 'Buscar productos pendientes', exact: true })
    .click();
  await expect(
    page
      .getByRole('list', { name: 'Productos pendientes' })
      .getByRole('listitem'),
  ).toHaveCount(10);
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await expect(
    page
      .getByRole('list', { name: 'Productos pendientes' })
      .getByRole('listitem'),
  ).toHaveCount(2);
  await page.reload();
  await expect(
    page.getByLabel('Buscar productos', { exact: true }),
  ).toHaveValue('Alimento Aurora');
  await expect(page.getByLabel('ID de empresa', { exact: true })).toHaveValue(
    org.id,
  );
  await accessible(page);
  await page.screenshot({
    path: 'tmp/admin-catalog-queue.png',
    fullPage: true,
  });
  await page.goto('/catalogo/productos/' + product.id);
  await expect(
    page.getByRole('heading', { name: product.name, exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/COP.*12[.,]500[.,]00/)).toBeVisible();
  const detail = await json<ApiResponse<'getProductReviewPreview'>>(
    await context.request.get(previewPath, { headers }),
  );
  const mediaId = detail.photos[0]?.mediaId;
  if (!mediaId) throw Error('Missing photo');
  const photo = page.waitForResponse((r) =>
    r.url().endsWith('/photos/' + mediaId),
  );
  await page
    .getByRole('button', { name: 'Ver fotografía 1', exact: true })
    .click();
  const photoResponse = await photo;
  expect(photoResponse.headers()['cache-control']).toContain('no-store');
  expect(photoResponse.headers()['content-type']).toContain('image/jpeg');
  await expect(
    page.getByRole('img', {
      name: 'Fotografía de ' + product.name,
      exact: true,
    }),
  ).toBeVisible();
  expect(
    (
      await context.request.get(previewPath + '/photos/' + category.id, {
        headers,
      })
    ).status(),
  ).toBe(404);
  await accessible(page);
  await page.screenshot({
    path: 'tmp/admin-product-review.png',
    fullPage: true,
  });
  await page
    .getByRole('button', { name: 'Cerrar fotografía', exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await accessible(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 });
  const moderatorContext = await browser.newContext({
    baseURL: process.env['ADMIN_TEST_URL'],
  });
  const moderatorPage = await moderatorContext.newPage();
  try {
    const moderatorToken = await signIn(moderatorPage, 'camila@example.com');
    const reviewer = { Authorization: 'Bearer ' + moderatorToken };
    expect(
      (
        await moderatorContext.request.get('/api/catalog/admin/categories', {
          headers: reviewer,
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await moderatorContext.request.get(
          '/api/catalog/admin/products/' + product.id,
          { headers: reviewer },
        )
      ).status(),
    ).toBe(403);
    await moderatorPage.goto('/catalogo/productos/' + product.id);
    await expect(
      moderatorPage.getByRole('heading', { name: product.name, exact: true }),
    ).toBeVisible();
    await moderatorPage
      .getByRole('button', { name: 'Ver fotografía 1', exact: true })
      .click();
    await expect(
      moderatorPage.getByRole('img', {
        name: 'Fotografía de ' + product.name,
        exact: true,
      }),
    ).toBeVisible();
    // Another authorized reviewer rejects, then the owner resubmits. The open UI is stale.
    let changed = await json<ApiResponse<'reviewCatalogProduct'>>(
      await moderatorContext.request.post(
        '/api/catalog/admin/products/' + product.id + '/review',
        {
          headers: reviewer,
          data: { approved: false, reason, expectedVersion: product.version },
        },
      ),
    );
    changed = await json<ApiResponse<'submitCatalogProduct'>>(
      await context.request.post(
        '/api/catalog/admin/products/' + product.id + '/submit',
        { headers: owner, data: { reason, expectedVersion: changed.version } },
      ),
    );
    await page.getByLabel('Decisión de producto').selectOption('approve');
    await page.getByLabel('Motivo de revisión de producto').fill(reason);
    await page
      .getByRole('button', {
        name: 'Registrar revisión de producto',
        exact: true,
      })
      .click();
    await expect(
      page.getByText('El producto cambió o ya no cumple los requisitos.', {
        exact: false,
      }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Actualizar producto', exact: true })
      .click();
    await expect(
      page.getByText('Pendiente · Versión ' + changed.version + ' · COP', {
        exact: false,
      }),
    ).toBeVisible();
    await page.getByLabel('Decisión de producto').selectOption('approve');
    await page.getByLabel('Motivo de revisión de producto').fill(reason);
    await page
      .getByRole('button', {
        name: 'Registrar revisión de producto',
        exact: true,
      })
      .click();
    await expect(
      page.getByText('Decisión registrada: Publicado.', { exact: false }),
    ).toBeVisible();
    expect(
      (
        await context.request.get(previewPath + '/photos/' + mediaId, {
          headers,
        })
      ).status(),
    ).toBe(409);
    expect(
      (
        await context.request.get('/api/catalog/products/' + product.id)
      ).status(),
    ).toBe(200);
    // An actual moderator can complete the same UI workflow independently.
    const second = products[1];
    if (!second) throw Error('Missing second fixture');
    await moderatorPage.goto('/catalogo/productos/' + second.id);
    await expect(
      moderatorPage.getByRole('heading', { name: second.name, exact: true }),
    ).toBeVisible();
    await moderatorPage
      .getByLabel('Decisión de producto')
      .selectOption('reject');
    await moderatorPage
      .getByLabel('Motivo de revisión de producto')
      .fill(reason);
    await moderatorPage
      .getByRole('button', {
        name: 'Registrar revisión de producto',
        exact: true,
      })
      .click();
    await expect(
      moderatorPage.getByText('Decisión registrada: Rechazado.', {
        exact: false,
      }),
    ).toBeVisible();
    await moderatorPage.goto('/catalogo/categorias');
    await expect(moderatorPage).toHaveURL(/\/inicio$/);
  } finally {
    await moderatorContext.close();
  }
  await page.goto('/catalogo/categorias/' + category.id);
  await page.getByLabel('Estado de categoría').selectOption('inactive');
  await page.getByLabel('Motivo del cambio de categoría').fill(reason);
  await page
    .getByRole('button', { name: 'Guardar categoría', exact: true })
    .click();
  await expect(
    page.getByText('Categoría actualizada.', { exact: true }),
  ).toBeVisible();
  expect(
    (await context.request.get('/api/catalog/products/' + product.id)).status(),
  ).toBe(404);
  await page.getByLabel('Estado de categoría').selectOption('active');
  await page.getByLabel('Motivo del cambio de categoría').fill(reason);
  await page
    .getByRole('button', { name: 'Guardar categoría', exact: true })
    .click();
  await expect
    .poll(async () =>
      (
        await context.request.get('/api/catalog/products/' + product.id)
      ).status(),
    )
    .toBe(200);
  await page.goto('/catalogo/categorias');
  await page.getByLabel('Buscar categorías', { exact: true }).fill('Aurora');
  await expect(
    page
      .getByRole('list', { name: 'Resultados de categorías' })
      .getByRole('listitem'),
  ).toHaveCount(1);
});
