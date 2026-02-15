// ABOUTME: Helper functions for authentication in integration tests
// ABOUTME: Provides reusable login/registration functionality

import { Page, APIRequestContext } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
  displayName: string;
}

export async function registerTestUser(
  request: APIRequestContext,
  user: TestUser
): Promise<void> {
  await request.post('http://localhost:5000/api/auth/register', {
    data: user
  });
}

export async function loginUser(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for navigation away from login page
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10000 });
}

export function createTestUser(uniqueId: string = Date.now().toString()): TestUser {
  return {
    email: `test_${uniqueId}@example.com`,
    password: 'TestPassword123!',
    displayName: 'Test User'
  };
}
