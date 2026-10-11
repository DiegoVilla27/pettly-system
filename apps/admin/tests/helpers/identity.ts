import { expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const password = 'A sufficiently long password!';
export async function resetIsolatedRates() {
  const prefix = process.env['REDIS_PREFIX'];
  const url = process.env['REDIS_URL'];
  if (
    !prefix ||
    !/^pettly-admin-test-\d+-\d+$/.test(prefix) ||
    !url?.startsWith('redis://127.0.0.1:')
  )
    throw Error(
      'This suite only operates on its isolated test infrastructure.',
    );
  const require = createRequire(resolve('apps/api/package.json'));
  const Redis = require('ioredis').default;
  const redis = new Redis(url);
  try {
    const keys: string[] = await redis.keys(prefix + ':rate:*');
    if (keys.length) await redis.del(...keys);
  } finally {
    await redis.quit();
  }
}
export async function signIn(page: Page, email: string) {
  await resetIsolatedRates();
  await page.goto('/acceso');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  // Buffer the actual UI login response before forwarding it to the browser.
  // Chrome can discard response bodies even when waitForResponse resolves before navigation.
  const pattern = '**/api/auth/login';
  let accessToken: string | undefined;
  await page.route(pattern, async (route) => {
    const response = await route.fetch();
    if (response.status() === 200) {
      const session = await response.json();
      if (typeof session.accessToken === 'string')
        accessToken = session.accessToken;
    }
    await route.fulfill({ response });
  });
  try {
    await page.getByRole('button', { name: 'Entrar a mi espacio' }).click();
    await expect(page).toHaveURL(/\/inicio$/);
    if (!accessToken)
      throw Error('The actual UI login returned no access token.');
    return accessToken;
  } finally {
    await page.unroute(pattern);
  }
}
export async function accessible(page: Page) {
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
}
