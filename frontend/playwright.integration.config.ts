// ABOUTME: Playwright configuration for integration tests against real backend
// ABOUTME: Tests full stack: frontend → backend → database

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-integration',
  fullyParallel: false, // Run tests serially to avoid database conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid race conditions
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // webServer configuration disabled - start servers manually
  // Backend: cd backend && dotnet run --project AGDevX.Cart.Api
  // Frontend: cd frontend && npm run dev
});
