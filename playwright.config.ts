import fs from 'fs';
import { defineConfig } from '@playwright/test';

const port = process.env.PORT ?? '3000';
const baseURL = process.env.BASE_URL ?? `http://127.0.0.1:${port}`;
const systemChromium = '/usr/bin/chromium';
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ??
  (fs.existsSync(systemChromium) ? systemChromium : undefined);

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  expect: {
    timeout: 30_000,
  },
  workers: 1,
  use: {
    baseURL,
    headless: true,
    launchOptions: {
      ...(executablePath ? { executablePath } : {}),
      args: ['--disable-crashpad', '--disable-crash-reporter', '--no-zygote'],
    },
  },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: `pnpm run dev -- --hostname 127.0.0.1 --port ${port}`,
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
