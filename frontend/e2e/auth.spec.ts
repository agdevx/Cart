import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('shows login page', async ({ page }) => {
    await expect(page.getByPlaceholder(/username/i)).toBeVisible()
  })

  test('shows login button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /login/i })).toBeVisible()
  })

  test('login button is disabled when username is empty', async ({ page }) => {
    const loginButton = page.getByRole('button', { name: /login/i })
    await expect(loginButton).toBeDisabled()
  })

  test('login button is enabled when username is entered', async ({ page }) => {
    await page.getByPlaceholder(/username/i).fill('testuser')
    const loginButton = page.getByRole('button', { name: /login/i })
    await expect(loginButton).toBeEnabled()
  })

  test('shows error message on failed login', async ({ page }) => {
    // Mock failed login response
    await page.route('**/api/auth/login', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Invalid credentials' })
      })
    })

    await page.getByPlaceholder(/username/i).fill('wronguser')
    await page.getByRole('button', { name: /login/i }).click()

    await expect(page.getByText(/login failed/i)).toBeVisible()
  })
})
