import { expect, type Page } from '@playwright/test'

let counter = 0

/** Unique email per call so reruns (and post-upgrade migrated data) never collide. */
export function uniqueEmail(): string {
  counter += 1
  return `e2e-${Date.now()}-${counter}-${Math.floor(Math.random() * 1e6)}@example.com`
}

export const PASSWORD = 'password123'

const emailInput = (page: Page) => page.getByPlaceholder('you@example.com')
const passwordInput = (page: Page) => page.getByPlaceholder('Password (min 6 chars)')

/** Sign up a fresh user. Email confirmations are off, so the app auto-signs-in. */
export async function signUp(page: Page, email: string, password = PASSWORD) {
  await page.goto('/')
  // Switch to sign-up mode.
  await page.getByRole('button', { name: "Don't have an account? Sign up" }).click()
  await emailInput(page).fill(email)
  await passwordInput(page).fill(password)
  // `exact` avoids matching the "Already have an account? Sign in" toggle / vice versa.
  await page.getByRole('button', { name: 'Sign up', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
}

export async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto('/')
  await emailInput(page).fill(email)
  await passwordInput(page).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
}

export async function signOut(page: Page) {
  await page.getByRole('button', { name: 'Sign out' }).click()
  // Back on the auth screen.
  await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
}

export type NewItem = {
  name: string
  category: string
  location: string
  quantity?: number
}

/** Returns the table row <tr> for a given item name. */
export function itemRow(page: Page, name: string) {
  return page.getByRole('row').filter({ hasText: name })
}

/** Add an item via the "Add an item" form; waits for it to appear in the table. */
export async function addItem(page: Page, item: NewItem) {
  await page.getByPlaceholder('Name (e.g. Hammer)').fill(item.name)
  await page.getByPlaceholder('Category (e.g. Tools)').fill(item.category)
  await page.getByPlaceholder('Qty').fill(String(item.quantity ?? 1))
  await page.getByPlaceholder('Location (e.g. Garage)').fill(item.location)
  await page.getByRole('button', { name: 'Add item' }).click()
  await expect(itemRow(page, item.name)).toBeVisible()
}
