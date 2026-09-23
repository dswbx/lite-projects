import { expect, type Page, type TestInfo } from '@playwright/test'

export const demoUsers = {
  owner: { email: 'alex@signaldesk.local', password: 'SignalDesk123!' },
  manager: { email: 'sam@signaldesk.local', password: 'SignalDesk123!' },
  member: { email: 'jamie@signaldesk.local', password: 'SignalDesk123!' },
} as const

export function uniqueValue(prefix: string, testInfo?: TestInfo): string {
  const title = testInfo?.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() ?? 'flow'
  return `${prefix}-${title}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
}

export function uniqueEmail(testInfo: TestInfo): string {
  return `${uniqueValue('e2e', testInfo)}@example.test`
}

export async function signIn(page: Page, user: (typeof demoUsers)[keyof typeof demoUsers] = demoUsers.owner) {
  await page.goto('/')
  await page.getByLabel('Work email').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Revenue signal' })).toBeVisible()
}

export async function signOut(page: Page) {
  await page.getByRole('button', { name: /@signaldesk\.local/i }).click()
  await expect(page.getByText('Open your sales desk', { exact: true })).toBeVisible()
}

export async function openModule(page: Page, name: string) {
  await page.getByRole('link', { name, exact: true }).click()
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
}

export async function chooseOption(page: Page, label: string, option: string) {
  await page.getByLabel(label).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}

export async function createAccount(page: Page, name: string) {
  await openModule(page, 'Accounts')
  await page.getByRole('button', { name: 'Create account' }).click()
  const dialog = page.getByRole('dialog', { name: 'Create account' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('textbox', { name: 'Account name' }).fill(name)
  await dialog.getByRole('textbox', { name: 'Industry' }).fill('Industrial software')
  await dialog.getByRole('textbox', { name: 'Website' }).fill('https://example.test')
  await dialog.getByRole('spinbutton', { name: 'Annual revenue' }).fill('1250000')
  await dialog.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page.getByText(name, { exact: true })).toBeVisible()
}
