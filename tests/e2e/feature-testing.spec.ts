import { test, expect, Page } from '@playwright/test'

const SCREENSHOT_DIR = 'tests/screenshots/feature-testing'

async function login(page: Page) {
  await page.goto('/login')
  await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com')
  await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'testpassword123')
  await page.click('button[type="submit"]')

  // Wait for redirect after login
  await page.waitForURL('**/write/**', { timeout: 10000 })
  await page.waitForTimeout(500)
}

test.describe('Feature Testing - End to End', () => {
  test('01 - Backspace - should allow deleting all text without limit', async ({ page }) => {
    await login(page)

    // Navigate to the editor
    await page.goto('/write/new')
    await page.waitForSelector('.dream-gradient')
    await page.waitForTimeout(500)

    // Type several words (5 words)
    await page.keyboard.type('one two three four five ')
    await page.waitForTimeout(300)

    // Take screenshot before deletion
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-backspace-before-delete.png`,
      fullPage: true
    })

    // Now delete ALL characters (5 words = ~25 chars + spaces)
    // With the old limit, you could only delete ~2 words
    for (let i = 0; i < 35; i++) {
      await page.keyboard.press('Backspace')
      await page.waitForTimeout(20)
    }

    await page.waitForTimeout(300)

    // Take screenshot after deletion
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-backspace-after-delete.png`,
      fullPage: true
    })

    // Verify all text was deleted - the editor should be empty
    const dreamText = page.locator('.dream-text')
    const textCount = await dreamText.count()

    // Either no dream-text elements, or they're all empty
    if (textCount > 0) {
      const allTexts = await dreamText.allTextContents()
      const combinedText = allTexts.join('').trim()
      expect(combinedText).toBe('')
    }
  })

  test('02 - Editor mobile - visible writing area', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await login(page)

    await page.goto('/write/new')
    await page.waitForSelector('.dream-gradient')
    await page.waitForTimeout(500)

    // Take screenshot of initial mobile editor state
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-mobile-editor-initial.png`,
      fullPage: true
    })

    // Type some text to verify it works
    await page.keyboard.type('Testing mobile editor')
    await page.waitForTimeout(300)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-mobile-editor-with-text.png`,
      fullPage: true
    })
  })

  test('03 - Desktop editor - line length check', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 })

    await login(page)

    await page.goto('/write/new')
    await page.waitForSelector('.dream-gradient')
    await page.waitForTimeout(500)

    // Type a very long line to test line length
    await page.keyboard.type('This is a test of the line length on desktop to see how many words fit per line before wrapping which should be limited')
    await page.waitForTimeout(300)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-desktop-line-length.png`,
      fullPage: true
    })
  })

  test('04 - Goal Coach - error handling', async ({ page }) => {
    await login(page)

    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Dismiss onboarding modal if present
    const skipIntroButton = page.locator('button:has-text("Skip intro")')
    if (await skipIntroButton.count() > 0) {
      await skipIntroButton.click()
      await page.waitForTimeout(500)
    }

    // Take screenshot of dashboard
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06-dashboard.png`,
      fullPage: true
    })

    // Look for goal coaching button or new goal button
    const newGoalButton = page.locator('button:has-text("New Goal"), button:has-text("Add Goal"), button:has-text("Add a goal")')
    if (await newGoalButton.count() > 0) {
      await newGoalButton.first().click()
      await page.waitForTimeout(1000)

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/07-goal-coach-opened.png`,
        fullPage: true
      })

      // Wait for AI to respond
      await page.waitForTimeout(3000)

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/08-goal-coach-with-response.png`,
        fullPage: true
      })
    }
  })

  test('05 - Knowledge Graph', async ({ page }) => {
    await login(page)

    await page.goto('/graph')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/09-knowledge-graph.png`,
      fullPage: true
    })
  })

  test('06 - Goals Page', async ({ page }) => {
    await login(page)

    await page.goto('/goals')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/10-goals-page.png`,
      fullPage: true
    })
  })
})
