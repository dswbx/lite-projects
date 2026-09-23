import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { createAccount, demoUsers, openModule, signIn, uniqueValue } from './helpers'

test.describe('CRM records', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, demoUsers.owner)
  })

  test('creates, filters, edits, and removes an account with confirmation', async ({ page }, testInfo) => {
    const name = uniqueValue('Northstar', testInfo)
    const editedName = `${name} Edited`
    await createAccount(page, name)

    const search = page.getByRole('textbox', { name: 'Search accounts' })
    await search.fill(name)
    await expect(page.getByText(name, { exact: true })).toBeVisible()

    await page.getByRole('row', { name: new RegExp(name) }).click()
    await expect(page.getByRole('dialog', { name: 'Edit account' })).toBeVisible()
    const accountName = page.getByLabel('Account name')
    await accountName.fill(editedName)
    await accountName.press('Enter')
    await expect(page.getByText(editedName, { exact: true })).toBeVisible()

    await page.getByRole('button', { name: `Actions for ${editedName}` }).click()
    await page.getByRole('menuitem', { name: 'Remove' }).click()
    const confirmation = page.getByRole('alertdialog', { name: 'Remove this account?' })
    await expect(confirmation).toBeVisible()
    await confirmation.getByRole('button', { name: 'Remove account' }).click()
    await expect(page.getByText(editedName, { exact: true })).toHaveCount(0)
  })

  test('links a contact to an account with a named relationship selector', async ({ page }, testInfo) => {
    const accountName = uniqueValue('Meridian Works', testInfo)
    await createAccount(page, accountName)
    await openModule(page, 'Contacts')
    await page.getByRole('button', { name: 'Create contact' }).click()
    const sheet = page.getByRole('dialog', { name: 'Create contact' })
    await sheet.getByLabel('First name').fill('Avery')
    await sheet.getByLabel('Last name').fill('Stone')
    await sheet.getByRole('tab', { name: 'Connections' }).click()
    await sheet.getByLabel('Account').click()
    await page.getByRole('option', { name: accountName }).click()
    await sheet.getByRole('button', { name: 'Create contact' }).click()
    await expect(sheet).toBeHidden()
    const contactRow = page.getByRole('cell', { name: accountName, exact: true }).locator('..')
    await expect(contactRow).toBeVisible()
    await expect(contactRow.getByRole('cell', { name: 'Avery', exact: true })).toBeVisible()
    await expect(contactRow.getByText(accountName, { exact: true })).toBeVisible()
  })

  test('validates required fields and restores focus after the record sheet closes', async ({ page }) => {
    await openModule(page, 'Leads')
    const trigger = page.getByRole('button', { name: 'Create lead' }).first()
    await trigger.focus()
    await trigger.click()
    const sheet = page.getByRole('dialog', { name: 'Create lead' })
    await expect(sheet).toBeVisible()
    const firstName = sheet.getByRole('textbox', { name: 'First name' })
    await expect(firstName).toHaveAttribute('required', '')
    await sheet.getByRole('button', { name: 'Create lead' }).click()
    await expect(sheet).toBeVisible()
    await expect(firstName).toBeFocused()
    expect(await firstName.evaluate((element: HTMLInputElement) => element.checkValidity())).toBeFalsy()
    await sheet.getByRole('button', { name: 'Cancel' }).click()
    await expect(trigger).toBeFocused()
  })

  test('filters contacts and moves between result pages', async ({ page }) => {
    await openModule(page, 'Contacts')
    await expect(page.getByText(/records · page 1 of 2/)).toBeVisible()

    const lastNameSort = page.getByRole('button', { name: 'Sort by Last' })
    await lastNameSort.click()
    await expect(page.getByRole('button', { name: 'Sort by Last, currently ascending' })).toBeVisible()
    const firstAscending = await page.locator('tbody tr').first().locator('td').nth(1).innerText()
    await page.getByRole('button', { name: 'Sort by Last, currently ascending' }).click()
    await expect(page.getByRole('button', { name: 'Sort by Last, currently descending' })).toBeVisible()
    await expect(page.locator('tbody tr').first().locator('td').nth(1)).not.toHaveText(firstAscending)

    await page.getByRole('link', { name: 'Go to next page' }).click()
    await expect(page.getByText(/records · page 2 of 2/)).toBeVisible()
    await page.getByRole('link', { name: 'Go to previous page' }).click()
    await expect(page.getByText(/records · page 1 of 2/)).toBeVisible()

    await page.getByRole('textbox', { name: 'Search contacts' }).fill('Ava')
    await expect(page.getByText(/records · page 1 of 1/)).toBeVisible()
  })

  test('opens an append-only audit row as read-only details', async ({ page }) => {
    await openModule(page, 'Audit history')
    const row = page.locator('tbody tr').first()
    await row.focus()
    await page.keyboard.press('Enter')
    const sheet = page.getByRole('dialog', { name: 'View audit event' })
    await expect(sheet).toBeVisible()
    await expect(sheet.getByLabel('Summary')).toBeDisabled()
    await expect(sheet.getByRole('button', { name: 'Save changes' })).toHaveCount(0)
    await sheet.getByRole('tab', { name: 'Connections' }).click()
    await expect(sheet.getByLabel('Actor')).toBeDisabled()
  })

  test('shows existing memberships without offering an unusable profile picker', async ({ page }) => {
    await openModule(page, 'Members')
    await expect(page.getByRole('button', { name: 'Create member' })).toHaveCount(0)
    await expect(page.locator('tbody tr').first()).toBeVisible()
  })

  test('dashboard, table, detail sheet, and settings screen pass automated axe checks', async ({ page }) => {
    const paths = ['/dashboard', '/accounts', '/custom-fields']
    for (const path of paths) {
      await page.goto(path)
      await expect(page.locator('main').last()).toBeVisible()
      const results = await new AxeBuilder({ page }).analyze()
      expect(results.violations.filter((item) => ['critical', 'serious'].includes(item.impact ?? '')), `${path} axe results`).toEqual([])
    }

    await page.goto('/accounts')
    await page.getByRole('button', { name: 'Create account' }).click()
    const accountSheet = page.getByRole('dialog', { name: 'Create account' })
    await expect(accountSheet).toBeVisible()
    await accountSheet.evaluate(async (element) => {
      await Promise.all(element.getAnimations().map((animation) => animation.finished))
    })
    const sheetResults = await new AxeBuilder({ page })
      .include('[data-slot="sheet-content"]')
      .analyze()
    expect(sheetResults.violations.filter((item) => ['critical', 'serious'].includes(item.impact ?? ''))).toEqual([])
  })
})
