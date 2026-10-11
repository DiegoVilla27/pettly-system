import { test, expect, chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
const password = 'A sufficiently long password!';
test('real identity flow, protected routes, rotating cookies, tabs and accessible responsive UI', async ({
  page,
  context,
}) => {
  await page.goto('/cuenta');
  await expect(page).toHaveURL(/\/acceso$/);
  await expect(
    page.getByRole('heading', { name: 'Qué bueno verte.' }),
  ).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({ path: 'tmp/admin-login.png', fullPage: true });
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Saltar al contenido' }),
  ).toBeFocused();
  await page.getByRole('button', { name: 'Entrar a mi espacio' }).click();
  await expect(page.getByLabel('Correo electrónico')).toBeFocused();
  await page.getByLabel('Correo electrónico').fill('admin@example.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('wrong password');
  await page.getByRole('button', { name: 'Entrar a mi espacio' }).click();
  await expect(page.getByRole('alert')).toContainText('no son correctos');
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  const loginResponse = page.waitForResponse(
    (r) => r.url().endsWith('/api/auth/login') && r.status() === 200,
  );
  await page.getByRole('button', { name: 'Entrar a mi espacio' }).click();
  const login = await (await loginResponse).json();
  expect(login.refreshToken).toBeUndefined();
  await expect(page).toHaveURL(/\/inicio$/);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  const cookie = (await context.cookies()).find(
    (c) => c.name === 'pettly_refresh',
  );
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.path).toBe('/api/auth');
  expect(cookie?.sameSite).toBe('Lax');
  const storage = await page.evaluate(() => ({
    local: { ...localStorage },
    session: { ...sessionStorage },
    refresh: document.cookie,
  }));
  expect(storage).toEqual({
    local: { 'pettly:backoffice:session-present': '1' },
    session: {},
    refresh: '',
  });
  await page.screenshot({
    path: 'tmp/admin-login-success.png',
    fullPage: true,
  });
  const second = await context.newPage();
  const statuses: number[] = [];
  context.on('response', (response) => {
    if (response.url().endsWith('/api/auth/refresh'))
      statuses.push(response.status());
  });
  await Promise.all([page.reload(), second.goto('/cuenta')]);
  await expect(page).toHaveURL(/\/inicio$/);
  await expect(
    second.getByRole('heading', { name: 'Mi cuenta', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Hola, Ana.' })).toBeVisible();
  await expect.poll(() => statuses.length).toBeGreaterThanOrEqual(2);
  expect(statuses.every((s) => s === 200)).toBe(true);
  expect(
    (await context.cookies()).find((c) => c.name === 'pettly_refresh')?.value,
  ).not.toBe(cookie?.value);
  expect(
    (
      await new AxeBuilder({ page: second })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Abrir navegación' }).click();
  await page.getByRole('link', { name: 'Mi cuenta', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Mi cuenta', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: 'tmp/admin-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Salir', exact: true }).click();
  await expect(page).toHaveURL(/\/acceso$/);
  await expect(second).toHaveURL(/\/acceso$/);
  expect(
    (await context.cookies()).find((c) => c.name === 'pettly_refresh'),
  ).toBeUndefined();
  const revoked = await context.request.get('/api/users/me', {
    headers: { Authorization: 'Bearer ' + login.accessToken },
  });
  expect(revoked.status()).toBe(401);
  await page.reload();
  await expect(page).toHaveURL(/\/acceso$/);
  await page.getByLabel('Correo electrónico').fill('customer@example.com');
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar a mi espacio' }).click();
  await expect(page).toHaveURL(/\/sin-acceso$/);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.goto('/inicio');
  await expect(page).toHaveURL(/\/sin-acceso$/);
});
test('production login meets Lighthouse performance, accessibility and best-practice budgets', async ({
  baseURL,
}) => {
  const chromePath =
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const chrome = await launch({
    chromePath: existsSync(chromePath) ? chromePath : chromium.executablePath(),
    chromeFlags: ['--headless', '--no-sandbox'],
  });
  try {
    const result = await lighthouse(baseURL + '/acceso', {
      port: chrome.port,
      onlyCategories: ['performance', 'accessibility', 'best-practices'],
      logLevel: 'error',
    });
    if (!result) throw Error('Lighthouse returned no report');
    const scores = Object.fromEntries(
      Object.entries(result.lhr.categories).map(([name, category]) => [
        name,
        Math.round((category.score ?? 0) * 100),
      ]),
    );
    await writeFile('tmp/admin-lighthouse.json', JSON.stringify(result.lhr));
    console.log('Lighthouse scores:', scores);
    for (const score of Object.values(scores))
      expect(score).toBeGreaterThanOrEqual(90);
  } finally {
    await chrome.kill();
  }
});
