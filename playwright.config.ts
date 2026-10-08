import { defineConfig, devices } from '@playwright/test'
const production = process.env.PLAYWRIGHT_PRODUCTION === '1'
const port = production ? 3001 : 3000
const baseURL = `http://127.0.0.1:${port}`
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: production ? `npm run start -- --port ${port}` : 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
