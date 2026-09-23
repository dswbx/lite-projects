import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { demoUsers, signIn, signOut, uniqueEmail } from './helpers'

test.describe('authentication and global keyboard access', () => {
  test('new users require email confirmation and can request another email', async ({ page }, testInfo) => {
    const email = uniqueEmail(testInfo)

    await page.goto('/')
    await page.getByRole('tab', { name: 'Create account' }).click()
    await page.getByLabel('Full name').fill('E2E New User')
    await page.getByLabel('Work email').fill(email)
    await page.getByLabel('Password').fill('UniqueDesk123!')
    await page.getByRole('button', { name: 'Create account', exact: true }).click()

    await expect(page.getByText('Check your email', { exact: true })).toBeVisible()
    await expect(page.getByText(email, { exact: false })).toBeVisible()
    const resend = page.waitForResponse((response) => response.url().includes('/auth/v1/resend') && response.request().method() === 'POST')
    await page.getByRole('button', { name: 'Resend confirmation' }).click()
    expect((await resend).status()).toBe(429)
    await expect(page.getByText(/only request this after \d+ seconds/)).toBeVisible()
  })

  test('Google sign-in is disabled with setup guidance and the auth screen has no serious axe violations', async ({ page }) => {
    await page.goto('/')
    const google = page.getByRole('button', { name: 'Continue with Google' })
    await expect(google).toBeDisabled()
    await expect(page.getByText('Google sign-in is not configured')).toBeVisible()
    await expect(page.getByText(/VITE_GOOGLE_AUTH_ENABLED=true/)).toBeVisible()

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations.filter((item) => ['critical', 'serious'].includes(item.impact ?? ''))).toEqual([])
  })

  test('a confirmed user restores a session, uses the command palette, and signs out', async ({ page }) => {
    await signIn(page, demoUsers.owner)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Revenue signal' })).toBeVisible()

    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k')
    const command = page.getByRole('dialog')
    await expect(command).toBeVisible()
    const input = command.getByPlaceholder('Search modules and actions…')
    await expect(input).toBeFocused()
    await input.fill('contacts')
    await page.getByRole('option', { name: /Contacts/ }).click()
    await expect(page.getByRole('heading', { name: 'Contacts' })).toBeVisible()

    await signOut(page)
  })
})
