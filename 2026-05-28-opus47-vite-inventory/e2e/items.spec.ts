import { test, expect } from '@playwright/test'
import { uniqueEmail, signUp, addItem, itemRow } from './helpers'

test('create an item; it shows in the table with all fields', async ({ page }) => {
  await signUp(page, uniqueEmail())

  // Empty state before any items exist.
  await expect(page.getByText('No items yet. Add your first one above.')).toBeVisible()

  await addItem(page, {
    name: 'Cordless Drill',
    category: 'Tools',
    quantity: 2,
    location: 'Garage',
  })

  const row = itemRow(page, 'Cordless Drill')
  await expect(row.getByText('Tools')).toBeVisible()
  await expect(row.getByText('Garage')).toBeVisible()
  await expect(row.getByRole('cell', { name: '2', exact: true })).toBeVisible()
  // Count heading reflects one item.
  await expect(page.getByRole('heading', { name: '1 item' })).toBeVisible()
})

test('edit an item updates its fields in the table', async ({ page }) => {
  await signUp(page, uniqueEmail())
  await addItem(page, { name: 'Old Lamp', category: 'Decor', quantity: 1, location: 'Attic' })

  await itemRow(page, 'Old Lamp').getByRole('button', { name: 'Edit' }).click()

  await page.getByPlaceholder('Name (e.g. Hammer)').fill('New Lamp')
  await page.getByPlaceholder('Category (e.g. Tools)').fill('Lighting')
  await page.getByPlaceholder('Qty').fill('5')
  await page.getByPlaceholder('Location (e.g. Garage)').fill('Living Room')
  await page.getByRole('button', { name: 'Save changes' }).click()

  await expect(itemRow(page, 'Old Lamp')).toHaveCount(0)
  const row = itemRow(page, 'New Lamp')
  await expect(row.getByText('Lighting')).toBeVisible()
  await expect(row.getByText('Living Room')).toBeVisible()
  await expect(row.getByRole('cell', { name: '5', exact: true })).toBeVisible()
})

test('delete an item removes it from the table', async ({ page }) => {
  await signUp(page, uniqueEmail())
  await addItem(page, { name: 'Doomed Box', category: 'Storage', location: 'Basement' })

  page.once('dialog', (dialog) => dialog.accept())
  await itemRow(page, 'Doomed Box').getByRole('button', { name: 'Delete' }).click()

  await expect(itemRow(page, 'Doomed Box')).toHaveCount(0)
  await expect(page.getByText('No items yet. Add your first one above.')).toBeVisible()
})

test('filter by category and location narrows the list; clear restores it', async ({
  page,
}) => {
  await signUp(page, uniqueEmail())
  await addItem(page, { name: 'Wrench', category: 'Tools', location: 'Garage' })
  await addItem(page, { name: 'Plates', category: 'Kitchenware', location: 'Kitchen' })

  // Filter to Tools → only the wrench remains.
  // (Add-form inputs use `list=` so they also expose a combobox role; the two
  // <select> filters are the only real <select> elements on the page.)
  const categoryFilter = page.locator('select').first()
  const locationFilter = page.locator('select').nth(1)
  await categoryFilter.selectOption('Tools')
  await expect(itemRow(page, 'Wrench')).toBeVisible()
  await expect(itemRow(page, 'Plates')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: '1 item' })).toBeVisible()

  // Clear filters → both visible again.
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(itemRow(page, 'Wrench')).toBeVisible()
  await expect(itemRow(page, 'Plates')).toBeVisible()
  await expect(page.getByRole('heading', { name: '2 items' })).toBeVisible()

  // Filter to the Kitchen location → only the plates remain.
  await locationFilter.selectOption('Kitchen')
  await expect(itemRow(page, 'Plates')).toBeVisible()
  await expect(itemRow(page, 'Wrench')).toHaveCount(0)
})
