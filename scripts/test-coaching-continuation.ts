#!/usr/bin/env npx tsx
/**
 * Test script to debug coaching continuation flow
 * Tests if updating via continued coaching session actually saves to database
 */

import puppeteer from 'puppeteer'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com'
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123'

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  console.log('🧪 Testing coaching continuation flow...\n')

  const browser = await puppeteer.launch({
    headless: false, // Watch the test
    slowMo: 50,
    args: ['--window-size=1400,900']
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1400, height: 900 })

  // Capture console logs
  page.on('console', msg => {
    const text = msg.text()
    if (text.includes('useGoalCoaching') || text.includes('coach-goal') || text.includes('updateGoalInDb')) {
      console.log(`[Browser] ${text}`)
    }
  })

  try {
    // 1. Login
    console.log('1️⃣ Logging in...')
    await page.goto(`${BASE_URL}/login`)
    await page.waitForSelector('input[type="email"]')
    await page.type('input[type="email"]', TEST_EMAIL)
    await page.type('input[type="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForNavigation({ waitUntil: 'networkidle2' })
    console.log('   ✓ Logged in\n')

    // 2. Go to goals page
    console.log('2️⃣ Navigating to goals page...')
    await page.goto(`${BASE_URL}/goals`)
    await page.waitForSelector('main', { timeout: 10000 })
    await sleep(2000)
    console.log('   ✓ On goals page\n')

    // 3. Check if there's a goal with a coaching button
    console.log('3️⃣ Looking for goal with Coaching button...')

    // Find button by text content
    const buttons = await page.$$('button')
    let coachingBtn = null
    for (const btn of buttons) {
      const text = await btn.evaluate(el => el.textContent)
      if (text?.includes('Coaching')) {
        coachingBtn = btn
        break
      }
    }

    if (!coachingBtn) {
      console.log('   ⚠️ No goals with coaching history found. Create a goal first.')
      await browser.close()
      return
    }

    console.log('   ✓ Found Coaching button\n')

    // 4. Click the coaching button
    console.log('4️⃣ Opening coaching history...')
    await coachingBtn.click()
    await sleep(3000)

    // 5. Check if modal opened and has input field
    console.log('5️⃣ Checking for input field in modal...')
    const textarea = await page.$('textarea[placeholder*="Update"]')
    const textareaAlt = await page.$('textarea[placeholder*="Type"]')
    const inputField = textarea || textareaAlt

    if (!inputField) {
      console.log('   ❌ No input field found! This is the bug.')

      // Take screenshot
      await page.screenshot({ path: 'tests/logs/coaching-no-input.png' })
      console.log('   📸 Screenshot saved to tests/logs/coaching-no-input.png')

      // Check if the modal is open
      const modalHeader = await page.$('h2')
      if (modalHeader) {
        const headerText = await modalHeader.evaluate(el => el.textContent)
        console.log(`   Modal header: "${headerText}"`)
      }

      // Check for any textareas
      const allTextareas = await page.$$('textarea')
      console.log(`   Found ${allTextareas.length} textareas on page`)

      await browser.close()
      return
    }

    console.log('   ✓ Input field found!\n')

    // 6. Type a message to update the goal
    console.log('6️⃣ Sending continuation message...')
    await inputField.type('I want to update my motivation. My new why is: To feel more confident and capable in my daily life.')
    await sleep(500)

    // Find and click send button
    const sendButton = await page.$('button[type="submit"]')
    if (sendButton) {
      await sendButton.click()
      console.log('   ✓ Message sent, waiting for response...\n')
      await sleep(5000) // Wait for AI response
    }

    // 7. Check console logs for update status
    console.log('7️⃣ Check browser console output above for update status')

    // Take final screenshot
    await page.screenshot({ path: 'tests/logs/coaching-continuation-result.png' })
    console.log('   📸 Screenshot saved to tests/logs/coaching-continuation-result.png\n')

    // 8. Close modal and check if goal was updated
    console.log('8️⃣ Closing modal to check goal card...')
    const closeBtn = await page.$('button:has(svg path[d="M18 6 6 18"])')
    if (closeBtn) {
      await closeBtn.click()
      await sleep(2000)
    }

    // Take screenshot of goal card
    await page.screenshot({ path: 'tests/logs/goal-card-after-update.png' })
    console.log('   📸 Screenshot saved to tests/logs/goal-card-after-update.png\n')

    console.log('✅ Test complete! Check the screenshots and console output.')

  } catch (error) {
    console.error('❌ Test failed:', error)
    await page.screenshot({ path: 'tests/logs/coaching-continuation-error.png' })
  } finally {
    await sleep(2000)
    await browser.close()
  }
}

main().catch(console.error)
