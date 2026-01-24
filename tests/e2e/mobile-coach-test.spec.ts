import { test, Page } from '@playwright/test'

const SCREENSHOT_DIR = 'tests/screenshots/feature-testing'

// iPhone SE viewport
test.use({ viewport: { width: 375, height: 667 } })

async function login(page: Page) {
  await page.goto('/login')
  await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com')
  await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'testpassword123')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/write/**', { timeout: 10000 })
  await page.waitForTimeout(500)
}

test.describe('Mobile Goal Coach Tests', () => {
  test('Goal Coach keyboard handling on mobile', async ({ page }) => {
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

    // Take screenshot of mobile dashboard
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/12-mobile-dashboard.png`,
      fullPage: true
    })

    // Click on "Add a goal" or equivalent
    const addGoalButton = page.locator('button:has-text("Add a goal")')
    if (await addGoalButton.count() > 0) {
      await addGoalButton.first().click()
      await page.waitForTimeout(1000)

      // Take screenshot of coach opened
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/13-mobile-coach-opened.png`,
        fullPage: true
      })

      // Wait for AI response
      await page.waitForTimeout(3000)

      // Take screenshot with response
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/14-mobile-coach-with-response.png`,
        fullPage: true
      })

      // Focus the textarea to simulate keyboard appearing
      const textarea = page.locator('textarea')
      if (await textarea.count() > 0) {
        await textarea.focus()
        await page.waitForTimeout(500)

        // Take screenshot with input focused
        await page.screenshot({
          path: `${SCREENSHOT_DIR}/15-mobile-coach-input-focused.png`,
          fullPage: true
        })

        // Type something
        await textarea.fill('I want to improve my health')
        await page.waitForTimeout(300)

        await page.screenshot({
          path: `${SCREENSHOT_DIR}/16-mobile-coach-with-input.png`,
          fullPage: true
        })
      }
    }
  })
})
