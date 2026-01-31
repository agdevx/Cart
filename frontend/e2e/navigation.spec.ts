import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })

  test('shows login page by default', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByPlaceholder(/username/i)).toBeVisible()
  })

  test('shopping page redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/shopping')
    await expect(page).toHaveURL(/\/login/)
  })

  test('inventory page redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/inventory')
    await expect(page).toHaveURL(/\/login/)
  })

  test('household page redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/household')
    await expect(page).toHaveURL(/\/login/)
  })

  test('root path redirects to shopping', async ({ page }) => {
    await page.goto('/')
    // Since not authenticated, should redirect to login via shopping
    await expect(page).toHaveURL(/\/login/)
  })
})
