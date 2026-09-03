import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { demoUsers, signIn, uniqueValue } from './helpers'

test.describe('pipeline and private files', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, demoUsers.owner)
  })

  test('creates a deal and moves it with the keyboard-accessible stage menu', async ({ page }, testInfo) => {
    const dealName = uniqueValue('Signal deal', testInfo)
    await page.getByRole('link', { name: 'Pipeline', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Opportunity pipeline' })).toBeVisible()
    await page.getByRole('button', { name: 'Create opportunity' }).click()
    await page.getByLabel('Opportunity name').fill(dealName)
    await page.getByLabel('Deal value').fill('48000')
    await page.getByLabel('Probability').fill('15')
    await page.getByLabel('Expected close').fill('2026-12-31')
    await page.getByRole('button', { name: 'Create opportunity', exact: true }).click()

    await page.getByRole('button', { name: `Open ${dealName}` }).click()
    const detail = page.getByRole('dialog', { name: 'Edit opportunity' })
    await detail.getByLabel('Deal value').fill('52000')
    await detail.getByRole('tab', { name: 'Connections' }).click()
    await detail.getByLabel('Account').click()
    const accountOption = page.getByRole('option').first()
    const linkedAccount = await accountOption.innerText()
    await accountOption.click()
    await detail.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('button', { name: `Open ${dealName}` })).toContainText('$52K')

    await page.getByRole('button', { name: `Open ${dealName}` }).click()
    const reopened = page.getByRole('dialog', { name: 'Edit opportunity' })
    await reopened.getByRole('tab', { name: 'Connections' }).click()
    await expect(reopened.getByLabel('Account')).toContainText(linkedAccount)
    await reopened.getByRole('button', { name: 'Cancel' }).click()
    const dealCard = page.locator('[data-slot="card"]').filter({ has: page.getByRole('button', { name: `Open ${dealName}` }) })
    await expect(dealCard.getByText('Dec 31', { exact: false })).toBeVisible()

    const stageButton = page.getByRole('button', { name: `Choose stage for ${dealName}` })
    await expect(stageButton).toBeVisible()
    await stageButton.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('menu')).toBeVisible()
    const stageChangeRequest = page.waitForResponse((response) => response.url().includes('/rest/v1/opportunities') && response.request().method() === 'PATCH')
    await page.getByRole('menuitem', { name: 'Qualified' }).click()
    const stageChangeResponse = await stageChangeRequest
    expect(stageChangeResponse.ok(), await stageChangeResponse.text()).toBeTruthy()
    await expect(page.getByText('Opportunity moved')).toBeVisible()
    const movedToast = page.locator('[data-sonner-toast]').filter({ hasText: 'Opportunity moved' })
    await movedToast.evaluate(async (element) => {
      await Promise.all(element.getAnimations().map((animation) => animation.finished))
    })

    await page.getByRole('button', { name: `Choose stage for ${dealName}` }).click()
    await page.getByRole('menuitem', { name: 'Closed won' }).click()
    const wonStage = page.getByRole('region', { name: 'Closed won stage' })
    await expect(wonStage.getByRole('button', { name: `Open ${dealName}` })).toBeVisible()
    await page.locator('[data-sonner-toast]').evaluateAll(async (elements) => {
      await Promise.all(elements.flatMap((element) => element.getAnimations()).map((animation) => animation.finished))
    })

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations.filter((item) => ['critical', 'serious'].includes(item.impact ?? ''))).toEqual([])
  })
})
