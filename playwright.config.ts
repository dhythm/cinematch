import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.E2E_PORT ?? 3100)
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    // 使い捨てのインメモリ PGlite サーバーを立て、その DATABASE_URL で dev サーバーを起動する
    command: `pglite-server --db=memory:// --port=${PORT + 1} --max-connections=10 --include-database-url --run="next dev --port ${PORT}"`,
    url: `${baseURL}/api/movies`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // 外部 API に依存せず、起動時にシードしたダミー映画で検証する
    env: { TMDB_API_TOKEN: '', EIGA_ICS_URL: '' },
  },
})
