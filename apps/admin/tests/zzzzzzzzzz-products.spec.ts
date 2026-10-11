import type { ApiResponse } from '@pettly/api-client';
import { test, expect, type APIResponse } from '@playwright/test';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { signIn, accessible } from './helpers/identity';
const reason = 'Isolated company product workflow verification';
test('company product creation, exact COP variants, private photos, independent review, revision and archive', async ({
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
  const login = await json<ApiResponse<'login'>>(
    await context.request.post('/api/auth/login', {
      data: {
        email: 'customer@example.com',
        password: 'A sufficiently long password!',
        client: 'mobile',
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
        name: 'Empresa Productos Aurora',
        type: 'business',
        reason,
        profile: {
          legalName: 'Productos Aurora SAS',
          registrationNumber: '901876461',
          email: 'productos@example.com',
          phone: '+573005556674',
          countryCode: 'CO',
          city: 'Bogotá',
          address: 'Calle de pruebas 110',
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
  const cats = await json<ApiResponse<'listPublicCategories'>>(
    await context.request.get('/api/catalog/categories'),
  );
  const category = cats.items[0];
  expect(category).toBeDefined();
  if (!category) throw new Error('Missing category fixture');
  const ownerContext = await browser.newContext(),
    p = await ownerContext.newPage();
  await signIn(p, 'customer@example.com');
  await p.goto('/productos/' + org.id + '/nuevo');
  await p
    .getByLabel('Nombre del producto *', { exact: true })
    .fill('Arnés Aurora');
  await p
    .getByLabel('Descripción del producto *', { exact: true })
    .fill('Arnés cómodo y regulable para paseos diarios');
  await p.getByLabel('Marca', { exact: true }).fill('Aurora');
  await p
    .getByLabel('Categoría del producto *', { exact: true })
    .selectOption(category.id);
  await p.getByLabel('Motivo de la ficha *', { exact: true }).fill(reason);
  await p.getByLabel('Confirmo la ficha y la empresa seleccionada').check();
  await p.getByRole('button', { name: 'Crear producto', exact: true }).click();
  await expect(p).toHaveURL(
    new RegExp('/productos/' + org.id + '/[a-f0-9-]+$'),
  );
  const productId = p.url().split('/').pop() as string;
  await p.getByLabel('SKU *', { exact: true }).fill('ARNES-AURORA-M');
  await p.getByLabel('Precio en COP *', { exact: true }).fill('19999,95');
  await p.getByRole('button', { name: 'Añadir atributo', exact: true }).click();
  await p.getByLabel('Clave 1', { exact: true }).fill('talla');
  await p.getByLabel('Valor 1', { exact: true }).fill('M');
  await p.getByLabel('Motivo de la variante *', { exact: true }).fill(reason);
  await p.getByLabel('Confirmo los datos y el precio de la variante').check();
  await p.getByRole('button', { name: 'Crear variante', exact: true }).click();
  await expect(
    p.getByRole('list', { name: 'Variantes del producto' }),
  ).toContainText('ARNES-AURORA-M');
  const get = async () =>
    json<ApiResponse<'getManagedProduct'>>(
      await context.request.get('/api/catalog/admin/products/' + productId, {
        headers: owner,
      }),
    );
  let detail = await get();
  expect(detail.variants[0]?.priceMinor).toBe(1999995);
  const require = createRequire(resolve('apps/api/package.json'));
  const png = await require('sharp')({
    create: { width: 100, height: 100, channels: 3, background: '#e0e9dc' },
  })
    .png()
    .toBuffer();
  const action = async (value: string) => {
    await p
      .getByLabel('Acción del producto', { exact: true })
      .selectOption(value);
    await p.getByLabel('Motivo de la acción *', { exact: true }).fill(reason);
  };
  const apply = async () => {
    await p
      .getByLabel('Confirmo la acción y sus efectos sobre el producto')
      .check();
    const response = p.waitForResponse(
      (r) =>
        r.request().method() !== 'GET' &&
        r.url().includes('/catalog/admin/products/' + productId),
    );
    await p
      .getByRole('button', {
        name: 'Registrar acción del producto',
        exact: true,
      })
      .click();
    expect((await response).ok()).toBe(true);
    await expect(
      p
        .getByRole('status')
        .filter({ hasText: 'Cambio del producto registrado.' }),
    ).toBeVisible();
  };
  await action('upload');
  await p
    .getByLabel('Fotografía del producto *', { exact: true })
    .setInputFiles({ name: 'arnes.png', mimeType: 'image/png', buffer: png });
  await apply();
  detail = await get();
  expect(detail.photos).toHaveLength(1);
  expect(
    (
      await context.request.get(
        '/api/catalog/admin/products/' +
          productId +
          '/photos/' +
          detail.photos[0]?.mediaId,
      )
    ).status(),
  ).toBe(401);
  await p
    .getByRole('button', { name: 'Ver fotografía 1', exact: true })
    .click();
  await expect(
    p.getByRole('img', { name: 'Fotografía de Arnés Aurora' }),
  ).toBeVisible();
  await accessible(p);
  await action('submit');
  await apply();
  await expect(
    p.getByText('El producto está en revisión.', { exact: false }),
  ).toBeVisible();
  detail = await get();
  expect(
    (
      await context.request.post(
        '/api/catalog/admin/products/' + productId + '/review',
        {
          headers: owner,
          data: {
            approved: true,
            reason,
            expectedVersion: detail.product.version,
          },
        },
      )
    ).status(),
  ).toBe(403);
  const reviewer = await json<ApiResponse<'login'>>(
    await context.request.post('/api/auth/login', {
      data: {
        email: 'camila@example.com',
        password: 'A sufficiently long password!',
        client: 'mobile',
      },
    }),
  );
  await json<ApiResponse<'reviewCatalogProduct'>>(
    await context.request.post(
      '/api/catalog/admin/products/' + productId + '/review',
      {
        headers: { Authorization: 'Bearer ' + reviewer.accessToken },
        data: {
          approved: true,
          reason,
          expectedVersion: detail.product.version,
        },
      },
    ),
  );
  await p
    .getByRole('button', { name: 'Actualizar producto', exact: true })
    .click();
  await expect(p.getByText('Publicado ·', { exact: false })).toBeVisible();
  await p
    .getByLabel('Nombre del producto *', { exact: true })
    .fill('Arnés Aurora revisado');
  await p.getByLabel('Motivo de la ficha *', { exact: true }).fill(reason);
  await p.getByLabel('Confirmo la ficha y la empresa seleccionada').check();
  await p
    .getByRole('button', { name: 'Guardar ficha del producto', exact: true })
    .click();
  await expect(
    p.getByRole('heading', { name: 'Arnés Aurora revisado', exact: true }),
  ).toBeVisible();
  detail = await get();
  expect(detail.product.status).toBe('draft');
  await expect(
    p.getByRole('list', { name: 'Historial del producto' }),
  ).toContainText('Revisión registrada');
  await expect(p.getByRole('alert')).toHaveCount(0);
  await p.setViewportSize({ width: 390, height: 844 });
  await accessible(p);
  expect(
    await p.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await p.screenshot({
    path: 'dist/test-results/admin/products-mobile.png',
    fullPage: true,
  });
  await action('variant-archive');
  await p
    .getByLabel('Variante que se archivará *', { exact: true })
    .selectOption(detail.variants[0]?.id ?? '');
  await apply();
  await action('archive');
  await apply();
  await expect(
    p.getByText('Este producto está archivado y es de solo lectura.', {
      exact: true,
    }),
  ).toBeVisible();
  detail = await get();
  expect(detail.product.status).toBe('archived');
  expect(detail.variants[0]?.status).toBe('archived');
  expect(detail.variants[0]?.sku).toBe('ARNES-AURORA-M');
  await expect(
    p.getByRole('heading', { name: 'Historial del producto', exact: true }),
  ).toBeVisible();
  await expect(
    p.getByLabel('Nombre del producto *', { exact: true }),
  ).toHaveCount(0);
  await expect(
    p.getByRole('list', { name: 'Historial del producto' }),
  ).toContainText('Producto archivado');
  await expect(p.getByRole('alert')).toHaveCount(0);
  await ownerContext.close();
});
