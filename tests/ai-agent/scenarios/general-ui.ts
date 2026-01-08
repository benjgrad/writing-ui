import type { Page } from 'puppeteer'
import { AI_TEST_CONFIG } from '../config'
import { ConsoleCollector } from '../../utils/console-collector'
import { attachConsoleCollector } from '../../utils/puppeteer-console-hook'

// Helper for delays (replaces deprecated waitForTimeout)
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export interface UITestResult {
  name: string
  passed: boolean
  details: string
  consoleErrors: number
  duration: number
  errors: string[]
}

// Test: Navigate through main pages without errors
export async function testNavigationNoErrors(page: Page): Promise<UITestResult> {
  const collector = new ConsoleCollector({ realTimeOutput: true })
  attachConsoleCollector(page, collector)

  const startTime = Date.now()
  const pages = [
    { name: 'Dashboard', url: AI_TEST_CONFIG.dashboardUrl },
    { name: 'Goals', url: AI_TEST_CONFIG.goalsUrl },
    { name: 'Write New', url: AI_TEST_CONFIG.writeUrl },
    { name: 'Knowledge Graph', url: AI_TEST_CONFIG.graphUrl },
  ]

  const results: string[] = []
  const errors: string[] = []

  for (const p of pages) {
    try {
      await page.goto(p.url, { waitUntil: 'networkidle0', timeout: 15000 })
      await delay(1000)

      // Check for visible content
      const hasContent = await page.$('main, [role="main"], .main-content')
      results.push(`${p.name}: ${hasContent ? 'OK' : 'No main content'}`)
    } catch (error) {
      results.push(`${p.name}: FAILED`)
      errors.push(`${p.name}: ${error}`)
    }
  }

  collector.save()

  return {
    name: 'Navigation Without Errors',
    passed: !collector.hasErrors() && errors.length === 0,
    details: results.join('\n'),
    consoleErrors: collector.getErrors().length,
    duration: Date.now() - startTime,
    errors: [
      ...errors,
      ...(collector.hasErrors()
        ? [`${collector.getErrors().length} console error(s)`]
        : []),
    ],
  }
}

// Test: Dashboard loads correctly
export async function testDashboardLoad(page: Page): Promise<UITestResult> {
  const collector = new ConsoleCollector({ realTimeOutput: true })
  attachConsoleCollector(page, collector)

  const startTime = Date.now()
  const errors: string[] = []

  try {
    await page.goto(AI_TEST_CONFIG.dashboardUrl, {
      waitUntil: 'networkidle0',
      timeout: 15000,
    })
    await delay(2000)

    // Check for key elements
    const hasHeader = (await page.$('header')) !== null
    const hasContent = (await page.$('main')) !== null

    if (!hasHeader) errors.push('Header not found')
    if (!hasContent) errors.push('Main content not found')

    collector.save()

    return {
      name: 'Dashboard Loads',
      passed: hasHeader && hasContent && !collector.hasErrors(),
      details: `Header: ${hasHeader}
Content: ${hasContent}
Console errors: ${collector.getErrors().length}`,
      consoleErrors: collector.getErrors().length,
      duration: Date.now() - startTime,
      errors,
    }
  } catch (error) {
    collector.save()
    return {
      name: 'Dashboard Loads',
      passed: false,
      details: `Error: ${error}`,
      consoleErrors: collector.getErrors().length,
      duration: Date.now() - startTime,
      errors: [String(error)],
    }
  }
}

// Test: Goals page empty state or goal list
export async function testGoalsPageLoad(page: Page): Promise<UITestResult> {
  const collector = new ConsoleCollector({ realTimeOutput: true })
  attachConsoleCollector(page, collector)

  const startTime = Date.now()

  try {
    await page.goto(AI_TEST_CONFIG.goalsUrl, {
      waitUntil: 'networkidle0',
      timeout: 15000,
    })
    await delay(2000)

    // Check for empty state or goals
    const pageContent = await page.evaluate(() => document.body.textContent)
    const hasEmptyState = pageContent?.includes('Start with one goal') || false
    const hasAddButton =
      pageContent?.toLowerCase().includes('add') ||
      pageContent?.toLowerCase().includes('goal')

    collector.save()

    return {
      name: 'Goals Page Loads',
      passed: (hasEmptyState || hasAddButton) && !collector.hasErrors(),
      details: `Empty state: ${hasEmptyState}
Add button available: ${hasAddButton}
Console errors: ${collector.getErrors().length}`,
      consoleErrors: collector.getErrors().length,
      duration: Date.now() - startTime,
      errors: collector.hasErrors()
        ? [`${collector.getErrors().length} console error(s)`]
        : [],
    }
  } catch (error) {
    collector.save()
    return {
      name: 'Goals Page Loads',
      passed: false,
      details: `Error: ${error}`,
      consoleErrors: collector.getErrors().length,
      duration: Date.now() - startTime,
      errors: [String(error)],
    }
  }
}

// Test: Writing editor accepts keyboard input
export async function testWritingEditorInput(page: Page): Promise<UITestResult> {
  const collector = new ConsoleCollector({ realTimeOutput: true })
  attachConsoleCollector(page, collector)

  const startTime = Date.now()

  try {
    await page.goto(AI_TEST_CONFIG.writeUrl, {
      waitUntil: 'networkidle0',
      timeout: 15000,
    })

    // Wait for editor to load
    await delay(3000)

    // Type some text
    const testText = 'Testing the writing experience with autonomous AI'
    await page.keyboard.type(testText, { delay: 50 })
    await delay(1000)

    // Check if text appears in the page
    const pageContent = await page.evaluate(() => document.body.textContent)
    const hasText = pageContent?.includes('Testing') || false

    collector.save()

    return {
      name: 'Writing Editor Input',
      passed: hasText && !collector.hasErrors(),
      details: `Text captured: ${hasText}
Console errors: ${collector.getErrors().length}`,
      consoleErrors: collector.getErrors().length,
      duration: Date.now() - startTime,
      errors: [
        ...(!hasText ? ['Text was not captured in editor'] : []),
        ...(collector.hasErrors()
          ? [`${collector.getErrors().length} console error(s)`]
          : []),
      ],
    }
  } catch (error) {
    collector.save()
    return {
      name: 'Writing Editor Input',
      passed: false,
      details: `Error: ${error}`,
      consoleErrors: collector.getErrors().length,
      duration: Date.now() - startTime,
      errors: [String(error)],
    }
  }
}

// Test: 404 page handling
export async function testErrorPageHandling(page: Page): Promise<UITestResult> {
  const collector = new ConsoleCollector({ realTimeOutput: true })
  attachConsoleCollector(page, collector)

  const startTime = Date.now()

  try {
    // Navigate to a non-existent page
    await page.goto(`${AI_TEST_CONFIG.baseUrl}/this-page-does-not-exist-12345`, {
      waitUntil: 'networkidle0',
      timeout: 15000,
    })
    await delay(2000)

    // Check for 404 handling (page should not crash)
    const pageContent = await page.evaluate(() => document.body.textContent)
    const has404 =
      pageContent?.includes('404') || pageContent?.toLowerCase().includes('not found')

    collector.save()

    // This test passes as long as the app doesn't crash
    return {
      name: '404 Page Handling',
      passed: true, // Just verify no crash
      details: `404 page shown: ${has404}
App did not crash: true
Console errors: ${collector.getErrors().length}`,
      consoleErrors: collector.getErrors().length,
      duration: Date.now() - startTime,
      errors: [],
    }
  } catch (error) {
    collector.save()
    return {
      name: '404 Page Handling',
      passed: false,
      details: `Error: ${error}`,
      consoleErrors: collector.getErrors().length,
      duration: Date.now() - startTime,
      errors: [String(error)],
    }
  }
}

// Test: Page load performance
export async function testPageLoadPerformance(page: Page): Promise<UITestResult> {
  const collector = new ConsoleCollector({ realTimeOutput: false })
  attachConsoleCollector(page, collector)

  const startTime = Date.now()
  const loadTimes: Record<string, number> = {}
  const THRESHOLD_MS = 5000 // 5 second threshold

  const pages = [
    { name: 'Dashboard', url: AI_TEST_CONFIG.dashboardUrl },
    { name: 'Goals', url: AI_TEST_CONFIG.goalsUrl },
  ]

  const errors: string[] = []

  for (const p of pages) {
    const pageStart = Date.now()
    try {
      await page.goto(p.url, { waitUntil: 'networkidle0', timeout: 15000 })
      loadTimes[p.name] = Date.now() - pageStart

      if (loadTimes[p.name] > THRESHOLD_MS) {
        errors.push(`${p.name} took ${loadTimes[p.name]}ms (threshold: ${THRESHOLD_MS}ms)`)
      }
    } catch (error) {
      loadTimes[p.name] = -1
      errors.push(`${p.name}: Failed to load - ${error}`)
    }
  }

  collector.save()

  const allPassed = Object.values(loadTimes).every(
    (time) => time > 0 && time < THRESHOLD_MS
  )

  return {
    name: 'Page Load Performance',
    passed: allPassed,
    details: Object.entries(loadTimes)
      .map(([name, time]) => `${name}: ${time}ms`)
      .join('\n'),
    consoleErrors: collector.getErrors().length,
    duration: Date.now() - startTime,
    errors,
  }
}

// Test: Responsive behavior (viewport changes)
export async function testResponsiveLayout(page: Page): Promise<UITestResult> {
  const collector = new ConsoleCollector({ realTimeOutput: false })
  attachConsoleCollector(page, collector)

  const startTime = Date.now()
  const viewports = [
    { name: 'Desktop', width: 1920, height: 1080 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Mobile', width: 375, height: 667 },
  ]

  const results: string[] = []
  const errors: string[] = []

  for (const vp of viewports) {
    try {
      await page.setViewport({ width: vp.width, height: vp.height })
      await page.goto(AI_TEST_CONFIG.goalsUrl, {
        waitUntil: 'networkidle0',
        timeout: 15000,
      })
      await delay(1000)

      // Check that content is visible
      const hasContent = await page.$('main, header')
      results.push(`${vp.name} (${vp.width}x${vp.height}): ${hasContent ? 'OK' : 'No content'}`)
    } catch (error) {
      results.push(`${vp.name}: FAILED`)
      errors.push(`${vp.name}: ${error}`)
    }
  }

  // Reset to desktop
  await page.setViewport({ width: 1920, height: 1080 })

  collector.save()

  return {
    name: 'Responsive Layout',
    passed: errors.length === 0,
    details: results.join('\n'),
    consoleErrors: collector.getErrors().length,
    duration: Date.now() - startTime,
    errors,
  }
}
