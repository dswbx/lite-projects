import { expect, test } from '@playwright/test'

const password = 'planner-pass-123'
const uniqueEmail = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`

test('a private planner supports auth, chronological events, guests, RSVPs, edits, and isolation', async ({ page }) => {
  const owner = uniqueEmail('owner')
  await page.goto('/')
  await page.getByTestId('email').fill(owner)
  await page.getByTestId('password').fill(password)
  await page.getByTestId('auth-submit').click()
  await expect(page.getByText('Make room for the good stuff.')).toBeVisible()

  for (const [index, event] of [{ name: 'Later picnic', date: '2032-08-20', location: 'River park' }, { name: 'Soon brunch', date: '2032-03-10', location: 'Cedar cafe' }].entries()) {
    await page.getByTestId('event-name').fill(event.name)
    await page.getByTestId('event-date').fill(event.date)
    await page.getByTestId('event-location').fill(event.location)
    await page.getByTestId('save-event').click()
    await expect(page.getByTestId('event-title')).toHaveCount(index + 1)
  }
  await expect(page.getByTestId('event-title')).toHaveText(['Soon brunch', 'Later picnic'])
  const brunch = page.getByTestId('event-card').filter({ hasText: 'Soon brunch' })
  await brunch.getByPlaceholder('Guest name').fill('Mina Patel')
  await brunch.getByRole('button', { name: 'Add guest' }).click()
  await brunch.getByLabel('RSVP for Mina Patel').selectOption('going')
  await expect(brunch.getByText('1 going / 1')).toBeVisible()
  await brunch.getByRole('button', { name: 'Edit' }).click()
  await page.getByTestId('event-name').fill('Soon brunch, updated')
  await page.getByTestId('save-event').click()
  await expect(page.getByText('Soon brunch, updated')).toBeVisible()

  await page.getByRole('button', { name: 'Sign out' }).click()
  const stranger = uniqueEmail('stranger')
  await page.getByTestId('email').fill(stranger)
  await page.getByTestId('password').fill(password)
  await page.getByTestId('auth-submit').click()
  await expect(page.getByText('Nothing on the books yet.')).toBeVisible()
  await expect(page.getByText('Soon brunch, updated')).toHaveCount(0)
})
