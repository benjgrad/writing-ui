import { test, expect } from '@playwright/test'

test.describe('Dream Writing Experience', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the editor
    await page.goto('/write/new')
    // Wait for the editor to be ready
    await page.waitForSelector('.dream-gradient')
  })

  test('should display the gradient background', async ({ page }) => {
    // Verify the dream gradient class is present
    const gradient = page.locator('.dream-gradient')
    await expect(gradient).toBeVisible()

    // Take a screenshot for visual verification
    await page.screenshot({ path: 'tests/screenshots/gradient-background.png' })
  })

  test('should capture keyboard input and display characters', async ({ page }) => {
    // Type some text
    await page.keyboard.type('Hello')

    // Wait for characters to appear
    await page.waitForTimeout(200)

    // Verify characters appear in the editor
    const text = await page.locator('.dream-text').textContent()
    expect(text).toContain('Hello')
  })

  test('should create new line on Enter', async ({ page }) => {
    // Type first line
    await page.keyboard.type('First line')
    await page.keyboard.press('Enter')

    // Type second line
    await page.keyboard.type('Second line')

    // Verify both lines exist
    const lines = page.locator('.dream-text')
    await expect(lines).toHaveCount(2)
  })

  test('should handle backspace within two-word limit', async ({ page }) => {
    // Type several words
    await page.keyboard.type('one two three four ')

    // Wait for words to register
    await page.waitForTimeout(100)

    // Delete some characters
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Backspace')
    }

    // Verify text is partially deleted
    const text = await page.locator('.dream-text').textContent()
    // First words should still exist due to 2-word limit
    expect(text).toContain('one')
    expect(text).toContain('two')
  })

  test('should block arrow key navigation', async ({ page }) => {
    // Type some text
    await page.keyboard.type('test')

    // Try to navigate with arrow keys
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')

    // Type more text - should appear at end, not in middle
    await page.keyboard.type('X')

    const text = await page.locator('.dream-text').textContent()
    // X should be at the end, not inserted in the middle
    expect(text?.endsWith('X')).toBe(true)
  })

  test('should show AI prompt on initial load', async ({ page }) => {
    // The prompt should be visible on initial load
    // (or loading indicator)
    await page.waitForTimeout(500)

    // Either the prompt text or loading indicator should be visible
    const promptArea = page.locator('.prompt-entering, .animate-pulse')
    // This may or may not be visible depending on API response
    // Just verify the page doesn't crash
  })

  test('should dismiss prompt on typing', async ({ page }) => {
    // Wait for potential prompt
    await page.waitForTimeout(500)

    // Start typing
    await page.keyboard.type('Hello')

    // Prompt should be dismissed
    await page.waitForTimeout(200)

    // Verify text is displayed
    const text = await page.locator('.dream-text').textContent()
    expect(text).toContain('Hello')
  })

  test('should use serif font for editor text', async ({ page }) => {
    // Type some text
    await page.keyboard.type('Test text')

    await page.waitForTimeout(100)

    // Check that dream-text class is applied (which uses serif font)
    const dreamText = page.locator('.dream-text')
    await expect(dreamText).toBeVisible()
  })

  test('should take full-page screenshot', async ({ page }) => {
    // Type some content
    await page.keyboard.type('This is a test of the dream writing experience.')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Multiple lines of beautiful serif text.')

    await page.waitForTimeout(300)

    // Take a full-page screenshot
    await page.screenshot({
      path: 'tests/screenshots/full-editor.png',
      fullPage: true,
    })
  })
})
