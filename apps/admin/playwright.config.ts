import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export default defineConfig({
  testDir: 'tests',
  workers: 1,
  retries: 0,
  timeout: 60000,
  outputDir: '../../tmp/admin-playwright',
  reporter: 'list',
  use: {
    actionTimeout: 10000,
    baseURL: process.env['ADMIN_TEST_URL'],
    headless: true,
    launchOptions: {
      ...(existsSync(chrome) ? { executablePath: chrome } : {}),
      args: ['--no-sandbox'],
    },
  },
});
