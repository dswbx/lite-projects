import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { demoUsers, openModule, signIn, uniqueValue } from './helpers'

test('uploads, downloads, links, and removes a private text file', async ({ page }, testInfo) => {
  await signIn(page, demoUsers.owner)
  const fileName = `${uniqueValue('account-notes', testInfo)}.txt`
  await openModule(page, 'Files')
  await page.getByLabel('Linked record', { exact: true }).click()
  await page.getByRole('option').first().click()
  const uploadRequest = page.waitForResponse((response) => response.url().includes('/storage/v1/object/') && response.request().method() === 'POST')
  await page.locator('input[type=file]').setInputFiles({
    name: fileName,
    mimeType: 'text/plain',
    buffer: Buffer.from('Signal Desk private storage e2e\n'),
  })
  const uploadResponse = await uploadRequest
  expect(uploadResponse.ok(), await uploadResponse.text()).toBeTruthy()
  await expect(page.getByText('File uploaded')).toBeVisible()
  await expect(page.getByText(fileName, { exact: true })).toBeVisible()

  await page.getByRole('row', { name: new RegExp(fileName) }).click()
  const preview = page.getByRole('dialog', { name: fileName })
  await expect(preview.getByText('Signal Desk private storage e2e', { exact: true })).toBeVisible()
  await preview.getByRole('button', { name: 'Close' }).first().click()

  await page.getByRole('button', { name: `Actions for ${fileName}` }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: 'Download' }).click()
  const completedDownload = await download
  expect(completedDownload.suggestedFilename()).toBe(fileName)
  const downloadedPath = await completedDownload.path()
  expect(downloadedPath).not.toBeNull()
  expect(await readFile(downloadedPath!, 'utf8')).toBe('Signal Desk private storage e2e\n')

  await page.getByRole('button', { name: `Actions for ${fileName}` }).click()
  await page.getByRole('menuitem', { name: 'Remove' }).click()
  const confirmation = page.getByRole('alertdialog', { name: 'Remove this file?' })
  await expect(confirmation).toBeVisible()
  await confirmation.getByRole('button', { name: 'Remove file' }).click()
  await expect(page.getByText('File removed')).toBeVisible()
  await expect(page.getByText(fileName, { exact: true })).toHaveCount(0)
})
