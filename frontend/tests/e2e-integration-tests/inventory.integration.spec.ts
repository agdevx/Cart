// ABOUTME: Integration tests for inventory management with real backend
// ABOUTME: Tests accessing inventory page and basic functionality

import { test, expect } from '@playwright/test';
import { createTestUser, registerTestUser, loginUser } from './helpers/auth-helper';

test.describe('Inventory Integration', () => {
  const user = createTestUser(`inv_${Date.now()}`);

  test.beforeAll(async ({ request }) => {
    await registerTestUser(request, user);
  });

  test.beforeEach(async ({ page }) => {
    await loginUser(page, user.email, user.password);
  });

  test('should navigate to inventory page', async ({ page }) => {
    // Wait for page to stabilize
    await page.waitForLoadState('networkidle');

    // Navigate to inventory via bottom nav
    await page.locator('a[href="/pantry"]').click({ timeout: 15000 });
    await expect(page).toHaveURL('/pantry');

    // Should show pantry page content
    await expect(page.locator('text=/pantry/i')).toBeVisible();
  });

  test('should access add inventory item page', async ({ page }) => {
    // Wait for page to stabilize
    await page.waitForLoadState('networkidle');

    await page.locator('a[href="/pantry"]').click({ timeout: 15000 });
    await page.locator('a[href="/pantry/add"]').click({ timeout: 15000 });
    await expect(page).toHaveURL('/pantry/add');
  });
});
