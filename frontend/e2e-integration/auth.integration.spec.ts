// ABOUTME: Integration tests for authentication flow with real backend
// ABOUTME: Tests login and session persistence

import { test, expect } from '@playwright/test';

test.describe('Authentication Integration', () => {
  const email = `test_${Date.now()}@example.com`;
  const password = 'TestPassword123!';

  test.beforeAll(async ({ request }) => {
    // Register a test user via API before running tests
    await request.post('http://localhost:5000/api/auth/register', {
      data: {
        email,
        password,
        displayName: 'Test User'
      }
    });
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/');

    // Should redirect to login
    await expect(page).toHaveURL('/login');

    // Fill in login form
    await page.fill('input[id="email"]', email);
    await page.fill('input[id="password"]', password);
    await page.click('button[type="submit"]');

    // Should redirect to shopping page after successful login
    await expect(page).toHaveURL('/shopping');
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[id="email"]', 'invalid@example.com');
    await page.fill('input[id="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should stay on login page and show error
    await expect(page).toHaveURL('/login');
    await expect(page.locator('text=/login failed/i')).toBeVisible();
  });

  test('should maintain session after page reload', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[id="email"]', email);
    await page.fill('input[id="password"]', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/shopping');

    // Reload the page
    await page.reload();

    // Should still be logged in (not redirected to login)
    await expect(page).not.toHaveURL('/login');
  });
});
