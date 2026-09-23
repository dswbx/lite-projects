import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { demoUsers, signIn, uniqueValue } from './helpers'

test('updates a profile photo and owner organization settings', async ({ page }, testInfo) => {
  await signIn(page, demoUsers.owner)
  await page.getByRole('link', { name: 'Settings', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

  const displayName = uniqueValue('Alex Morgan', testInfo)
  await page.getByLabel('Display name').fill(displayName)
  await page.getByLabel('Profile photo').setInputFiles({
    name: 'alex.png',
    mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+3MxZ5wAAAABJRU5ErkJggg==', 'base64'),
  })
  await page.getByRole('button', { name: 'Save profile' }).click()
  await expect(page.getByText('Profile saved')).toBeVisible()
  await expect(page.getByRole('img', { name: `${displayName} profile photo` }).first()).toBeVisible()

  await page.getByRole('tab', { name: 'Organization' }).click()
  const organizationName = uniqueValue('Atlas North Revenue Lab', testInfo)
  await page.getByLabel('Organization name').fill(organizationName)
  await page.getByRole('button', { name: 'Save organization' }).click()
  await expect(page.getByText('Organization saved')).toBeVisible()

  await page.getByRole('link', { name: 'Audit history', exact: true }).click()
  await expect(page.getByText(`Updated settings for ${organizationName}`, { exact: true })).toBeVisible()

  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations.filter((item) => ['critical', 'serious'].includes(item.impact ?? ''))).toEqual([])
})
