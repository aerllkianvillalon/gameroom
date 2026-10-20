import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  use: { baseURL: 'http://localhost:5173' },
  webServer: [
    { command: 'npm run dev -w @party/server', url: 'http://localhost:3001/health', reuseExistingServer: true },
    { command: 'npm run dev -w @party/web', url: 'http://localhost:5173', reuseExistingServer: true, env: { VITE_SERVER_URL: 'http://localhost:3001' } },
  ],
});
