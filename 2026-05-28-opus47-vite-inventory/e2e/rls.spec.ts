import { test, expect } from '@playwright/test'
import { uniqueEmail, signUp, signOut, addItem, itemRow } from './helpers'

test("a user cannot see another user's items (RLS isolation)", async ({ page }) => {
  // User A creates a private item.
  await signUp(page, uniqueEmail())
  await addItem(page, { name: 'Alice Secret Vase', category: 'Decor', location: 'Closet' })
  await signOut(page)

  // User B sees an empty inventory, not Alice's item.
  await signUp(page, uniqueEmail())
  await expect(page.getByText('No items yet. Add your first one above.')).toBeVisible()
  await expect(itemRow(page, 'Alice Secret Vase')).toHaveCount(0)
})
