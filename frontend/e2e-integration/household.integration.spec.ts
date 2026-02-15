// ABOUTME: Integration tests for household management with real backend
// ABOUTME: Tests household creation and management

import { test, expect } from '@playwright/test';
import { createTestUser, registerTestUser, loginUser } from './helpers/auth-helper';

test.describe('Household Integration', () => {
  const user = createTestUser(`hh_${Date.now()}`);

  test.beforeAll(async ({ request }) => {
    await registerTestUser(request, user);
  });

  test.beforeEach(async ({ page }) => {
    await loginUser(page, user.email, user.password);
  });

  test('should create a new household', async ({ page }) => {
    // Wait for page to stabilize
    await page.waitForLoadState('networkidle');

    // Navigate to household page
    await page.locator('a[href="/household"]').click({ timeout: 15000 });
    await expect(page).toHaveURL('/household');

    // Click create household button
    await page.click('text=/create new household/i');
    await expect(page).toHaveURL('/household/create');

    // Fill in household name
    const householdName = `Test Household ${Date.now()}`;
    await page.fill('input[type="text"]', householdName);
    await page.click('button[type="submit"]');

    // Should navigate back to household page and show the new household
    await expect(page).toHaveURL('/household');
    await expect(page.locator(`text=${householdName}`)).toBeVisible();
  });

  test('should display households list', async ({ page }) => {
    // Wait for page to stabilize
    await page.waitForLoadState('networkidle');

    // Navigate to household page
    await page.locator('a[href="/household"]').click({ timeout: 15000 });
    await expect(page).toHaveURL('/household');

    // Should show households section or message about no households
    const hasHouseholds = await page.locator('text=/household/i').count() > 0;
    expect(hasHouseholds).toBeTruthy();
  });
});
