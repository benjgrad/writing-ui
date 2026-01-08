import type { Page } from 'puppeteer'
import { GoalCoachingTest, type TestResult } from '../goal-coaching-test'
import { AI_TEST_CONFIG, STAGE_ORDER } from '../config'
import { ConsoleCollector } from '../../utils/console-collector'
import { attachConsoleCollector } from '../../utils/puppeteer-console-hook'

// Helper for delays (replaces deprecated waitForTimeout)
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export interface ScenarioResult {
  name: string
  passed: boolean
  details: string
  duration: number
  errors: string[]
}

// Scenario 1: Complete happy path with AI responses
export async function testHappyPathWithAI(page: Page): Promise<ScenarioResult> {
  const test = new GoalCoachingTest(page, { useAI: true, verbose: true })
  const result = await test.run()

  return {
    name: 'Happy Path - AI Responses',
    passed: result.success && result.goalCreated && result.consoleErrors === 0,
    details: `Stages: ${result.stagesCompleted.join(' -> ')}
Goal: ${result.goalData?.title || 'N/A'}
Why: ${result.goalData?.why || 'N/A'}
First step: ${result.goalData?.microWin || 'N/A'}
Console Errors: ${result.consoleErrors}
Console Warnings: ${result.consoleWarnings}
Log file: ${result.logFile}`,
    duration: result.duration,
    errors: result.consoleErrors > 0 ? ['Console errors detected during test'] : [],
  }
}

// Scenario 2: Complete happy path with predefined responses (deterministic)
export async function testHappyPathPredefined(page: Page): Promise<ScenarioResult> {
  const test = new GoalCoachingTest(page, { useAI: false, verbose: true })
  const result = await test.run()

  return {
    name: 'Happy Path - Predefined Responses',
    passed: result.success && result.goalCreated,
    details: `Stages: ${result.stagesCompleted.join(' -> ')}
Goal: ${result.goalData?.title || 'N/A'}
Duration: ${result.duration}ms`,
    duration: result.duration,
    errors: result.goalCreated ? [] : ['Goal was not created'],
  }
}

// Scenario 3: Verify all stages are visited in correct order
export async function testAllStagesVisited(page: Page): Promise<ScenarioResult> {
  const test = new GoalCoachingTest(page, { useAI: false, verbose: false })
  const result = await test.run()

  const expectedStages = STAGE_ORDER.slice(0, -1) // All except 'complete'
  const allVisited = expectedStages.every((s) =>
    result.stagesCompleted.includes(s)
  )

  // Check order is correct
  let inOrder = true
  let lastIndex = -1
  for (const stage of result.stagesCompleted) {
    const currentIndex = STAGE_ORDER.indexOf(stage)
    if (currentIndex < lastIndex) {
      inOrder = false
      break
    }
    lastIndex = currentIndex
  }

  return {
    name: 'All Stages Visited in Order',
    passed: allVisited && inOrder && result.goalCreated,
    details: `Expected: ${expectedStages.join(', ')}
Visited: ${result.stagesCompleted.join(', ')}
In Order: ${inOrder}`,
    duration: result.duration,
    errors: [
      ...(!allVisited ? ['Not all stages were visited'] : []),
      ...(!inOrder ? ['Stages were not in correct order'] : []),
      ...(!result.goalCreated ? ['Goal was not created'] : []),
    ],
  }
}

// Scenario 4: Cancel mid-conversation
export async function testCancelMidConversation(page: Page): Promise<ScenarioResult> {
  const collector = new ConsoleCollector({ realTimeOutput: false })
  attachConsoleCollector(page, collector)

  const startTime = Date.now()
  const errors: string[] = []

  try {
    // Navigate and start
    await page.goto(AI_TEST_CONFIG.goalsUrl, { waitUntil: 'networkidle0' })
    await delay(2000)

    // Find and click add goal button
    const buttons = await page.$$('button')
    let addButton = null
    for (const button of buttons) {
      const text = await button.evaluate((el) => el.textContent)
      if (text?.toLowerCase().includes('add') || text?.includes('goal')) {
        addButton = button
        break
      }
    }

    if (!addButton) {
      return {
        name: 'Cancel Mid-Conversation',
        passed: false,
        details: 'Add goal button not found',
        duration: Date.now() - startTime,
        errors: ['Add goal button not found'],
      }
    }

    await addButton.click()
    await page.waitForSelector(AI_TEST_CONFIG.selectors.goalCoachModal, {
      timeout: 5000,
    })

    // Wait for first message
    await delay(3000)

    // Send one message
    const input = await page.$(AI_TEST_CONFIG.selectors.chatInput)
    if (input) {
      await input.type('I want to meditate daily')
      await page.keyboard.press('Enter')
      await delay(3000)
    }

    // Click close button
    const closeButton = await page.$('button:has(svg)')
    if (closeButton) {
      await closeButton.click()
    } else {
      // Try clicking the backdrop
      const backdrop = await page.$('.bg-black\\/40')
      if (backdrop) {
        await backdrop.click()
      }
    }

    await delay(1000)

    // Verify modal is closed
    const modal = await page.$(AI_TEST_CONFIG.selectors.goalCoachModal)
    const modalGone = modal === null

    if (!modalGone) {
      errors.push('Modal did not close')
    }

    if (collector.hasErrors()) {
      errors.push('Console errors detected during cancel')
    }

    collector.save()

    return {
      name: 'Cancel Mid-Conversation',
      passed: modalGone && !collector.hasErrors(),
      details: `Modal closed: ${modalGone}
Console errors: ${collector.getErrors().length}`,
      duration: Date.now() - startTime,
      errors,
    }
  } catch (error) {
    collector.save()
    return {
      name: 'Cancel Mid-Conversation',
      passed: false,
      details: `Error: ${error}`,
      duration: Date.now() - startTime,
      errors: [String(error)],
    }
  }
}

// Scenario 5: Verify goal appears after creation
export async function testGoalAppearsAfterCreation(page: Page): Promise<ScenarioResult> {
  const test = new GoalCoachingTest(page, { useAI: false, verbose: false })
  const result = await test.run()

  if (!result.goalCreated) {
    return {
      name: 'Goal Appears After Creation',
      passed: false,
      details: 'Goal was not created',
      duration: result.duration,
      errors: ['Goal creation failed'],
    }
  }

  // Wait for modal to close and page to update
  await delay(4000)

  // Check if goal appears on the page
  const pageContent = await page.evaluate(() => document.body.textContent)
  const goalTitle = result.goalData?.title || 'focus'

  // Look for the goal title or parts of it in the page
  const titleWords = goalTitle.toLowerCase().split(' ')
  const found = titleWords.some((word) =>
    pageContent?.toLowerCase().includes(word)
  )

  return {
    name: 'Goal Appears After Creation',
    passed: found,
    details: `Looking for: "${goalTitle}"
Found in page: ${found}`,
    duration: result.duration,
    errors: found ? [] : ['Goal not found on page after creation'],
  }
}

// Scenario 6: Test with randomized responses
export async function testRandomizedResponses(page: Page): Promise<ScenarioResult> {
  const test = new GoalCoachingTest(page, {
    useAI: false,
    verbose: true,
    randomizeResponses: true,
  })
  const result = await test.run()

  return {
    name: 'Randomized Predefined Responses',
    passed: result.success && result.goalCreated,
    details: `Stages: ${result.stagesCompleted.join(' -> ')}
Goal: ${result.goalData?.title || 'N/A'}
Conversation turns: ${result.conversationLog.length}`,
    duration: result.duration,
    errors: result.goalCreated ? [] : ['Goal was not created'],
  }
}

// Scenario 7: Verify no console errors during happy path
export async function testNoConsoleErrors(page: Page): Promise<ScenarioResult> {
  const test = new GoalCoachingTest(page, { useAI: false, verbose: true })
  const result = await test.run()

  const errors: string[] = []

  if (result.consoleErrors > 0) {
    errors.push(`${result.consoleErrors} console error(s) detected`)
  }

  // Warnings are acceptable but we'll note them
  const warningNote =
    result.consoleWarnings > 0
      ? `\n${result.consoleWarnings} warning(s) detected (acceptable)`
      : ''

  return {
    name: 'No Console Errors',
    passed: result.consoleErrors === 0 && result.goalCreated,
    details: `Goal created: ${result.goalCreated}
Console errors: ${result.consoleErrors}${warningNote}
Log file: ${result.logFile}`,
    duration: result.duration,
    errors,
  }
}
