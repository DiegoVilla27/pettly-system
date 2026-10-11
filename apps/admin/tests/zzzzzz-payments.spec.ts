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
import { execFileSync } from 'node:child_process';
import { signIn, accessible, resetIsolatedRates } from './helpers/identity';
const reason = 'Isolated payment oversight workflow verification';
const password = 'A sufficiently long password!';
function observe(paymentId: string, mode: string) {
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
      mode,
      paymentId,
      crypto.randomUUID(),
    ],
    { env: process.env, stdio: 'pipe' },
  );
}
test('payment platform/business scopes, paging, immutable allocation, mismatched evidence and disabled provider with suspended-seller oversight', async ({
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
              ? '901987681'
              : '901987680',
            email: 'pagos@example.com',
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
  const org = await createBusiness('Pagos Aurora', professional.id),
    otherOrg = await createBusiness('Pagos Segunda', admin.id);
  const category = await json<ApiResponse<'createProductCategory'>>(
    await context.request.post('/api/catalog/admin/categories', {
      headers,
      data: { name: 'Pagos Pruebas', slug: 'pagos-pruebas', reason },
    }),
  );
  let product = await json<ApiResponse<'createCatalogProduct'>>(
    await context.request.post('/api/catalog/admin/products', {
      headers: owner,
      data: {
        organizationId: org.id,
        profile: {
          name: 'Alimento Pagos Aurora',
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
              sku: 'PAY-' + String(i).padStart(2, '0'),
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
    recipient: 'Cliente Pagos Aurora',
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
    buyerHeaders = headers,
  ) => {
    let cart = await json<ApiResponse<'getOwnCart'>>(
      await context.request.get('/api/cart', { headers: buyerHeaders }),
    );
    cart = await json<ApiResponse<'putOwnCartItem'>>(
      await context.request.put('/api/cart/items/' + variant.id, {
        headers: buyerHeaders,
        data: { quantity: 1, expectedVersion: cart.version },
      }),
    );
    const q = await json<ApiResponse<'createCheckoutQuote'>>(
      await context.request.post('/api/checkout/quotes', {
        headers: buyerHeaders,
        data: {
          expectedCartVersion: cart.version,
          fulfillment,
          contact: { ...contact, recipient },
        },
      }),
    );
    return json<ApiResponse<'createOwnOrder'>>(
      await context.request.post('/api/orders', {
        headers: buyerHeaders,
        data: {
          quoteId: q.id,
          expectedTotalMinor: q.snapshot.totalMinor,
          consent: true,
          idempotencyKey: crypto.randomUUID(),
        },
      }),
    );
  };
  const payments: ApiResponse<'createOwnPaymentAttempt'>[] = [];
  for (let i = 0; i < 12; i++) {
    if (i % 4 === 0) await resetIsolatedRates();
    const order = await create(
      'delivery',
      'Cliente Pagos ' + i,
      i === 0 ? owner : headers,
    );
    payments.push(
      await json<ApiResponse<'createOwnPaymentAttempt'>>(
        await context.request.post(
          '/api/orders/' + order.id + '/payment-attempts',
          {
            headers: i === 0 ? owner : headers,
            data: { idempotencyKey: crypto.randomUUID() },
          },
        ),
      ),
    );
  }
  const first = payments[0],
    mismatched = payments[1],
    pending = payments[2];
  if (!first || !mismatched || !pending)
    throw Error('Missing payment fixtures');
  observe(first.id, 'distributed');
  observe(mismatched.id, 'mismatch');
  observe(pending.id, 'pending');
  await page.goto(
    '/pagos?scope=business&organizationId=' + org.id + '&limit=10',
  );
  await expect(
    page.getByRole('list', { name: 'Intentos de pago' }).getByRole('link'),
  ).toHaveCount(10);
  await expect(
    page.getByRole('status').filter({ hasText: '12 intentos' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(
    page.getByRole('list', { name: 'Intentos de pago' }).getByRole('link'),
  ).toHaveCount(2);
  await page
    .getByLabel('Estado del pago')
    .selectOption('reconciliation_required');
  await page.getByRole('button', { name: 'Buscar pagos', exact: true }).click();
  await expect(
    page.getByRole('list', { name: 'Intentos de pago' }).getByRole('link'),
  ).toHaveCount(1);
  await page
    .getByRole('list', { name: 'Intentos de pago' })
    .getByRole('link')
    .click();
  await expect(
    page.getByRole('heading', { name: 'Distribución aceptada' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Solicitar conciliación' }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Ver evidencia financiera' }).click();
  await expect(
    page.getByText('La observación difiere del intento aceptado.', {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.getByText('No hay capturas registradas.')).toBeVisible();
  await accessible(page);
  await page.goto('/pagos/plataforma/' + first.id);
  await expect(
    page.getByText('Distribución confirmada', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Comisión Pettly (10 %)')).toBeVisible();
  await page.getByRole('button', { name: 'Ver evidencia financiera' }).click();
  await expect(
    page.getByRole('heading', { name: 'Registros de captura' }),
  ).toBeVisible();
  await expect(page.getByText('No hay capturas registradas.')).toHaveCount(0);
  await accessible(page);
  await page.screenshot({
    path: 'tmp/admin-payments-detail.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await accessible(page);
  await page.screenshot({
    path: 'tmp/admin-payments-mobile.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  expect(
    (
      await context.request.post('/api/payments/' + first.id + '/reconcile', {
        headers,
        data: {},
      })
    ).status(),
  ).toBe(503);
  const staffContext = await browser.newContext(),
    staffPage = await staffContext.newPage();
  const staffToken = await signIn(staffPage, 'customer@example.com');
  await staffPage.goto('/pagos?scope=business&organizationId=' + org.id);
  await expect(
    staffPage.getByRole('list', { name: 'Intentos de pago' }).getByRole('link'),
  ).toHaveCount(12);
  await staffPage.goto('/pagos/empresa/' + org.id + '/' + first.id);
  await expect(
    staffPage.getByRole('heading', { name: 'Distribución aceptada' }),
  ).toBeVisible();
  await expect(
    staffPage.getByRole('heading', { name: 'Evidencia financiera' }),
  ).toHaveCount(0);
  await expect(
    staffPage.getByRole('button', { name: 'Solicitar conciliación' }),
  ).toHaveCount(0);
  const staffHeaders = { Authorization: 'Bearer ' + staffToken };
  expect(
    (
      await staffContext.request.get(
        '/api/payments/' + first.id + '/financials',
        { headers: staffHeaders },
      )
    ).status(),
  ).toBe(403);
  await staffPage.goto('/pagos/empresa/' + otherOrg.id + '/' + first.id);
  await expect(
    staffPage.getByRole('heading', { name: 'Distribución aceptada' }),
  ).toHaveCount(0);
  await staffContext.close();
  const currentOrg = await json<ApiResponse<'getOrganizationProfile'>>(
    await context.request.get('/api/organizations/' + org.id, { headers }),
  );
  await json(
    await context.request.patch('/api/organizations/' + org.id + '/status', {
      headers,
      data: {
        expectedVersion: currentOrg.version,
        reason,
        status: 'suspended',
      },
    }),
  );
  await page.goto('/pagos/plataforma/' + first.id);
  await expect(
    page.getByRole('heading', { name: 'Distribución aceptada' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Historial del pago' }),
  ).toBeVisible();
  expect(
    (
      await context.request.get('/api/payments/' + first.id + '/history', {
        headers,
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await context.request.get('/api/payments/' + pending.id, {
        headers: owner,
      })
    ).status(),
  ).toBe(403);
  const moderatorContext = await browser.newContext(),
    moderatorPage = await moderatorContext.newPage();
  const moderatorToken = await signIn(moderatorPage, 'camila@example.com');
  await moderatorPage.goto('/pagos');
  await expect(moderatorPage).toHaveURL(/\/inicio$/);
  expect(
    (
      await moderatorContext.request.get('/api/payments/' + first.id, {
        headers: { Authorization: 'Bearer ' + moderatorToken },
      })
    ).status(),
  ).toBe(403);
  await moderatorContext.close();
});
