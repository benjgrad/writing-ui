#!/usr/bin/env npx ts-node

import puppeteer, { Page } from 'puppeteer'
import * as fs from 'fs'
import * as path from 'path'
import { AI_TEST_CONFIG, type CoachingStage } from './config'
import { generateTestResponse, getPredefinedResponse } from './response-generator'
import { ConsoleCollector } from '../utils/console-collector'
import { attachConsoleCollector } from '../utils/puppeteer-console-hook'
import { loginAsTestUser, TEST_USER } from '../utils/test-auth'

// Helper function for delays (waitForTimeout was deprecated)
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const UX_REVIEW_DIR = path.join(process.cwd(), 'tests', 'ux-review')
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

interface ConversationEntry {
  turn: number
  stage: CoachingStage
  role: 'coach' | 'user'
  message: string
  timestamp: string
  screenshotPath?: string
}

interface UXReviewReport {
  testRun: string
  duration: number
  success: boolean
  goalCreated: boolean
  goalData: {
    title?: string
    why?: string
    microWin?: string
  }
  stagesCompleted: CoachingStage[]
  conversation: ConversationEntry[]
  screenshots: string[]
  consoleLog: string
  errors: string[]
  observations: string[]
}

class UXReviewTest {
  private page: Page
  private collector: ConsoleCollector
  private conversation: ConversationEntry[] = []
  private screenshots: string[] = []
  private sessionDir: string
  private turn = 0

  constructor(page: Page) {
    this.page = page
    this.sessionDir = path.join(UX_REVIEW_DIR, `session-${TIMESTAMP}`)
    fs.mkdirSync(this.sessionDir, { recursive: true })
    fs.mkdirSync(path.join(this.sessionDir, 'screenshots'), { recursive: true })

    this.collector = new ConsoleCollector({
      outputFile: path.join(this.sessionDir, 'console-logs.json'),
      realTimeOutput: true,
    })
    attachConsoleCollector(page, this.collector)
  }

  async run(): Promise<UXReviewReport> {
    const startTime = Date.now()
    const stagesCompleted: CoachingStage[] = []
    let goalCreated = false
    let goalData: { title?: string; why?: string; microWin?: string } = {}
    const errors: string[] = []
    const observations: string[] = []

    console.log('\n========================================')
    console.log('   UX Review Test Session')
    console.log(`   ${TIMESTAMP}`)
    console.log('========================================\n')
    console.log(`Output directory: ${this.sessionDir}\n`)
    console.log(`Test user: ${TEST_USER.email}\n`)

    try {
      // Step 0: Login as test user
      console.log('📍 Step 0: Login as test user')
      const loggedIn = await loginAsTestUser(this.page, AI_TEST_CONFIG.baseUrl)
      if (!loggedIn) {
        throw new Error('Failed to login as test user. Make sure the test user exists in Supabase.')
      }
      await this.screenshot('00-logged-in')
      observations.push('Successfully logged in as test user')

      // Step 1: Navigate to goals page
      console.log('📍 Step 1: Navigate to goals page')
      await this.page.goto(AI_TEST_CONFIG.goalsUrl, {
        waitUntil: 'networkidle0',
        timeout: 15000,
      })
      await delay(2000)
      await this.screenshot('01-goals-page-initial')
      observations.push('Goals page loaded successfully')

      // Step 2: Find and click add goal button
      console.log('📍 Step 2: Click add goal button')
      const addButton = await this.findAddGoalButton()
      if (!addButton) {
        throw new Error('Add goal button not found on page')
      }
      await this.screenshot('02-before-click-add')
      await addButton.click()
      await delay(500)

      // Step 3: Wait for Goal Coach modal
      console.log('📍 Step 3: Wait for Goal Coach modal')
      await this.page.waitForSelector('.animate-slide-in-right', { timeout: 5000 })
      await delay(1000)
      await this.screenshot('03-modal-opened')
      observations.push('Goal Coach modal slides in from right with smooth animation')

      // Step 4: Wait for initial coach message
      console.log('📍 Step 4: Wait for initial coach message')
      await this.waitForCoachMessage()
      await this.screenshot('04-initial-coach-message')

      let currentStage: CoachingStage = 'welcome'
      stagesCompleted.push('welcome')

      // Step 5-N: Conversation loop
      while (this.turn < 10) {
        this.turn++
        console.log(`\n📍 Turn ${this.turn} (Stage: ${currentStage})`)

        // Get coach message
        const coachMessage = await this.getLatestCoachMessage()
        if (!coachMessage) {
          console.log('   ⚠️ No coach message found, waiting...')
          await delay(1000)
          continue
        }

        this.conversation.push({
          turn: this.turn,
          stage: currentStage,
          role: 'coach',
          message: coachMessage,
          timestamp: new Date().toISOString(),
        })
        console.log(`   🤖 Coach: "${coachMessage.substring(0, 80)}${coachMessage.length > 80 ? '...' : ''}"`)

        // Check for completion
        const isComplete = await this.checkForCompletion()
        if (isComplete) {
          await this.screenshot(`${String(this.turn + 4).padStart(2, '0')}-completion`)
          stagesCompleted.push('complete')
          goalCreated = true
          goalData = await this.extractGoalData()
          observations.push('Goal creation completed with celebration animation')
          console.log('   ✅ Goal creation complete!')
          break
        }

        // Detect stage and update
        currentStage = this.detectStageFromConversation()
        if (!stagesCompleted.includes(currentStage)) {
          stagesCompleted.push(currentStage)
          observations.push(`Entered ${currentStage} stage`)
        }

        // Generate user response
        let userResponse: string
        try {
          userResponse = await generateTestResponse({
            stage: currentStage,
            coachMessage,
            conversationHistory: this.conversation.map((c) => ({
              role: c.role === 'coach' ? 'assistant' : 'user',
              content: c.message,
            })),
          })
        } catch (error) {
          console.log('   ⚠️ AI response failed, using predefined')
          userResponse = getPredefinedResponse(currentStage)
        }

        console.log(`   👤 User: "${userResponse}"`)

        // Take screenshot before sending
        await this.screenshot(`${String(this.turn + 4).padStart(2, '0')}-before-response-${currentStage}`)

        // Send message
        await this.sendMessage(userResponse)

        this.conversation.push({
          turn: this.turn,
          stage: currentStage,
          role: 'user',
          message: userResponse,
          timestamp: new Date().toISOString(),
        })

        // Wait for coach response
        await this.waitForCoachMessage()
        await this.screenshot(`${String(this.turn + 5).padStart(2, '0')}-after-response-${currentStage}`)

        // Check for goal summary card appearing
        const hasGoalCard = await this.page.$('[class*="bg-[#f0fdf4]"]')
        if (hasGoalCard) {
          const cardContent = await hasGoalCard.evaluate((el) => el.textContent)
          if (cardContent && !observations.some((o) => o.includes('Goal summary card'))) {
            observations.push('Goal summary card appeared showing captured goal data')
          }
        }
      }

      // Final screenshot
      await delay(2000)
      await this.screenshot('99-final-state')

    } catch (error) {
      errors.push(String(error))
      console.error(`\n❌ Error: ${error}`)
      await this.screenshot('error-state')
    }

    // Save console logs
    this.collector.save()

    // Generate report
    const report: UXReviewReport = {
      testRun: TIMESTAMP,
      duration: Date.now() - startTime,
      success: goalCreated && errors.length === 0,
      goalCreated,
      goalData,
      stagesCompleted,
      conversation: this.conversation,
      screenshots: this.screenshots,
      consoleLog: path.join(this.sessionDir, 'console-logs.json'),
      errors,
      observations,
    }

    // Save report
    const reportPath = path.join(this.sessionDir, 'ux-review-report.json')
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

    // Save conversation transcript
    const transcriptPath = path.join(this.sessionDir, 'conversation-transcript.md')
    fs.writeFileSync(transcriptPath, this.generateTranscript(report))

    // Print summary
    this.printSummary(report)

    return report
  }

  private async screenshot(name: string): Promise<void> {
    const filename = `${name}.png`
    const filepath = path.join(this.sessionDir, 'screenshots', filename)
    await this.page.screenshot({ path: filepath, fullPage: false })
    this.screenshots.push(filepath)
    console.log(`   📸 Screenshot: ${filename}`)
  }

  private async findAddGoalButton(): Promise<ReturnType<Page['$']>> {
    const buttons = await this.page.$$('button')
    for (const button of buttons) {
      const text = await button.evaluate((el) => el.textContent)
      if (text?.toLowerCase().includes('add') || text?.toLowerCase().includes('goal')) {
        return button
      }
    }
    return null
  }

  private async sendMessage(message: string): Promise<void> {
    const input = await this.page.$('input[placeholder="Type your response..."]')
    if (!input) throw new Error('Chat input not found')

    await input.click()
    await input.type(message, { delay: 40 })
    await this.page.keyboard.press('Enter')
    await delay(500)
  }

  private async waitForCoachMessage(): Promise<void> {
    // Wait for loading to finish
    await delay(500)
    try {
      await this.page.waitForFunction(
        () => document.querySelectorAll('.animate-bounce').length === 0,
        { timeout: 15000 }
      )
    } catch {
      // Loading may not appear
    }
    await delay(500)
  }

  private async getLatestCoachMessage(): Promise<string> {
    const messages = await this.page.$$('[class*="bg-[#f1f5f9]"]')
    if (messages.length === 0) return ''
    const last = messages[messages.length - 1]
    const text = await last.evaluate((el) => el.textContent)
    return text?.trim() || ''
  }

  private detectStageFromConversation(): CoachingStage {
    const userMessages = this.conversation.filter((c) => c.role === 'user').length
    if (userMessages === 0) return 'welcome'
    if (userMessages === 1) return 'goal_discovery'
    if (userMessages === 2) return 'why_drilling'
    if (userMessages === 3) return 'micro_win'
    return 'confirmation'
  }

  private async checkForCompletion(): Promise<boolean> {
    const bodyText = await this.page.evaluate(() => document.body.textContent)
    return bodyText?.includes('Creating your goal...') || false
  }

  private async extractGoalData(): Promise<{ title?: string; why?: string; microWin?: string }> {
    try {
      const goalCard = await this.page.$('[class*="bg-[#f0fdf4]"]')
      if (!goalCard) return {}

      return await goalCard.evaluate((el) => ({
        title: el.querySelector('.font-semibold')?.textContent?.trim(),
        why: el.querySelector('.italic')?.textContent?.replace(/[""]/g, '').trim(),
        microWin: el.querySelector('.flex.items-center.gap-1')?.textContent?.replace('First step:', '').trim(),
      }))
    } catch {
      return {}
    }
  }

  private generateTranscript(report: UXReviewReport): string {
    let md = `# Goal Coaching Conversation Transcript\n\n`
    md += `**Date:** ${new Date().toISOString()}\n`
    md += `**Duration:** ${(report.duration / 1000).toFixed(1)}s\n`
    md += `**Result:** ${report.success ? '✅ Success' : '❌ Failed'}\n\n`

    if (report.goalData.title) {
      md += `## Goal Created\n\n`
      md += `- **Title:** ${report.goalData.title}\n`
      if (report.goalData.why) md += `- **Why:** "${report.goalData.why}"\n`
      if (report.goalData.microWin) md += `- **First Step:** ${report.goalData.microWin}\n`
      md += `\n`
    }

    md += `## Conversation\n\n`

    let currentStage = ''
    for (const entry of report.conversation) {
      if (entry.stage !== currentStage) {
        currentStage = entry.stage
        md += `### Stage: ${currentStage}\n\n`
      }

      const icon = entry.role === 'coach' ? '🤖' : '👤'
      const label = entry.role === 'coach' ? 'Coach' : 'User'
      md += `**${icon} ${label}:**\n> ${entry.message}\n\n`
    }

    md += `## Stages Completed\n\n`
    report.stagesCompleted.forEach((stage, i) => {
      md += `${i + 1}. ${stage}\n`
    })

    if (report.observations.length > 0) {
      md += `\n## UX Observations\n\n`
      report.observations.forEach((obs) => {
        md += `- ${obs}\n`
      })
    }

    if (report.errors.length > 0) {
      md += `\n## Errors\n\n`
      report.errors.forEach((err) => {
        md += `- ❌ ${err}\n`
      })
    }

    md += `\n## Screenshots\n\n`
    report.screenshots.forEach((ss) => {
      const name = path.basename(ss)
      md += `- [${name}](screenshots/${name})\n`
    })

    return md
  }

  private printSummary(report: UXReviewReport): void {
    console.log('\n========================================')
    console.log('   UX Review Summary')
    console.log('========================================\n')

    console.log(`Result: ${report.success ? '✅ SUCCESS' : '❌ FAILED'}`)
    console.log(`Duration: ${(report.duration / 1000).toFixed(1)}s`)
    console.log(`Goal Created: ${report.goalCreated ? 'Yes' : 'No'}`)

    if (report.goalData.title) {
      console.log(`\nGoal: "${report.goalData.title}"`)
      if (report.goalData.why) console.log(`Why: "${report.goalData.why}"`)
      if (report.goalData.microWin) console.log(`First Step: "${report.goalData.microWin}"`)
    }

    console.log(`\nStages: ${report.stagesCompleted.join(' → ')}`)
    console.log(`Screenshots: ${report.screenshots.length}`)
    console.log(`Conversation turns: ${report.conversation.length}`)

    if (report.observations.length > 0) {
      console.log(`\nObservations:`)
      report.observations.forEach((o) => console.log(`  • ${o}`))
    }

    if (report.errors.length > 0) {
      console.log(`\nErrors:`)
      report.errors.forEach((e) => console.log(`  ❌ ${e}`))
    }

    console.log(`\n📁 Full report: ${this.sessionDir}`)
    console.log(`   - ux-review-report.json`)
    console.log(`   - conversation-transcript.md`)
    console.log(`   - console-logs.json`)
    console.log(`   - screenshots/\n`)
  }
}

async function main() {
  console.log('Starting UX Review Test...\n')

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1400, height: 900 },
  })

  const page = await browser.newPage()
  const test = new UXReviewTest(page)

  try {
    await test.run()
  } finally {
    // Keep browser open for 5 seconds to see final state
    await delay(5000)
    await browser.close()
  }
}

main().catch(console.error)
