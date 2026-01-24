import { test, expect, Page } from '@playwright/test'

const SCREENSHOT_DIR = 'tests/screenshots/feature-testing'

async function login(page: Page) {
  await page.goto('/login')
  await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com')
  await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'testpassword123')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/write/**', { timeout: 10000 })
  await page.waitForTimeout(500)
}

test.describe('Prompt Request Feature', () => {
  test('User can request a prompt with Inspire me button', async ({ page }) => {
    await login(page)

    await page.goto('/write/new')
    await page.waitForSelector('.dream-gradient')
    await page.waitForTimeout(1000)

    // Type some text to dismiss the initial prompt
    await page.keyboard.type('Testing the inspire me feature')
    await page.waitForTimeout(500)

    // Take screenshot showing editor with text and "Inspire me" button
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/17-editor-with-inspire-button.png`,
      fullPage: true
    })

    // Look for the "Inspire me" button
    const inspireButton = page.locator('button:has-text("Inspire me")')
    expect(await inspireButton.count()).toBe(1)

    // Click the button to request a prompt
    await inspireButton.click()
    await page.waitForTimeout(500)

    // Take screenshot showing loading state
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/18-prompt-loading.png`,
      fullPage: true
    })

    // Wait for the prompt to load
    await page.waitForTimeout(5000)

    // Take screenshot showing the AI prompt
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/19-prompt-displayed.png`,
      fullPage: true
    })

    // Verify prompt is displayed (check for the italic quote style or loading indicator gone)
    const promptVisible = page.locator('.prompt-entering, [class*="italic"]')
    expect(await promptVisible.count()).toBeGreaterThan(0)
  })
})
