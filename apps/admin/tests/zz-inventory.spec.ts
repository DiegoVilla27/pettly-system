import type { ApiRequest, ApiResponse } from '@pettly/api-client';
import {
  test,
  expect,
  type APIResponse,
  type Response,
} from '@playwright/test';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { signIn, accessible, resetIsolatedRates } from './helpers/identity';
const reason = 'Isolated inventory movement integration verification';
const password = 'A sufficiently long password!';
test('real scoped inventory, reserved-unit protection, concurrent versions, durable retries and immutable history', async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(180000);
  const token = await signIn(page, 'admin@example.com'),
    headers = { Authorization: 'Bearer ' + token };
  const json = async <T>(response: APIResponse | Response): Promise<T> => {
    expect(response.ok(), await response.text()).toBe(true);
    return (await response.json()) as T;
  };
  const customer = await json<ApiResponse<'login'>>(
    await context.request.post('/api/auth/login', {
      data: { email: 'customer@example.com', password, client: 'mobile' },
    }),
  );
  const owner = { Authorization: 'Bearer ' + customer.accessToken };
  const professional = await json<ApiResponse<'getCurrentUser'>>(
    await context.request.get('/api/users/me', { headers: owner }),
  );
  const admin = await json<ApiResponse<'getCurrentUser'>>(
    await context.request.get('/api/users/me', { headers }),
  );
  const createBusiness = async (name: string, responsibleUserId: string) => {
    let org = await json<ApiResponse<'createOrganization'>>(
      await context.request.post('/api/organizations', {
        headers,
        data: {
          name,
          type: 'business',
          reason,
          profile: {
            legalName: name + ' SAS',
            registrationNumber: name.endsWith('Segunda')
              ? '901987660'
              : '901987659',
            email: 'inventario@example.com',
            phone: '+573005556679',
            countryCode: 'CO',
            city: 'Bogotá',
            address: 'Calle de pruebas 102',
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
    return json<ApiResponse<'getOrganizationProfile'>>(
      await context.request.post('/api/organizations/' + org.id + '/approve', {
        headers,
        data: { reason, expectedVersion: org.version, responsibleUserId },
      }),
    );
  };
  const org = await createBusiness('Inventario Aurora', professional.id),
    otherOrg = await createBusiness('Inventario Segunda', admin.id);
  const category = await json<ApiResponse<'createProductCategory'>>(
    await context.request.post('/api/catalog/admin/categories', {
      headers,
      data: { name: 'Inventario Pruebas', slug: 'inventario-pruebas', reason },
    }),
  );
  let product = await json<ApiResponse<'createCatalogProduct'>>(
    await context.request.post('/api/catalog/admin/products', {
      headers: owner,
      data: {
        organizationId: org.id,
        profile: {
          name: 'Alimento Inventario Aurora',
          description: 'Alimento completo para mascotas adultas.',
          categoryId: category.id,
        },
        reason,
      },
    }),
  );
  const variants: ApiResponse<'createProductVariant'>['variant'][] = [];
  for (let i = 0; i < 11; i++) {
    const v = await json<ApiResponse<'createProductVariant'>>(
      await context.request.post(
        '/api/catalog/admin/products/' + product.id + '/variants',
        {
          headers: owner,
          data: {
            profile: {
              sku: 'INV-' + String(i).padStart(2, '0'),
              priceMinor: 100000,
            },
            expectedVersion: product.version,
            reason,
          },
        },
      ),
    );
    product = v.product;
    variants.push(v.variant);
  }
  const variant = variants[0];
  if (!variant) throw Error('Missing variant');
  const require = createRequire(resolve('apps/api/package.json'));
  const image: Buffer = await require('sharp')({
    create: { width: 100, height: 100, channels: 3, background: '#b7d4be' },
  })
    .png()
    .toBuffer();
  const photo = await json<ApiResponse<'uploadProductPhoto'>>(
    await context.request.post(
      '/api/catalog/admin/products/' + product.id + '/photos',
      {
        headers: owner,
        multipart: {
          file: { name: 'fixture.png', mimeType: 'image/png', buffer: image },
          reason,
          expectedVersion: String(product.version),
        },
      },
    ),
  );
  product = await json<ApiResponse<'submitCatalogProduct'>>(
    await context.request.post(
      '/api/catalog/admin/products/' + product.id + '/submit',
      {
        headers: owner,
        data: { reason, expectedVersion: photo.product.version },
      },
    ),
  );
  product = await json<ApiResponse<'reviewCatalogProduct'>>(
    await context.request.post(
      '/api/catalog/admin/products/' + product.id + '/review',
      {
        headers,
        data: { reason, expectedVersion: product.version, approved: true },
      },
    ),
  );
  const stockPath = '/api/inventory/variants/' + variant.id;
  await page.goto('/inventario');
  await page
    .getByRole('button', { name: 'Consultar existencias', exact: true })
    .click();
  await expect(page.getByLabel('Empresa del inventario')).toBeFocused();
  await page
    .getByLabel('Buscar empresa', { exact: true })
    .fill('Inventario Aurora');
  await expect(
    page
      .getByLabel('Empresa del inventario')
      .getByRole('option', { name: 'Inventario Aurora', exact: true }),
  ).toBeAttached();
  await page.getByLabel('Empresa del inventario').selectOption(org.id);
  await page.getByLabel('Buscar producto o SKU').fill('INV');
  await page.getByLabel('Variantes por página').selectOption('10');
  let reads = 0;
  page.on('request', (request) => {
    if (request.url().includes('/api/inventory/variants?')) reads++;
  });
  await page
    .getByRole('button', { name: 'Consultar existencias', exact: true })
    .click();
  await expect(
    page
      .getByRole('list', { name: 'Existencias por variante' })
      .getByRole('listitem'),
  ).toHaveCount(10);
  expect(reads).toBe(1);
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await expect(
    page
      .getByRole('list', { name: 'Existencias por variante' })
      .getByRole('listitem'),
  ).toHaveCount(1);
  await page.reload();
  await expect(page.getByLabel('Empresa del inventario')).toHaveValue(org.id);
  await expect(page.getByLabel('Buscar producto o SKU')).toHaveValue('INV');
  await accessible(page);
  await page.screenshot({
    path: 'tmp/admin-inventory-list.png',
    fullPage: true,
  });
  await page.goto('/inventario/' + org.id + '/variantes/' + variant.id);
  const balance = page.getByRole('region', {
    name: 'Existencias de la variante',
  });
  await expect(balance.locator('dd').nth(0)).toHaveText('0');
  await page
    .getByRole('button', { name: 'Confirmar movimiento', exact: true })
    .click();
  await expect(page.getByLabel('Tipo de movimiento')).toBeFocused();
  await page.getByLabel('Tipo de movimiento').selectOption('receipt');
  await page.getByLabel('Cantidad de unidades').fill('10');
  await page.getByLabel('Motivo del movimiento').fill(reason);
  const receipt = page.waitForResponse(
    (r) =>
      r.url().endsWith(stockPath + '/movements') &&
      r.request().method() === 'POST',
  );
  await page
    .getByRole('button', { name: 'Confirmar movimiento', exact: true })
    .click();
  const initial = await json<ApiResponse<'recordInventoryMovement'>>(
    await receipt,
  );
  await expect(balance.locator('dd').nth(0)).toHaveText('10');
  await expect(
    page
      .getByRole('list', { name: 'Movimientos de inventario' })
      .getByRole('heading', { name: 'Entrada', exact: true }),
  ).toBeVisible();
  const hold = await json<ApiResponse<'createInventoryHold'>>(
    await context.request.post(stockPath + '/holds', {
      headers: owner,
      data: {
        quantity: 7,
        expiresAt: new Date(Date.now() + 600000).toISOString(),
        referenceId: crypto.randomUUID(),
        expectedVersion: initial.stock.version,
        idempotencyKey: crypto.randomUUID(),
        reason,
      },
    }),
  );
  await page.getByLabel('Tipo de movimiento').selectOption('issue');
  await page.getByLabel('Cantidad de unidades').fill('4');
  await page.getByLabel('Motivo del movimiento').fill(reason);
  await page
    .getByRole('button', { name: 'Confirmar movimiento', exact: true })
    .click();
  await expect(
    page.getByText(
      'Las existencias cambiaron o la cantidad supera el saldo disponible.',
      { exact: false },
    ),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Actualizar inventario', exact: true })
    .click();
  await expect(balance.locator('dd').nth(1)).toHaveText('7');
  await expect(balance.locator('dd').nth(2)).toHaveText('3');
  await page.getByLabel('Tipo de movimiento').selectOption('issue');
  await page.getByLabel('Cantidad de unidades').fill('4');
  await page.getByLabel('Motivo del movimiento').fill(reason);
  await page
    .getByRole('button', { name: 'Confirmar movimiento', exact: true })
    .click();
  await expect(page.getByLabel('Cantidad de unidades')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await page.getByLabel('Cantidad de unidades').fill('2');
  await page
    .getByRole('button', { name: 'Confirmar movimiento', exact: true })
    .click();
  await expect(balance.locator('dd').nth(0)).toHaveText('8');
  await page.getByLabel('Tipo de movimiento').selectOption('adjustment');
  await page.getByLabel('Cantidad de unidades').fill('3');
  await page.getByLabel('Motivo del movimiento').fill(reason);
  await page
    .getByRole('button', { name: 'Confirmar movimiento', exact: true })
    .click();
  await expect(balance.locator('dd').nth(0)).toHaveText('11');
  // The real server commits; only its response is lost. No fabricated API response.
  const pattern = '**' + stockPath + '/movements';
  let original: ApiRequest<'recordInventoryMovement'> | null = null;
  await page.route(pattern, async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    original = route
      .request()
      .postDataJSON() as ApiRequest<'recordInventoryMovement'>;
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    await route.abort('failed');
    await page.unroute(pattern);
  });
  await page.getByLabel('Tipo de movimiento').selectOption('receipt');
  await page.getByLabel('Cantidad de unidades').fill('2');
  await page.getByLabel('Motivo del movimiento').fill(reason);
  await page
    .getByRole('button', { name: 'Confirmar movimiento', exact: true })
    .click();
  await expect(
    page.getByRole('heading', {
      name: 'Confirma la operación pendiente',
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Actualizar inventario', exact: true }),
  ).toBeDisabled();
  const retry = page.waitForResponse(
    (r) =>
      r.url().endsWith(stockPath + '/movements') &&
      r.request().method() === 'POST',
  );
  await page
    .getByRole('button', {
      name: 'Reintentar el mismo movimiento',
      exact: true,
    })
    .click();
  const recovered = await retry;
  expect(recovered.request().postDataJSON()).toEqual(original);
  await expect(balance.locator('dd').nth(0)).toHaveText('13');
  const movements = await json<ApiResponse<'listInventoryMovements'>>(
    await context.request.get(stockPath + '/movements', { headers: owner }),
  );
  expect(
    movements.items.filter(
      (m) =>
        m.idempotencyKey ===
        (original as ApiRequest<'recordInventoryMovement'> | null)
          ?.idempotencyKey,
    ),
  ).toHaveLength(1);
  const latest = await json<ApiResponse<'getManagedStock'>>(
    await context.request.get(stockPath, { headers: owner }),
  );
  const short = await json<ApiResponse<'createInventoryHold'>>(
    await context.request.post(stockPath + '/holds', {
      headers: owner,
      data: {
        quantity: 1,
        expiresAt: new Date(Date.now() + 1500).toISOString(),
        referenceId: crypto.randomUUID(),
        expectedVersion: latest.version,
        idempotencyKey: crypto.randomUUID(),
        reason,
      },
    }),
  );
  expect(short.stock.reserved).toBe(8);
  await expect
    .poll(
      async () => {
        const response = await context.request.get('/api/inventory/variants', {
          headers: owner,
          params: { organizationId: org.id, variantId: variant.id, limit: 1 },
        });
        const dto = await json<ApiResponse<'listManagedInventory'>>(response);
        return dto.items[0]?.stock.reserved;
      },
      { timeout: 15000 },
    )
    .toBe(7);
  await page
    .getByRole('button', { name: 'Actualizar inventario', exact: true })
    .click();
  await expect(
    page
      .getByRole('list', { name: 'Movimientos de inventario' })
      .getByRole('heading', { name: 'Vencimiento', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Sistema', { exact: true })).toBeVisible();
  await accessible(page);
  await page.screenshot({
    path: 'tmp/admin-inventory-detail.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await accessible(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'tmp/admin-inventory-mobile.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  const ownerContext = await browser.newContext({
    baseURL: process.env['ADMIN_TEST_URL'],
  });
  try {
    const ownerPage = await ownerContext.newPage();
    const ownerToken = await signIn(ownerPage, 'customer@example.com');
    const ownerHeaders = { Authorization: 'Bearer ' + ownerToken };
    await ownerPage.goto('/inventario?organizationId=' + org.id);
    await expect(ownerPage.getByLabel('Empresa del inventario')).toHaveValue(
      org.id,
    );
    await expect(
      ownerPage.getByLabel('Buscar empresa', { exact: true }),
    ).toHaveCount(0);
    await expect(
      ownerPage
        .getByRole('list', { name: 'Existencias por variante' })
        .getByRole('listitem'),
    ).toHaveCount(11);
    expect(
      (
        await ownerContext.request.get('/api/inventory/variants', {
          headers: ownerHeaders,
          params: { organizationId: otherOrg.id },
        })
      ).status(),
    ).toBe(403);
    await ownerPage.goto('/inventario?organizationId=' + otherOrg.id);
    await expect(ownerPage.getByRole('alert')).toBeVisible();
    await expect(
      ownerPage.getByRole('list', { name: 'Existencias por variante' }),
    ).toHaveCount(0);
  } finally {
    await ownerContext.close();
  }
  const moderatorContext = await browser.newContext({
    baseURL: process.env['ADMIN_TEST_URL'],
  });
  try {
    const moderatorPage = await moderatorContext.newPage();
    const moderator = await signIn(moderatorPage, 'camila@example.com');
    await moderatorPage.goto('/inventario');
    await expect(moderatorPage).toHaveURL(/\/inicio$/);
    expect(
      (
        await moderatorContext.request.get('/api/inventory/variants', {
          headers: { Authorization: 'Bearer ' + moderator },
          params: { organizationId: org.id },
        })
      ).status(),
    ).toBe(403);
  } finally {
    await moderatorContext.close();
  }
  await json<ApiResponse<'archiveProductVariant'>>(
    await context.request.delete(
      '/api/catalog/admin/products/' + product.id + '/variants/' + variant.id,
      { headers: owner, data: { expectedVersion: product.version, reason } },
    ),
  );
  await page
    .getByRole('button', { name: 'Actualizar inventario', exact: true })
    .click();
  await expect(
    page.getByText('Esta variante o su producto está archivado.', {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Confirmar movimiento', exact: true }),
  ).toHaveCount(0);
  await expect(balance.locator('dd').nth(0)).toHaveText('13');
  const stock = await json<ApiResponse<'getManagedStock'>>(
    await context.request.get(stockPath, { headers: owner }),
  );
  expect(
    (
      await context.request.post(stockPath + '/movements', {
        headers: owner,
        data: {
          kind: 'receipt',
          quantity: 1,
          reason,
          expectedVersion: stock.version,
          idempotencyKey: crypto.randomUUID(),
        },
      })
    ).status(),
  ).toBe(409);
  // Holds and all immutable history remain visible; no payment/consume operation is simulated.
  expect(
    (
      await context.request.get('/api/inventory/holds/' + hold.hold.id, {
        headers: owner,
      })
    ).status(),
  ).toBe(200);
  await json<ApiResponse<'getOrganizationProfile'>>(
    await context.request.patch('/api/organizations/' + org.id + '/status', {
      headers,
      data: { reason, expectedVersion: org.version, status: 'suspended' },
    }),
  );
  await page
    .getByRole('button', { name: 'Actualizar inventario', exact: true })
    .click();
  await expect(
    page.getByRole('heading', {
      name: 'Inventario no disponible',
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('list', { name: 'Movimientos de inventario' }),
  ).toHaveCount(0);
  expect(
    (
      await context.request.get('/api/inventory/variants', {
        headers,
        params: { organizationId: org.id },
      })
    ).status(),
  ).toBe(403);
  await resetIsolatedRates();
});
