// ABOUTME: Integration tests for shopping trip workflow with real backend
// ABOUTME: Tests accessing shopping page and basic navigation

import { test, expect } from '@playwright/test';
import { createTestUser, registerTestUser, loginUser } from './helpers/auth-helper';

test.describe('Trip Integration', () => {
  const user = createTestUser(`trip_${Date.now()}`);

  test.beforeAll(async ({ request }) => {
    await registerTestUser(request, user);
  });

  test.beforeEach(async ({ page }) => {
    await loginUser(page, user.email, user.password);
  });

  test('should navigate to shopping page', async ({ page }) => {
    // Should already be on shopping page after login
    await expect(page).toHaveURL('/shopping');

    // Wait for page to load and stabilize
    await page.waitForLoadState('networkidle');

    // Should show shopping page heading
    await expect(page.locator('h1:has-text("Shopping")')).toBeVisible();
  });

  test('should have bottom navigation', async ({ page }) => {
    // Wait for page to stabilize
    await page.waitForLoadState('networkidle');

    // Check that all bottom nav links are present
    await expect(page.locator('a[href="/shopping"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('a[href="/inventory"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('a[href="/household"]')).toBeVisible({ timeout: 10000 });
  });
});
