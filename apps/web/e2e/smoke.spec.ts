import { test, expect } from '@playwright/test'

async function login(page: any) {
  await page.goto('/login')
  await page.fill('input[type="email"]', 'admin@buffalo-hotel.co.tz')
  await page.fill('input[type="password"]', 'Admin@2026!')
  await page.click('button[type="submit"]')
  await page.waitForURL('/overview', { timeout: 10000 })
}

test.describe('StayFlow Web Smoke Tests', () => {
  test('login redirects to overview', async ({ page }) => {
    await login(page)
    expect(page.url()).toContain('/overview')
  })

  test('navigate to reservations', async ({ page }) => {
    await login(page)
    await page.goto('/reservations')
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/reservations')
  })

  test('navigate to rooms', async ({ page }) => {
    await login(page)
    await page.goto('/rooms')
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/rooms')
  })

  test('navigate to invoices', async ({ page }) => {
    await login(page)
    await page.goto('/invoices')
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/invoices')
  })

  test('navigate to store', async ({ page }) => {
    await login(page)
    await page.goto('/store')
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/store')
  })

  test('navigate to settings', async ({ page }) => {
    await login(page)
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/settings')
  })
})
