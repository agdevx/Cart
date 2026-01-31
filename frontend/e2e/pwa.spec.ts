import { test, expect } from '@playwright/test'

test.describe('PWA Features', () => {
  test('has manifest link', async ({ page }) => {
    await page.goto('/')

    const manifestLink = page.locator('link[rel="manifest"]')
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json')
  })

  test('manifest is accessible and contains correct data', async ({ page }) => {
    await page.goto('/')

    const response = await page.request.get('http://localhost:5173/manifest.json')
    expect(response.ok()).toBeTruthy()

    const manifest = await response.json()
    expect(manifest.name).toBe('AGDevX Cart')
    expect(manifest.short_name).toBe('Cart')
    expect(manifest.theme_color).toBe('#2563eb')
  })

  test('has PWA meta tags', async ({ page }) => {
    await page.goto('/')

    const themeColor = page.locator('meta[name="theme-color"]')
    await expect(themeColor).toHaveAttribute('content', '#2563eb')
  })

  test('has viewport meta tag for mobile', async ({ page }) => {
    await page.goto('/')

    const viewport = page.locator('meta[name="viewport"]')
    await expect(viewport).toHaveCount(1)
  })

  test('service worker capability is present', async ({ page }) => {
    await page.goto('/')

    const hasServiceWorkerAPI = await page.evaluate(() => {
      return 'serviceWorker' in navigator
    })

    expect(hasServiceWorkerAPI).toBe(true)
  })

  test('page loads and renders correctly', async ({ page }) => {
    await page.goto('/')

    // Check that page content is visible (login page in this case)
    await expect(page.getByPlaceholder(/username/i)).toBeVisible()
  })
})
