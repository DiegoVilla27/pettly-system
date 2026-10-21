import { retainedResponse } from './helpers/responses';
import type { ApiResponse } from '@pettly/api-client';
import {
  test,
  expect,
  type APIResponse,
  type Response,
  type Page,
} from '@playwright/test';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { signIn, accessible, resetIsolatedRates } from './helpers/identity';
const reason = 'Isolated order fulfillment workflow verification';
const password = 'A sufficiently long password!';
async function fillDecision(page: Page, action: string) {
  await page
    .getByLabel('Acción de pedido', { exact: true })
    .selectOption(action);
  await page
    .getByLabel('Motivo de la decisión de pedido', { exact: true })
    .fill(reason);
  await page
    .getByLabel('Confirmo la acción seleccionada y sus efectos')
    .check();
}
async function decide(page: Page, action: string) {
  await fillDecision(page, action);
  const r = page.waitForResponse(
    (r) =>
      r.url().includes('/api/orders/') &&
      ['POST', 'PATCH'].includes(r.request().method()),
  );
  await page
    .getByRole('button', { name: 'Registrar decisión de pedido', exact: true })
    .click();
  return r;
}
function pay(paymentId: string) {
  const url = new URL(process.env['DATABASE_URL'] ?? 'http://invalid');
  if (
    process.env['NODE_ENV'] !== 'test' ||
    url.hostname !== '127.0.0.1' ||
    url.pathname !== '/pettly_test' ||
    !/^pettly-admin-test-\d+-\d+$/.test(process.env['REDIS_PREFIX'] ?? '')
  )
    throw Error('Isolated test infrastructure required');
  execFileSync(
    process.execPath,
    [
      '--import',
      'tsx',
      'scripts/testing/payment-system-port.ts',
      'distributed',
      paymentId,
      crypto.randomUUID(),
    ],
    { env: process.env, stdio: 'pipe' },
  );
}
test('real scoped order search, accepted financials, cancellation, verified payment, delivery/pickup, history, conflicts and uncertain transport', async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(240000);
  const token = await signIn(page, 'admin@example.com'),
    headers = { Authorization: 'Bearer ' + token };
  const json = async <T>(response: APIResponse | Response): Promise<T> => {
    response = retainedResponse(response);
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
              ? '901987671'
              : '901987670',
            email: 'pedidos@example.com',
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
  const org = await createBusiness('Pedidos Aurora', professional.id),
    otherOrg = await createBusiness('Pedidos Segunda', admin.id);
  const category = await json<ApiResponse<'createProductCategory'>>(
    await context.request.post('/api/catalog/admin/categories', {
      headers,
      data: { name: 'Pedidos Pruebas', slug: 'pedidos-pruebas', reason },
    }),
  );
  let product = await json<ApiResponse<'createCatalogProduct'>>(
    await context.request.post('/api/catalog/admin/products', {
      headers: owner,
      data: {
        organizationId: org.id,
        profile: {
          name: 'Alimento Pedidos Aurora',
          description: 'Alimento completo para mascotas adultas.',
          categoryId: category.id,
        },
        reason,
      },
    }),
  );
  const variants: ApiResponse<'createProductVariant'>['variant'][] = [];
  for (let i = 0; i < 1; i++) {
    const v = await json<ApiResponse<'createProductVariant'>>(
      await context.request.post(
        '/api/catalog/admin/products/' + product.id + '/variants',
        {
          headers: owner,
          data: {
            profile: {
              sku: 'PED-' + String(i).padStart(2, '0'),
              priceMinor: 1000050,
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

  const stock = await json<ApiResponse<'getManagedStock'>>(
    await context.request.get(stockPath, { headers: owner }),
  );
  await json(
    await context.request.post(stockPath + '/movements', {
      headers: owner,
      data: {
        kind: 'receipt',
        quantity: 100,
        reason,
        expectedVersion: stock.version,
        idempotencyKey: crypto.randomUUID(),
      },
    }),
  );
  const contact = {
    recipient: 'Cliente Pedidos Aurora',
    phone: '+573001234567',
    countryCode: 'CO',
    city: 'Bogotá',
    address: 'Calle original 123',
    addressLine2: null,
    postalCode: null,
  };
  await json(
    await context.request.put(
      '/api/organizations/' + org.id + '/order-policy',
      {
        headers: owner,
        data: {
          expectedVersion: 0,
          reason,
          currency: 'COP',
          enabled: true,
          pickupAddress: { ...contact, recipient: 'Tienda Aurora' },
          shippingRules: [
            { countryCode: 'CO', city: 'Bogotá', feeMinor: 100000 },
          ],
          taxMode: 'included',
          taxRates: {},
          shippingTaxBasisPoints: 0,
          collector: 'platform',
          terms: 'Condiciones originales aceptadas del pedido.',
        },
      },
    ),
  );
  const create = async (
    fulfillment: 'delivery' | 'pickup',
    recipient: string,
  ) => {
    let cart = await json<ApiResponse<'getOwnCart'>>(
      await context.request.get('/api/cart', { headers }),
    );
    cart = await json<ApiResponse<'putOwnCartItem'>>(
      await context.request.put('/api/cart/items/' + variant.id, {
        headers,
        data: { quantity: 1, expectedVersion: cart.version },
      }),
    );
    const q = await json<ApiResponse<'createCheckoutQuote'>>(
      await context.request.post('/api/checkout/quotes', {
        headers,
        data: {
          expectedCartVersion: cart.version,
          fulfillment,
          contact: { ...contact, recipient },
        },
      }),
    );
    return json<ApiResponse<'createOwnOrder'>>(
      await context.request.post('/api/orders', {
        headers,
        data: {
          quoteId: q.id,
          expectedTotalMinor: q.snapshot.totalMinor,
          consent: true,
          idempotencyKey: crypto.randomUUID(),
        },
      }),
    );
  };
  const orders: ApiResponse<'createOwnOrder'>[] = [];
  for (let i = 0; i < 12; i++) {
    if (i % 4 === 0) await resetIsolatedRates();
    orders.push(
      await create(
        i === 1 ? 'pickup' : 'delivery',
        i === 11 ? 'Cliente literal %_' : 'Cliente Pedidos Aurora ' + i,
      ),
    );
  }
  const first = orders[0],
    pickup = orders[1],
    uncertain = orders[2],
    conflict = orders[3];
  if (!first || !pickup || !uncertain || !conflict)
    throw Error('Missing isolated order fixtures');
  await page.goto('/pedidos');
  await page
    .getByLabel('Buscar empresa', { exact: true })
    .fill('Pedidos Aurora');
  await expect(
    page
      .getByLabel('Empresa de los pedidos')
      .getByRole('option', { name: 'Pedidos Aurora', exact: true }),
  ).toBeAttached();
  await page.getByLabel('Empresa de los pedidos').selectOption(org.id);
  await page.getByLabel('Pedidos por página').selectOption('10');
  await page
    .getByRole('button', { name: 'Consultar pedidos', exact: true })
    .click();
  await expect(
    page
      .getByRole('list', { name: 'Pedidos encontrados' })
      .getByRole('listitem'),
  ).toHaveCount(10);
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await expect(
    page
      .getByRole('list', { name: 'Pedidos encontrados' })
      .getByRole('listitem'),
  ).toHaveCount(2);
  await page.reload();
  await expect(page).toHaveURL(/page=2/);
  await page.getByLabel('Buscar pedido por nombre').fill('%_');
  await page
    .getByRole('button', { name: 'Consultar pedidos', exact: true })
    .click();
  await expect(
    page
      .getByRole('list', { name: 'Pedidos encontrados' })
      .getByRole('listitem'),
  ).toHaveCount(1);
  await page.getByLabel('Buscar pedido por nombre').fill(first.id);
  await page
    .getByRole('button', { name: 'Consultar pedidos', exact: true })
    .click();
  await expect(
    page
      .getByRole('list', { name: 'Pedidos encontrados' })
      .getByRole('listitem'),
  ).toHaveCount(1);
  await accessible(page);
  await page.goto('/pedidos/' + org.id + '/' + first.id);
  await expect(
    page.getByRole('heading', { name: 'Estado real del pago' }),
  ).toBeVisible();
  await expect(
    page.getByText('Sin pago verificado.', { exact: false }),
  ).toBeVisible();
  await expect(
    page
      .getByLabel('Acción de pedido')
      .getByRole('option', { name: 'Iniciar preparación' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('list', { name: 'Productos aceptados' }),
  ).toContainText('Alimento Pedidos Aurora');
  expect(
    (
      await context.request.patch('/api/orders/' + first.id + '/fulfillment', {
        headers: owner,
        data: { status: 'preparing', expectedVersion: first.version, reason },
      })
    ).status(),
  ).toBe(409);
  const attempt = await json<ApiResponse<'createOwnPaymentAttempt'>>(
    await context.request.post(
      '/api/orders/' + first.id + '/payment-attempts',
      { headers, data: { idempotencyKey: crypto.randomUUID() } },
    ),
  );
  expect(attempt.checkoutUrl).toBeNull();
  pay(attempt.id);
  await page
    .getByRole('button', { name: 'Actualizar pedido', exact: true })
    .click();
  await expect(
    page.getByText('Pago verificado el', { exact: false }),
  ).toBeVisible();
  for (const action of ['preparing', 'dispatched', 'delivered']) {
    expect((await decide(page, action)).ok()).toBe(true);
    await expect(
      page.getByRole('status').filter({ hasText: 'Resultado registrado' }),
    ).toBeVisible();
  }
  await expect(page.getByLabel('Acción de pedido')).toHaveCount(0);
  await expect(
    page.getByRole('list', { name: 'Cambios del pedido' }),
  ).toContainText(reason);
  await accessible(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: 'tmp/admin-orders-detail.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: 'tmp/admin-orders-mobile.png',
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await accessible(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  const pickupAttempt = await json<ApiResponse<'createOwnPaymentAttempt'>>(
    await context.request.post(
      '/api/orders/' + pickup.id + '/payment-attempts',
      { headers, data: { idempotencyKey: crypto.randomUUID() } },
    ),
  );
  pay(pickupAttempt.id);
  await page.goto('/pedidos/' + org.id + '/' + pickup.id);
  expect((await decide(page, 'preparing')).ok()).toBe(true);
  await expect(
    page
      .getByLabel('Acción de pedido')
      .getByRole('option', { name: 'Registrar despacho' }),
  ).toHaveCount(0);
  expect((await decide(page, 'ready_for_pickup')).ok()).toBe(true);
  expect((await decide(page, 'delivered')).ok()).toBe(true);
  await page.goto('/pedidos/' + org.id + '/' + conflict.id);
  await expect(page.getByLabel('Acción de pedido')).toBeVisible();
  await json(
    await context.request.post('/api/orders/' + conflict.id + '/cancel', {
      headers: owner,
      data: { expectedVersion: conflict.version, reason },
    }),
  );
  expect((await decide(page, 'cancel')).status()).toBe(409);
  await expect(
    page.getByRole('button', { name: 'Registrar decisión de pedido' }),
  ).toBeDisabled();
  await page
    .getByRole('button', { name: 'Actualizar pedido', exact: true })
    .click();
  await expect(page.getByLabel('Acción de pedido')).toHaveCount(0);
  await page.goto('/pedidos/' + org.id + '/' + uncertain.id);
  await expect(page.getByLabel('Acción de pedido')).toBeVisible();
  const pattern = '**/api/orders/' + uncertain.id + '/cancel';
  await page.route(pattern, async (route) => {
    const r = await route.fetch();
    expect(r.status()).toBe(201);
    await route.abort('failed');
  });
  await fillDecision(page, 'cancel');
  await page
    .getByRole('button', { name: 'Registrar decisión de pedido', exact: true })
    .click();
  await expect(
    page.getByText('El resultado es incierto.', { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Registrar decisión de pedido' }),
  ).toBeDisabled();
  await page.unroute(pattern);
  await page
    .getByRole('button', { name: 'Actualizar pedido', exact: true })
    .click();
  await expect(page.getByLabel('Acción de pedido')).toHaveCount(0);
  // API keeps organization boundaries even when filters/search are supplied.
  expect(
    (
      await context.request.get(
        '/api/orders?organizationId=' + otherOrg.id + '&search=Cliente',
        { headers: owner },
      )
    ).status(),
  ).toBe(403);
  const foreign = await context.request.get(
    '/api/orders?organizationId=' + otherOrg.id + '&search=Cliente',
    { headers },
  );
  expect((await foreign.json()).items).toHaveLength(0);
  const staffContext = await browser.newContext();
  const staffPage = await staffContext.newPage();
  await signIn(staffPage, 'customer@example.com');
  await staffPage.goto('/pedidos/' + org.id + '/' + first.id);
  await expect(
    staffPage.getByRole('heading', {
      name: 'Pedido para Cliente Pedidos Aurora 0',
    }),
  ).toBeVisible();
  await staffPage.goto('/pedidos/' + otherOrg.id + '/' + first.id);
  await expect(
    staffPage.getByRole('heading', { name: 'Pedido no disponible' }),
  ).toBeVisible();
  await staffContext.close();
  const moderatorContext = await browser.newContext();
  const moderatorPage = await moderatorContext.newPage();
  const moderatorToken = await signIn(moderatorPage, 'camila@example.com');
  await moderatorPage.goto('/pedidos');
  await expect(moderatorPage).toHaveURL(/\/inicio$/);
  expect(
    (
      await moderatorContext.request.get('/api/orders/' + first.id, {
        headers: { Authorization: 'Bearer ' + moderatorToken },
      })
    ).status(),
  ).toBe(403);
  await moderatorContext.close();
});
