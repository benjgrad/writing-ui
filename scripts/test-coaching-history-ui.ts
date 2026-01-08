#!/usr/bin/env npx tsx
/**
 * Test the coaching history UI flow via Puppeteer
 * Usage: TEST_USER_EMAIL="test@example.com" TEST_USER_PASSWORD="testpassword123" npx tsx scripts/test-coaching-history-ui.ts
 */

import puppeteer from 'puppeteer'

const BASE_URL = 'http://localhost:3000'
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com'
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function main() {
  console.log('=== Coaching History UI Test ===\n')

  const browser = await puppeteer.launch({
    headless: false,  // Show browser for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  })

  const page = await browser.newPage()

  // Enable console log capture
  page.on('console', msg => {
    const type = msg.type()
    if (type === 'error' || type === 'warn' || msg.text().includes('coaching')) {
      console.log(`[Browser ${type}]`, msg.text())
    }
  })

  // Capture network requests for debugging
  page.on('response', async response => {
    const url = response.url()
    if (url.includes('coaching-sessions')) {
      console.log(`[Network] ${response.status()} ${url}`)
      try {
        const body = await response.text()
        console.log(`[Response] ${body.substring(0, 200)}...`)
      } catch {}
    }
  })

  try {
    // 1. Login
    console.log('1. Logging in...')
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' })
    await delay(1000)

    await page.type('input[type="email"]', TEST_EMAIL, { delay: 30 })
    await page.type('input[type="password"]', TEST_PASSWORD, { delay: 30 })
    await page.click('button[type="submit"]')
    await delay(3000)

    console.log('   Current URL:', page.url())
    if (page.url().includes('login')) {
      console.error('   Login failed!')
      throw new Error('Login failed')
    }
    console.log('   Logged in successfully!')

    // 2. Navigate to goals page
    console.log('\n2. Navigating to goals page...')
    await page.goto(`${BASE_URL}/goals`, { waitUntil: 'networkidle0' })
    await delay(2000)

    // 3. Take a screenshot to see what's on the page
    console.log('\n3. Taking screenshot of goals page...')
    await page.screenshot({ path: 'tests/logs/goals-page-debug.png', fullPage: true })
    console.log('   Screenshot saved to tests/logs/goals-page-debug.png')

    // Look for all buttons on the page
    console.log('\n4. Looking for buttons on the page...')
    const buttons = await page.$$('button')
    console.log(`   Found ${buttons.length} buttons total`)
    for (const btn of buttons) {
      const text = await btn.evaluate(el => el.textContent?.trim())
      if (text && text.length > 0 && text.length < 50) {
        console.log(`      Button: "${text}"`)
      }
    }

    // Try to find the coaching button by looking for buttons containing "Coaching" text
    let coachingButton = null
    for (const btn of buttons) {
      const text = await btn.evaluate(el => el.textContent)
      if (text?.includes('Coaching')) {
        coachingButton = btn
        break
      }
    }

    if (!coachingButton) {
      console.error('   Could not find coaching history button!')
    } else {
      console.log('   Found coaching button, clicking...')
      await coachingButton.click()
      await delay(3000)

      // Check if the modal opened
      const modal = await page.$('.animate-slide-in-right')
      if (modal) {
        console.log('   Coaching modal opened!')

        // Wait a moment for messages to render
        await delay(2000)

        // Take a screenshot of the modal
        await page.screenshot({ path: 'tests/logs/coaching-modal-debug.png', fullPage: true })
        console.log('   Screenshot saved to tests/logs/coaching-modal-debug.png')

        // Look for messages (look for message containers, not just styled divs)
        const messages = await page.$$('[class*="bg-[#f1f5f9]"], [class*="bg-[#6366f1]"]')
        console.log(`   Found ${messages.length} potential message elements`)

        // Try to get the actual message texts
        const messageTexts = await page.$$eval(
          '.animate-slide-in-right [class*="max-w-[80%]"]',
          (els) => els.map(el => {
            const text = el.textContent?.trim()
            return text ? text.substring(0, 50) + (text.length > 50 ? '...' : '') : '(empty)'
          })
        )
        console.log(`   Found ${messageTexts.length} actual messages:`)
        messageTexts.forEach((text, i) => console.log(`      ${i + 1}. ${text}`))

        // Check for "Coaching History" title
        const title = await page.$eval('.animate-slide-in-right h2', el => el.textContent).catch(() => null)
        console.log(`   Modal title: ${title}`)
      } else {
        console.error('   Modal did not open!')
      }
    }

    // Keep browser open briefly
    console.log('\n5. Keeping browser open for 5 seconds for inspection...')
    await delay(5000)

  } catch (err) {
    console.error('Test error:', err)
  } finally {
    await browser.close()
  }

  console.log('\n=== Test Complete ===')
}

main().catch(console.error)
