import type { Page } from 'puppeteer'

// Test user credentials - these should match a user created in Supabase
// You can create this user via the Supabase dashboard or signup flow
export const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PASSWORD || 'testpassword123',
}

// Helper function for delays
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Login as the test user via the UI
 * @param page Puppeteer page instance
 * @param baseUrl Base URL of the application
 * @returns true if login succeeded, false otherwise
 */
export async function loginAsTestUser(
  page: Page,
  baseUrl = 'http://localhost:3000'
): Promise<boolean> {
  console.log(`[TestAuth] Logging in as ${TEST_USER.email}...`)

  try {
    // Navigate to login page
    await page.goto(`${baseUrl}/login`, {
      waitUntil: 'networkidle0',
      timeout: 15000,
    })
    await delay(1000)

    // Fill in email
    const emailInput = await page.$('input[type="email"]')
    if (!emailInput) {
      console.error('[TestAuth] Email input not found')
      return false
    }
    await emailInput.click()
    await emailInput.type(TEST_USER.email, { delay: 30 })

    // Fill in password
    const passwordInput = await page.$('input[type="password"]')
    if (!passwordInput) {
      console.error('[TestAuth] Password input not found')
      return false
    }
    await passwordInput.click()
    await passwordInput.type(TEST_USER.password, { delay: 30 })

    // Click sign in button
    const signInButton = await page.$('button[type="submit"]')
    if (!signInButton) {
      console.error('[TestAuth] Sign in button not found')
      return false
    }
    await signInButton.click()

    // Wait for redirect (successful login redirects to /write/new)
    await delay(2000)

    // Check if we're logged in by looking for the sign out button or checking URL
    const currentUrl = page.url()
    const isLoggedIn =
      !currentUrl.includes('/login') && !currentUrl.includes('/signup')

    if (isLoggedIn) {
      console.log('[TestAuth] Login successful!')
      return true
    } else {
      // Check for error message
      const errorEl = await page.$('.text-red-500')
      if (errorEl) {
        const errorText = await errorEl.evaluate((el) => el.textContent)
        console.error(`[TestAuth] Login failed: ${errorText}`)
      } else {
        console.error('[TestAuth] Login failed: Unknown error')
      }
      return false
    }
  } catch (error) {
    console.error('[TestAuth] Login error:', error)
    return false
  }
}

/**
 * Check if the page has an authenticated session
 * @param page Puppeteer page instance
 * @returns true if user appears to be logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    // Look for sign out button or user email display
    const signOutButton = await page.$('button:has-text("Sign out")')
    if (signOutButton) return true

    // Alternative: check for protected content
    const protectedContent = await page.$('[data-authenticated="true"]')
    if (protectedContent) return true

    // Check URL isn't auth page
    const url = page.url()
    return !url.includes('/login') && !url.includes('/signup')
  } catch {
    return false
  }
}

/**
 * Logout the current user
 * @param page Puppeteer page instance
 */
export async function logout(page: Page): Promise<void> {
  console.log('[TestAuth] Logging out...')

  try {
    // Find and click sign out button
    const buttons = await page.$$('button')
    for (const button of buttons) {
      const text = await button.evaluate((el) => el.textContent)
      if (text?.toLowerCase().includes('sign out')) {
        await button.click()
        await delay(1000)
        console.log('[TestAuth] Logged out successfully')
        return
      }
    }
    console.log('[TestAuth] Sign out button not found')
  } catch (error) {
    console.error('[TestAuth] Logout error:', error)
  }
}

/**
 * Ensure we're logged in, logging in if necessary
 * @param page Puppeteer page instance
 * @param baseUrl Base URL of the application
 * @returns true if we're now logged in
 */
export async function ensureLoggedIn(
  page: Page,
  baseUrl = 'http://localhost:3000'
): Promise<boolean> {
  // First check if already logged in
  if (await isLoggedIn(page)) {
    console.log('[TestAuth] Already logged in')
    return true
  }

  // Otherwise, login
  return loginAsTestUser(page, baseUrl)
}
