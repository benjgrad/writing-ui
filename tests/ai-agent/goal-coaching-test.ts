import type { Page } from 'puppeteer'
import { AI_TEST_CONFIG, type CoachingStage, STAGE_ORDER } from './config'
import {
  generateTestResponse,
  getPredefinedResponse,
  getRandomPredefinedResponse,
} from './response-generator'
import { ConsoleCollector } from '../utils/console-collector'
import { attachConsoleCollector } from '../utils/puppeteer-console-hook'

// Helper for delays (replaces deprecated waitForTimeout)
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export interface TestOptions {
  useAI?: boolean // true = use Claude API, false = use predefined responses
  verbose?: boolean
  maxTurns?: number
  randomizeResponses?: boolean // Use random predefined responses for variety
}

export interface GoalData {
  title?: string
  why?: string
  microWin?: string
}

export interface TestResult {
  success: boolean
  stagesCompleted: CoachingStage[]
  goalCreated: boolean
  goalData?: GoalData
  consoleErrors: number
  consoleWarnings: number
  conversationLog: Array<{ role: string; content: string; stage: CoachingStage }>
  duration: number
  logFile: string
}

export class GoalCoachingTest {
  private page: Page
  private collector: ConsoleCollector
  private conversationLog: Array<{
    role: string
    content: string
    stage: CoachingStage
  }> = []
  private options: Required<TestOptions>

  constructor(page: Page, options: TestOptions = {}) {
    this.page = page
    this.options = {
      useAI: options.useAI ?? true,
      verbose: options.verbose ?? true,
      maxTurns: options.maxTurns ?? 12,
      randomizeResponses: options.randomizeResponses ?? false,
    }
    this.collector = new ConsoleCollector({
      realTimeOutput: this.options.verbose,
    })
    attachConsoleCollector(page, this.collector)
  }

  async run(): Promise<TestResult> {
    const startTime = Date.now()
    const stagesCompleted: CoachingStage[] = []
    let goalCreated = false
    let goalData: GoalData = {}

    try {
      // Navigate to goals page
      this.log('Navigating to goals page...')
      await this.page.goto(AI_TEST_CONFIG.goalsUrl, {
        waitUntil: 'networkidle0',
        timeout: 10000,
      })
      await delay(AI_TEST_CONFIG.waitAfterNavigation)

      // Find and click the add goal button
      this.log('Looking for add goal button...')
      const addButton = await this.findAddGoalButton()
      if (!addButton) {
        throw new Error('Add goal button not found')
      }

      await addButton.click()
      this.log('Clicked add goal button')

      // Wait for modal to appear
      await this.page.waitForSelector(AI_TEST_CONFIG.selectors.goalCoachModal, {
        timeout: 5000,
      })
      this.log('Goal Coach modal opened')

      // Wait for initial AI message
      await this.waitForAssistantMessage()

      let turn = 0
      let currentStage: CoachingStage = 'welcome'

      while (turn < this.options.maxTurns) {
        turn++
        this.log(`\n--- Turn ${turn} (Stage: ${currentStage}) ---`)

        // Get the latest assistant message
        const coachMessage = await this.getLatestAssistantMessage()
        if (!coachMessage) {
          this.log('No coach message found, waiting...')
          await delay(1000)
          continue
        }

        this.conversationLog.push({
          role: 'assistant',
          content: coachMessage,
          stage: currentStage,
        })
        this.log(`Coach: ${coachMessage.substring(0, 100)}${coachMessage.length > 100 ? '...' : ''}`)

        // Check for completion
        const isComplete = await this.checkForCompletion()
        if (isComplete) {
          if (!stagesCompleted.includes('complete')) {
            stagesCompleted.push('complete')
          }
          goalCreated = true
          goalData = await this.extractGoalData()
          this.log('Goal creation complete!')
          break
        }

        // Detect current stage from UI
        currentStage = await this.detectStage(stagesCompleted)
        if (!stagesCompleted.includes(currentStage)) {
          stagesCompleted.push(currentStage)
        }

        // Generate and send response
        const userResponse = await this.generateResponse(currentStage, coachMessage)
        this.conversationLog.push({
          role: 'user',
          content: userResponse,
          stage: currentStage,
        })
        this.log(`User: ${userResponse}`)

        await this.sendMessage(userResponse)
        await this.waitForAssistantMessage()
      }

      if (turn >= this.options.maxTurns && !goalCreated) {
        this.log('Max turns reached without completing goal')
      }

      const logFile = this.collector.save()

      return {
        success: goalCreated && !this.collector.hasErrors(),
        stagesCompleted,
        goalCreated,
        goalData,
        consoleErrors: this.collector.getErrors().length,
        consoleWarnings: this.collector.getWarnings().length,
        conversationLog: this.conversationLog,
        duration: Date.now() - startTime,
        logFile,
      }
    } catch (error) {
      this.log(`Error: ${error}`)
      const logFile = this.collector.save()

      return {
        success: false,
        stagesCompleted,
        goalCreated: false,
        consoleErrors: this.collector.getErrors().length,
        consoleWarnings: this.collector.getWarnings().length,
        conversationLog: this.conversationLog,
        duration: Date.now() - startTime,
        logFile,
      }
    }
  }

  private async findAddGoalButton(): Promise<ReturnType<Page['$']>> {
    // Try multiple selectors for the add goal button
    const selectors = [
      'button:has-text("Add your first goal")',
      'button:has-text("Add")',
      '[data-testid="add-goal-button"]',
    ]

    for (const selector of selectors) {
      try {
        const button = await this.page.$(selector)
        if (button) return button
      } catch {
        // Selector not supported or element not found
      }
    }

    // Fallback: find any button that might be the add button
    const buttons = await this.page.$$('button')
    for (const button of buttons) {
      const text = await button.evaluate((el) => el.textContent)
      if (text?.toLowerCase().includes('add') || text?.toLowerCase().includes('goal')) {
        return button
      }
    }

    return null
  }

  private async generateResponse(
    stage: CoachingStage,
    coachMessage: string
  ): Promise<string> {
    if (this.options.useAI) {
      try {
        return await generateTestResponse({
          stage,
          coachMessage,
          conversationHistory: this.conversationLog.map((l) => ({
            role: l.role as 'user' | 'assistant',
            content: l.content,
          })),
        })
      } catch (error) {
        this.log(`AI response failed, using predefined: ${error}`)
      }
    }

    if (this.options.randomizeResponses) {
      return getRandomPredefinedResponse(stage)
    }
    return getPredefinedResponse(stage)
  }

  private async sendMessage(message: string): Promise<void> {
    const input = await this.page.$(AI_TEST_CONFIG.selectors.chatInput)
    if (!input) {
      throw new Error('Chat input not found')
    }

    await input.click()
    await input.type(message, { delay: 30 }) // Simulate natural typing

    const sendButton = await this.page.$(AI_TEST_CONFIG.selectors.sendButton)
    if (sendButton) {
      await sendButton.click()
    } else {
      // Try pressing Enter instead
      await this.page.keyboard.press('Enter')
    }

    await delay(AI_TEST_CONFIG.waitBetweenMessages)
  }

  private async waitForAssistantMessage(): Promise<void> {
    // Wait for loading indicator to appear and then disappear
    try {
      // First wait for loading to potentially appear
      await delay(300)

      // Then wait for loading to disappear (if it appeared)
      await this.page.waitForFunction(
        (selector: string) => {
          const loadingElements = document.querySelectorAll(selector)
          return loadingElements.length === 0
        },
        { timeout: AI_TEST_CONFIG.waitForAIResponse },
        AI_TEST_CONFIG.selectors.loadingIndicator
      )
    } catch {
      // Loading indicator may not appear or may have already disappeared
    }

    // Additional wait for message to render
    await delay(500)
  }

  private async getLatestAssistantMessage(): Promise<string> {
    const messages = await this.page.$$(AI_TEST_CONFIG.selectors.assistantMessage)
    if (messages.length === 0) return ''

    const lastMessage = messages[messages.length - 1]
    const text = await lastMessage.evaluate((el) => el.textContent)
    return text?.trim() || ''
  }

  private async detectStage(
    completedStages: CoachingStage[]
  ): Promise<CoachingStage> {
    // Check for goal summary card to determine stage progress
    const hasGoalCard = await this.page.$(
      AI_TEST_CONFIG.selectors.goalSummaryCard
    )

    if (hasGoalCard) {
      // Check what's in the card to determine stage
      const cardText = await hasGoalCard.evaluate((el) => el.textContent)

      if (cardText?.includes('First step:')) {
        return 'confirmation'
      }
      if (cardText?.includes('"') || cardText?.includes('"')) {
        // Has why quote (smart quotes)
        return 'micro_win'
      }
      return 'why_drilling'
    }

    // Fallback: use conversation history to infer stage
    const userMessageCount = this.conversationLog.filter(
      (m) => m.role === 'user'
    ).length

    if (userMessageCount === 0) return 'welcome'
    if (userMessageCount === 1) return 'goal_discovery'
    if (userMessageCount === 2) return 'why_drilling'
    if (userMessageCount === 3) return 'micro_win'
    if (userMessageCount >= 4) return 'confirmation'

    return 'goal_discovery'
  }

  private async checkForCompletion(): Promise<boolean> {
    try {
      // Check for the completion badge
      const completionBadge = await this.page.$eval(
        'body',
        (body) => body.textContent?.includes('Creating your goal...') || false
      )
      return completionBadge
    } catch {
      return false
    }
  }

  private async extractGoalData(): Promise<GoalData> {
    try {
      const goalCard = await this.page.$(AI_TEST_CONFIG.selectors.goalSummaryCard)
      if (!goalCard) return {}

      const data = await goalCard.evaluate((el) => {
        const titleEl = el.querySelector('.font-semibold')
        const whyEl = el.querySelector('.italic')
        const microWinEl = el.querySelector('.flex.items-center.gap-1')

        return {
          title: titleEl?.textContent?.trim() || undefined,
          why: whyEl?.textContent?.replace(/[""]/g, '').trim() || undefined,
          microWin:
            microWinEl?.textContent?.replace('First step:', '').trim() ||
            undefined,
        }
      })

      return data
    } catch {
      return {}
    }
  }

  private log(message: string): void {
    if (this.options.verbose) {
      console.log(`[GoalCoachingTest] ${message}`)
    }
  }
}
