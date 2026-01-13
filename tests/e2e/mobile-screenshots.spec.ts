import { test } from '@playwright/test'

// iPhone SE viewport
test.use({ viewport: { width: 375, height: 667 } })

test.describe('Mobile Screenshots for UX Review', () => {
  test('capture mobile UI states', async ({ page }) => {
    const screenshotDir = 'tests/screenshots/mobile'

    // Login first
    await page.goto('/login')
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com')
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'testpassword123')
    await page.click('button[type="submit"]')

    // Wait for redirect after login (goes to /write/new)
    await page.waitForURL('**/write/**', { timeout: 10000 })
    await page.waitForTimeout(500) // Let animations settle

    // 1. Editor page (initial state after login)
    await page.waitForSelector('.dream-gradient')
    await page.screenshot({ path: `${screenshotDir}/01-editor-empty.png`, fullPage: false })

    // 2. Editor with prompt visible (if any)
    await page.waitForTimeout(2000) // Wait for AI prompt
    await page.screenshot({ path: `${screenshotDir}/02-editor-with-prompt.png`, fullPage: false })

    // 3. Editor after tapping (should trigger keyboard on real mobile)
    await page.click('.editor-fade-on-scroll')
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${screenshotDir}/03-editor-tapped.png`, fullPage: false })

    // 4. Editor with text typed
    await page.keyboard.type('The morning light filtered through the curtains, casting long shadows across the room.')
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${screenshotDir}/04-editor-with-text.png`, fullPage: false })

    // 5. Dashboard mobile
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${screenshotDir}/05-dashboard.png`, fullPage: false })

    // 6. Goals page mobile
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${screenshotDir}/06-goals-page.png`, fullPage: false })

    // 7. Goal Coach modal - click "Add a goal" or empty card
    const addGoalButton = page.locator('text=Add a goal').first()
    if (await addGoalButton.isVisible()) {
      await addGoalButton.click()
    } else {
      // Try clicking the "Add your first goal" button
      const firstGoalButton = page.locator('text=Add your first goal')
      if (await firstGoalButton.isVisible()) {
        await firstGoalButton.click()
      }
    }

    // Wait for Goal Coach to appear
    await page.waitForTimeout(1000) // Animation time
    await page.screenshot({ path: `${screenshotDir}/07-coach-modal-open.png`, fullPage: false })

    // 8. Goal Coach with AI response - wait for the coach to respond
    await page.waitForTimeout(3000) // Wait for AI response
    await page.screenshot({ path: `${screenshotDir}/08-coach-with-response.png`, fullPage: false })

    // 9. Goal Coach with input focused
    const textarea = page.locator('textarea').first()
    if (await textarea.isVisible()) {
      await textarea.focus()
      await page.waitForTimeout(300)
      await page.screenshot({ path: `${screenshotDir}/09-coach-input-focused.png`, fullPage: false })

      // 10. Type a response
      await textarea.fill('I want to improve my writing skills')
      await page.screenshot({ path: `${screenshotDir}/10-coach-with-typed-response.png`, fullPage: false })
    }

    // 11. Knowledge Graph page (navigate directly, closing modal not needed for screenshots)
    await page.goto('/graph')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${screenshotDir}/11-graph-page.png`, fullPage: false })

    console.log('Mobile screenshots captured successfully!')
  })
})
