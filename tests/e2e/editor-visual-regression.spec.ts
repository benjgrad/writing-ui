import { test, expect, Page } from '@playwright/test'

// Run tests serially to avoid overwhelming the server during login
test.describe.configure({ mode: 'serial' })

const SCREENSHOT_DIR = 'tests/screenshots/visual-regression'

async function login(page: Page) {
  await page.goto('/login')
  await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com')
  await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'testpassword123')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/write/**', { timeout: 10000 })
  await page.waitForTimeout(500)
}

test.describe('Editor Visual Regression Tests', () => {
  test('desktop - toolbar should be fixed and always visible', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await login(page)
    await page.goto('/write/new')
    await page.waitForSelector('.dream-gradient')
    await page.waitForTimeout(2000)

    // Verify toolbar has fixed positioning
    const toolbarPosition = await page.evaluate(() => {
      const toolbar = document.querySelector('.fixed.top-0') as HTMLElement
      return toolbar ? window.getComputedStyle(toolbar).position : null
    })
    expect(toolbarPosition).toBe('fixed')

    // Take screenshot with toolbar visible
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/desktop-toolbar-visible.png`,
      fullPage: false
    })

    // Verify toolbar stays visible after typing
    await page.keyboard.type('Test content')
    await page.waitForTimeout(300)

    const toolbarVisibleAfterTyping = await page.locator('.fixed.top-0').isVisible()
    expect(toolbarVisibleAfterTyping).toBe(true)
  })

  test('desktop - prompt should be visible on initial load', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await login(page)
    await page.goto('/write/new')
    await page.waitForSelector('.dream-gradient')

    // Wait for prompt to load
    await page.waitForTimeout(5000)

    // Verify prompt has fixed positioning and is visible
    const promptInfo = await page.evaluate(() => {
      const prompt = document.querySelector('[class*="fixed inset-0"]') as HTMLElement
      if (!prompt) return null
      const style = window.getComputedStyle(prompt)
      return {
        position: style.position,
        opacity: style.opacity,
        visibility: style.visibility
      }
    })

    expect(promptInfo).not.toBeNull()
    expect(promptInfo?.position).toBe('fixed')
    expect(parseFloat(promptInfo?.opacity || '0')).toBeGreaterThan(0)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/desktop-prompt-visible.png`,
      fullPage: false
    })
  })

  test('desktop - no duplicate scrollbars', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await login(page)
    await page.goto('/write/new')
    await page.waitForSelector('.dream-gradient')
    await page.waitForTimeout(1000)

    // Verify outer container has overflow hidden (no scrollbar)
    const outerOverflow = await page.evaluate(() => {
      const gradient = document.querySelector('.dream-gradient') as HTMLElement
      return gradient ? window.getComputedStyle(gradient).overflow : null
    })
    expect(outerOverflow).toBe('hidden')

    // Verify only inner container has scrollbar
    const innerOverflow = await page.evaluate(() => {
      const scroll = document.querySelector('.dream-scroll-container') as HTMLElement
      return scroll ? window.getComputedStyle(scroll).overflowY : null
    })
    expect(innerOverflow).toBe('auto')

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/desktop-single-scrollbar.png`,
      fullPage: false
    })
  })

  test('mobile - toolbar should be visible', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await login(page)
    await page.goto('/write/new')
    await page.waitForSelector('.dream-gradient')
    await page.waitForTimeout(3000)

    // Verify toolbar is visible and fixed
    const toolbarInfo = await page.evaluate(() => {
      const toolbar = document.querySelector('.fixed.top-0') as HTMLElement
      if (!toolbar) return null
      const style = window.getComputedStyle(toolbar)
      const rect = toolbar.getBoundingClientRect()
      return {
        position: style.position,
        top: rect.top,
        visible: rect.height > 0
      }
    })

    expect(toolbarInfo?.position).toBe('fixed')
    expect(toolbarInfo?.top).toBe(0)
    expect(toolbarInfo?.visible).toBe(true)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/mobile-toolbar-visible.png`,
      fullPage: false
    })
  })

  test('mobile - prompt should be visible on initial load', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await login(page)
    await page.goto('/write/new')
    await page.waitForSelector('.dream-gradient')
    await page.waitForTimeout(5000)

    // Verify prompt is visible
    const promptVisible = await page.evaluate(() => {
      const prompt = document.querySelector('[class*="fixed inset-0"]') as HTMLElement
      if (!prompt) return false
      const style = window.getComputedStyle(prompt)
      return style.position === 'fixed' && parseFloat(style.opacity) > 0
    })

    expect(promptVisible).toBe(true)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/mobile-prompt-visible.png`,
      fullPage: false
    })
  })

  test('mobile - typing works and displays text', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await login(page)
    await page.goto('/write/new')
    await page.waitForSelector('.dream-gradient')
    await page.waitForTimeout(2000)

    // Type some text
    await page.keyboard.type('Mobile typing works')
    await page.waitForTimeout(500)

    // Verify text appears
    const text = await page.locator('.dream-text').textContent()
    expect(text).toContain('Mobile typing works')

    // Verify toolbar still shows word count
    const wordCount = await page.locator('.fixed.top-0').textContent()
    expect(wordCount).toContain('words')

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/mobile-typing-works.png`,
      fullPage: false
    })
  })

  test('prompt dismisses when typing starts', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await login(page)
    await page.goto('/write/new')
    await page.waitForSelector('.dream-gradient')
    await page.waitForTimeout(5000)

    // Verify prompt text is shown initially
    const promptText = await page.locator('text="Start typing to continue"').count()
    expect(promptText).toBeGreaterThan(0)

    // Type to dismiss prompt
    await page.keyboard.type('Hello world test')
    await page.waitForTimeout(500)

    // Verify typed text appears
    const typedText = await page.locator('.dream-text').textContent()
    expect(typedText).toContain('Hello')

    // Verify prompt text is no longer visible (the element may exist but hidden)
    const promptStillVisible = await page.locator('text="Start typing to continue"').isVisible()
    expect(promptStillVisible).toBe(false)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/prompt-dismissed-after-typing.png`,
      fullPage: false
    })
  })
})
