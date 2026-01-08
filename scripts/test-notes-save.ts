#!/usr/bin/env npx tsx
/**
 * Test script to debug notes saving on goal card
 */

import puppeteer from 'puppeteer'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com'
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123'

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  console.log('🧪 Testing notes save on goal card...\n')

  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 50,
    args: ['--window-size=1400,900']
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1400, height: 900 })

  // Capture console logs and network
  page.on('console', msg => {
    const text = msg.text()
    if (text.includes('goals') || text.includes('update') || text.includes('notes')) {
      console.log(`[Browser] ${text}`)
    }
  })

  page.on('response', async response => {
    const url = response.url()
    if (url.includes('/api/goals/') && !url.includes('micro-wins')) {
      const status = response.status()
      console.log(`[API] ${response.request().method()} ${url} - ${status}`)
      if (status !== 200) {
        try {
          const body = await response.json()
          console.log(`[API] Response body:`, body)
        } catch {}
      }
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

    // 3. Find and click Notes button
    console.log('3️⃣ Looking for Notes button...')
    const buttons = await page.$$('button')
    let notesBtn = null
    for (const btn of buttons) {
      const text = await btn.evaluate(el => el.textContent)
      if (text?.includes('Notes')) {
        notesBtn = btn
        break
      }
    }

    if (!notesBtn) {
      console.log('   ⚠️ No Notes button found. Taking screenshot...')
      await page.screenshot({ path: 'tests/logs/no-notes-button.png' })
      await browser.close()
      return
    }

    console.log('   ✓ Found Notes button\n')

    // 4. Click Notes button
    console.log('4️⃣ Opening notes section...')
    await notesBtn.click()
    await sleep(1000)

    // 5. Find notes textarea
    console.log('5️⃣ Finding notes textarea...')
    const notesTextarea = await page.$('textarea[placeholder*="Capture"]')
    if (!notesTextarea) {
      console.log('   ❌ Notes textarea not found')
      await page.screenshot({ path: 'tests/logs/no-notes-textarea.png' })
      await browser.close()
      return
    }

    console.log('   ✓ Found notes textarea\n')

    // 6. Type some notes
    console.log('6️⃣ Typing notes...')
    const testNote = `Test note at ${new Date().toISOString()}`
    await notesTextarea.click({ clickCount: 3 }) // Select all
    await notesTextarea.type(testNote)
    console.log(`   Typed: "${testNote}"\n`)

    // 7. Click outside to trigger blur save
    console.log('7️⃣ Clicking outside to trigger save (blur)...')
    await page.click('h3') // Click on goal title to blur textarea
    await sleep(2000)

    console.log('   Waiting for API call...\n')
    await sleep(3000)

    // 8. Refresh page to verify save
    console.log('8️⃣ Refreshing page to verify save...')
    await page.reload({ waitUntil: 'networkidle2' })
    await sleep(2000)

    // 9. Check if notes are still there
    console.log('9️⃣ Checking if notes persisted...')

    // Click Notes button again
    const buttonsAfterRefresh = await page.$$('button')
    for (const btn of buttonsAfterRefresh) {
      const text = await btn.evaluate(el => el.textContent)
      if (text?.includes('Notes')) {
        await btn.click()
        break
      }
    }
    await sleep(1000)

    const notesTextareaAfter = await page.$('textarea[placeholder*="Capture"]')
    if (notesTextareaAfter) {
      const savedValue = await notesTextareaAfter.evaluate(el => (el as HTMLTextAreaElement).value)
      console.log(`   Saved value: "${savedValue}"`)

      if (savedValue.includes('Test note')) {
        console.log('   ✅ Notes saved successfully!')
      } else {
        console.log('   ❌ Notes did NOT persist after refresh!')
      }
    }

    await page.screenshot({ path: 'tests/logs/notes-after-refresh.png' })
    console.log('   📸 Screenshot saved\n')

    console.log('✅ Test complete!')

  } catch (error) {
    console.error('❌ Test failed:', error)
    await page.screenshot({ path: 'tests/logs/notes-test-error.png' })
  } finally {
    await sleep(2000)
    await browser.close()
  }
}

main().catch(console.error)
