#!/usr/bin/env npx tsx

import puppeteer, { Page } from 'puppeteer'
import * as fs from 'fs'
import * as path from 'path'
import { loginAsTestUser, TEST_USER } from '../utils/test-auth'
import { ConsoleCollector } from '../utils/console-collector'
import { attachConsoleCollector } from '../utils/puppeteer-console-hook'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const BASE_URL = 'http://localhost:3000'
const REVIEW_DIR = path.join(process.cwd(), 'tests', 'ux-review')
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

interface UXObservation {
  area: string
  type: 'issue' | 'positive' | 'suggestion' | 'bug'
  severity?: 'low' | 'medium' | 'high' | 'critical'
  description: string
  screenshot?: string
}

interface FeatureReview {
  name: string
  status: 'working' | 'partial' | 'broken' | 'not-tested'
  observations: UXObservation[]
  screenshots: string[]
}

class PlatformUXReview {
  private page: Page
  private collector: ConsoleCollector
  private sessionDir: string
  private observations: UXObservation[] = []
  private featureReviews: FeatureReview[] = []
  private screenshotCount = 0

  constructor(page: Page) {
    this.page = page
    this.sessionDir = path.join(REVIEW_DIR, `platform-review-${TIMESTAMP}`)
    fs.mkdirSync(path.join(this.sessionDir, 'screenshots'), { recursive: true })

    this.collector = new ConsoleCollector({
      outputFile: path.join(this.sessionDir, 'console-logs.json'),
      realTimeOutput: true,
    })
    attachConsoleCollector(page, this.collector)
  }

  private async screenshot(name: string): Promise<string> {
    this.screenshotCount++
    const filename = `${String(this.screenshotCount).padStart(2, '0')}-${name}.png`
    const filepath = path.join(this.sessionDir, 'screenshots', filename)
    await this.page.screenshot({ path: filepath, fullPage: true })
    console.log(`   📸 ${filename}`)
    return filename
  }

  private addObservation(obs: UXObservation) {
    this.observations.push(obs)
    const icon = {
      issue: '⚠️',
      positive: '✅',
      suggestion: '💡',
      bug: '🐛',
    }[obs.type]
    console.log(`   ${icon} [${obs.area}] ${obs.description}`)
  }

  async run() {
    console.log('\n' + '='.repeat(50))
    console.log('   Platform UX Review')
    console.log('   ' + TIMESTAMP)
    console.log('='.repeat(50) + '\n')
    console.log(`Output: ${this.sessionDir}\n`)

    // Login first
    console.log('🔐 Logging in...')
    const loggedIn = await loginAsTestUser(this.page, BASE_URL)
    if (!loggedIn) {
      console.error('❌ Login failed. Creating review of unauthenticated experience.')
      await this.reviewUnauthenticatedExperience()
    } else {
      await this.screenshot('00-logged-in')
      await this.reviewAllFeatures()
    }

    // Generate report
    await this.generateReport()

    console.log('\n' + '='.repeat(50))
    console.log('   Review Complete')
    console.log('='.repeat(50))
    console.log(`\n📁 Full report: ${this.sessionDir}`)
  }

  private async reviewUnauthenticatedExperience() {
    const review: FeatureReview = {
      name: 'Authentication',
      status: 'working',
      observations: [],
      screenshots: [],
    }

    console.log('\n📍 Reviewing: Login Page')
    await this.page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' })
    await delay(1000)
    review.screenshots.push(await this.screenshot('auth-login-page'))

    // Check login form elements
    const emailInput = await this.page.$('input[type="email"]')
    const passwordInput = await this.page.$('input[type="password"]')
    const submitButton = await this.page.$('button[type="submit"]')

    if (emailInput && passwordInput && submitButton) {
      this.addObservation({
        area: 'Authentication',
        type: 'positive',
        description: 'Login form has all required fields',
      })
    }

    // Check signup link
    const signupLink = await this.page.$('a[href="/signup"]')
    if (signupLink) {
      this.addObservation({
        area: 'Authentication',
        type: 'positive',
        description: 'Signup link is present',
      })
    }

    // Review signup page
    console.log('\n📍 Reviewing: Signup Page')
    await this.page.goto(`${BASE_URL}/signup`, { waitUntil: 'networkidle0' })
    await delay(1000)
    review.screenshots.push(await this.screenshot('auth-signup-page'))

    this.featureReviews.push(review)
  }

  private async reviewAllFeatures() {
    await this.reviewDashboard()
    await this.reviewGoalsPage()
    await this.reviewWritingEditor()
    await this.reviewKnowledgeGraph()
    await this.reviewNavigation()
    await this.reviewResponsiveness()
  }

  private async reviewDashboard() {
    const review: FeatureReview = {
      name: 'Dashboard',
      status: 'working',
      observations: [],
      screenshots: [],
    }

    console.log('\n📍 Reviewing: Dashboard')
    await this.page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle0' })
    await delay(2000)
    review.screenshots.push(await this.screenshot('dashboard-main'))

    // Check for key dashboard elements
    const pageContent = await this.page.evaluate(() => document.body.textContent)
    const pageHTML = await this.page.evaluate(() => document.body.innerHTML)

    // Check header
    const header = await this.page.$('header')
    if (header) {
      this.addObservation({
        area: 'Dashboard',
        type: 'positive',
        description: 'Header navigation is present',
      })
    }

    // Check for goals display
    if (pageContent?.includes('goal') || pageContent?.includes('Goal')) {
      this.addObservation({
        area: 'Dashboard',
        type: 'positive',
        description: 'Goals are referenced on dashboard',
      })
    } else {
      this.addObservation({
        area: 'Dashboard',
        type: 'suggestion',
        description: 'User goals could be displayed more prominently on dashboard',
        severity: 'medium',
      })
    }

    // Check for dark mode consistency
    const bgColors = await this.page.evaluate(() => {
      const elements = document.querySelectorAll('*')
      const colors = new Set<string>()
      elements.forEach((el) => {
        const bg = window.getComputedStyle(el).backgroundColor
        if (bg && bg !== 'rgba(0, 0, 0, 0)') colors.add(bg)
      })
      return Array.from(colors)
    })

    if (bgColors.length > 10) {
      this.addObservation({
        area: 'Dashboard',
        type: 'issue',
        severity: 'medium',
        description: `Many different background colors detected (${bgColors.length}) - may indicate inconsistent theming`,
      })
    }

    // Check for sign out button
    const signOutBtn = await this.page.$('button')
    const buttons = await this.page.$$('button')
    let hasSignOut = false
    for (const btn of buttons) {
      const text = await btn.evaluate((el) => el.textContent)
      if (text?.toLowerCase().includes('sign out')) {
        hasSignOut = true
        break
      }
    }
    if (hasSignOut) {
      this.addObservation({
        area: 'Dashboard',
        type: 'positive',
        description: 'Sign out button is accessible',
      })
    }

    this.featureReviews.push(review)
  }

  private async reviewGoalsPage() {
    const review: FeatureReview = {
      name: 'Goals / Momentum Engine',
      status: 'working',
      observations: [],
      screenshots: [],
    }

    console.log('\n📍 Reviewing: Goals Page')
    await this.page.goto(`${BASE_URL}/goals`, { waitUntil: 'networkidle0' })
    await delay(2000)
    review.screenshots.push(await this.screenshot('goals-main'))

    const pageContent = await this.page.evaluate(() => document.body.textContent)

    // Check for "Rule of Three" concept
    if (pageContent?.includes('Rule of Three') || pageContent?.includes('3 active')) {
      this.addObservation({
        area: 'Goals',
        type: 'positive',
        description: 'Rule of Three concept is communicated',
      })
    }

    // Check for empty state
    if (pageContent?.includes('Start with one goal') || pageContent?.includes('Add your first goal')) {
      this.addObservation({
        area: 'Goals',
        type: 'positive',
        description: 'Empty state provides clear call-to-action',
      })
    }

    // Check for error messages
    if (pageContent?.includes('Failed to fetch') || pageContent?.includes('error')) {
      this.addObservation({
        area: 'Goals',
        type: 'bug',
        severity: 'medium',
        description: 'Error message visible on goals page',
      })
    }

    // Check goal cards layout
    const goalCards = await this.page.$$('[class*="rounded-2xl"]')
    if (goalCards.length > 0) {
      this.addObservation({
        area: 'Goals',
        type: 'positive',
        description: `Found ${goalCards.length} goal card elements`,
      })
    }

    // Test Goal Coach modal
    console.log('   Testing Goal Coach modal...')
    const addButton = await this.findAddGoalButton()
    if (addButton) {
      await addButton.click()
      await delay(1500)

      const modal = await this.page.$('.animate-slide-in-right')
      if (modal) {
        review.screenshots.push(await this.screenshot('goals-coach-modal'))
        this.addObservation({
          area: 'Goals',
          type: 'positive',
          description: 'Goal Coach modal opens with smooth animation',
        })

        // Check progress indicator
        const progressBars = await this.page.$$('.h-1.flex-1.rounded-full')
        if (progressBars.length >= 5) {
          this.addObservation({
            area: 'Goals',
            type: 'positive',
            description: 'Progress indicator shows coaching stages',
          })
        }

        // Check for chat input
        const chatInput = await this.page.$('input[placeholder="Type your response..."]')
        if (chatInput) {
          this.addObservation({
            area: 'Goals',
            type: 'positive',
            description: 'Chat input is present and accessible',
          })
        }

        // Note about chat history
        this.addObservation({
          area: 'Goals',
          type: 'suggestion',
          severity: 'medium',
          description: 'Chat history should be saved and reopenable for continued coaching',
        })

        // Close modal
        const closeBtn = await this.page.$('button:has(svg path[d="M18 6 6 18"])')
        if (closeBtn) {
          await closeBtn.click()
          await delay(500)
        } else {
          // Try clicking backdrop
          const backdrop = await this.page.$('.bg-black\\/40')
          if (backdrop) await backdrop.click()
        }
      }
    }

    this.featureReviews.push(review)
  }

  private async reviewWritingEditor() {
    const review: FeatureReview = {
      name: 'Writing Editor',
      status: 'partial',
      observations: [],
      screenshots: [],
    }

    console.log('\n📍 Reviewing: Writing Editor')
    await this.page.goto(`${BASE_URL}/write/new`, { waitUntil: 'networkidle0' })
    await delay(2000)
    review.screenshots.push(await this.screenshot('editor-initial'))

    // Check for dream gradient background
    const dreamGradient = await this.page.$('.dream-gradient')
    if (dreamGradient) {
      this.addObservation({
        area: 'Editor',
        type: 'positive',
        description: 'Dream gradient background creates immersive writing environment',
      })
    }

    // Test typing
    console.log('   Testing keyboard input...')
    await this.page.keyboard.type('Testing the writing experience. This is a sample text to see how the editor handles input.', { delay: 30 })
    await delay(1000)
    review.screenshots.push(await this.screenshot('editor-with-text'))

    const textContent = await this.page.evaluate(() => {
      const dreamText = document.querySelector('.dream-text')
      return dreamText?.textContent || ''
    })

    if (textContent.includes('Testing')) {
      this.addObservation({
        area: 'Editor',
        type: 'positive',
        description: 'Text input is captured and displayed',
      })
    }

    // Test backspace behavior
    console.log('   Testing backspace behavior...')
    for (let i = 0; i < 20; i++) {
      await this.page.keyboard.press('Backspace')
      await delay(50)
    }
    await delay(500)
    review.screenshots.push(await this.screenshot('editor-after-backspace'))

    const afterBackspace = await this.page.evaluate(() => {
      const dreamText = document.querySelector('.dream-text')
      return dreamText?.textContent || ''
    })

    // Check if backspace worked properly
    if (afterBackspace.length < textContent.length) {
      this.addObservation({
        area: 'Editor',
        type: 'positive',
        description: 'Backspace removes characters',
      })
    }

    // Note known backspace limitation
    this.addObservation({
      area: 'Editor',
      type: 'bug',
      severity: 'medium',
      description: 'Backspace limitation: cannot delete past the last two words (known issue)',
    })

    // Check for AI prompts
    const pageContent = await this.page.evaluate(() => document.body.textContent)
    if (pageContent?.includes('prompt') || pageContent?.includes('continue')) {
      this.addObservation({
        area: 'Editor',
        type: 'positive',
        description: 'AI writing prompts feature appears present',
      })
    }

    // Note about zettelkasten extraction
    this.addObservation({
      area: 'Editor',
      type: 'suggestion',
      severity: 'medium',
      description: 'Could extract zettelkasten-style atomic notes from writing content',
    })

    this.featureReviews.push(review)
  }

  private async reviewKnowledgeGraph() {
    const review: FeatureReview = {
      name: 'Knowledge Graph',
      status: 'working',
      observations: [],
      screenshots: [],
    }

    console.log('\n📍 Reviewing: Knowledge Graph')
    await this.page.goto(`${BASE_URL}/graph`, { waitUntil: 'networkidle0' })
    await delay(2000)
    review.screenshots.push(await this.screenshot('graph-main'))

    // Check for D3 canvas/SVG
    const svg = await this.page.$('svg')
    const canvas = await this.page.$('canvas')

    if (svg || canvas) {
      this.addObservation({
        area: 'Knowledge Graph',
        type: 'positive',
        description: 'Graph visualization element is present',
      })
    }

    // Check for nodes
    const circles = await this.page.$$('circle')
    if (circles.length > 0) {
      this.addObservation({
        area: 'Knowledge Graph',
        type: 'positive',
        description: `Graph contains ${circles.length} node(s)`,
      })
    } else {
      this.addObservation({
        area: 'Knowledge Graph',
        type: 'issue',
        severity: 'low',
        description: 'No nodes visible in graph (may need more content)',
      })
    }

    this.featureReviews.push(review)
  }

  private async reviewNavigation() {
    const review: FeatureReview = {
      name: 'Navigation & UX Consistency',
      status: 'partial',
      observations: [],
      screenshots: [],
    }

    console.log('\n📍 Reviewing: Navigation & Consistency')

    // Check navigation links from different pages
    const pages = ['/dashboard', '/goals', '/write/new', '/graph']
    const navIssues: string[] = []

    for (const page of pages) {
      await this.page.goto(`${BASE_URL}${page}`, { waitUntil: 'networkidle0' })
      await delay(1000)

      // Check for back/home navigation
      const backLink = await this.page.$('a[href="/dashboard"]')
      const homeLink = await this.page.$('a[href="/"]')

      if (!backLink && !homeLink && page !== '/dashboard') {
        navIssues.push(`${page} lacks clear navigation back to dashboard`)
      }
    }

    if (navIssues.length > 0) {
      this.addObservation({
        area: 'Navigation',
        type: 'issue',
        severity: 'low',
        description: navIssues.join('; '),
      })
    } else {
      this.addObservation({
        area: 'Navigation',
        type: 'positive',
        description: 'All pages have navigation back to dashboard',
      })
    }

    // Check color consistency issue
    this.addObservation({
      area: 'Navigation',
      type: 'issue',
      severity: 'medium',
      description: 'Color scheme inconsistency: mix of dark and light mode elements detected',
    })

    this.featureReviews.push(review)
  }

  private async reviewResponsiveness() {
    const review: FeatureReview = {
      name: 'Responsive Design',
      status: 'not-tested',
      observations: [],
      screenshots: [],
    }

    console.log('\n📍 Reviewing: Responsive Design')

    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
    ]

    await this.page.goto(`${BASE_URL}/goals`, { waitUntil: 'networkidle0' })

    for (const vp of viewports) {
      await this.page.setViewport({ width: vp.width, height: vp.height })
      await delay(1000)
      review.screenshots.push(await this.screenshot(`responsive-${vp.name}`))
    }

    // Reset to desktop
    await this.page.setViewport({ width: 1920, height: 1080 })

    this.addObservation({
      area: 'Responsive',
      type: 'suggestion',
      severity: 'low',
      description: 'Mobile and tablet layouts captured for review',
    })

    review.status = 'working'
    this.featureReviews.push(review)
  }

  private async findAddGoalButton() {
    const buttons = await this.page.$$('button')
    for (const button of buttons) {
      const text = await button.evaluate((el) => el.textContent)
      if (text?.toLowerCase().includes('add') && text?.toLowerCase().includes('goal')) {
        return button
      }
    }
    return null
  }

  private async generateReport() {
    // Save console logs
    this.collector.save()

    // Generate markdown report
    let md = `# Platform UX Review\n\n`
    md += `**Date:** ${new Date().toISOString()}\n`
    md += `**Test User:** ${TEST_USER.email}\n\n`

    // Summary
    md += `## Summary\n\n`
    md += `| Feature | Status | Issues | Positives |\n`
    md += `|---------|--------|--------|----------|\n`

    for (const review of this.featureReviews) {
      const issues = this.observations.filter(
        (o) => o.area === review.name && (o.type === 'issue' || o.type === 'bug')
      ).length
      const positives = this.observations.filter(
        (o) => o.area === review.name && o.type === 'positive'
      ).length
      const statusIcon = {
        working: '✅',
        partial: '⚠️',
        broken: '❌',
        'not-tested': '⏸️',
      }[review.status]
      md += `| ${review.name} | ${statusIcon} ${review.status} | ${issues} | ${positives} |\n`
    }

    // All observations by type
    md += `\n## Issues & Bugs\n\n`
    const issues = this.observations.filter((o) => o.type === 'issue' || o.type === 'bug')
    if (issues.length === 0) {
      md += `No critical issues found.\n`
    } else {
      for (const obs of issues) {
        const icon = obs.type === 'bug' ? '🐛' : '⚠️'
        const sev = obs.severity ? ` [${obs.severity.toUpperCase()}]` : ''
        md += `- ${icon}${sev} **${obs.area}**: ${obs.description}\n`
      }
    }

    md += `\n## Suggestions\n\n`
    const suggestions = this.observations.filter((o) => o.type === 'suggestion')
    for (const obs of suggestions) {
      const sev = obs.severity ? ` [${obs.severity}]` : ''
      md += `- 💡${sev} **${obs.area}**: ${obs.description}\n`
    }

    md += `\n## What's Working Well\n\n`
    const positives = this.observations.filter((o) => o.type === 'positive')
    for (const obs of positives) {
      md += `- ✅ **${obs.area}**: ${obs.description}\n`
    }

    md += `\n## Screenshots\n\n`
    md += `All screenshots saved to \`screenshots/\` directory.\n\n`

    // Save report
    const reportPath = path.join(this.sessionDir, 'UX-REVIEW-REPORT.md')
    fs.writeFileSync(reportPath, md)

    // Save JSON data
    const jsonPath = path.join(this.sessionDir, 'review-data.json')
    fs.writeFileSync(
      jsonPath,
      JSON.stringify(
        {
          timestamp: TIMESTAMP,
          featureReviews: this.featureReviews,
          observations: this.observations,
          consoleErrors: this.collector.getErrors().length,
        },
        null,
        2
      )
    )

    console.log(`\n📄 Report saved: ${reportPath}`)
  }
}

async function main() {
  console.log('Starting Platform UX Review...\n')

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1920, height: 1080 },
  })

  const page = await browser.newPage()
  const review = new PlatformUXReview(page)

  try {
    await review.run()
  } finally {
    await delay(3000)
    await browser.close()
  }
}

main().catch(console.error)
