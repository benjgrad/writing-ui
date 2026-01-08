#!/usr/bin/env npx ts-node

import puppeteer, { type Page } from 'puppeteer'
import * as goalCoachingScenarios from './scenarios/goal-coaching'
import * as generalUIScenarios from './scenarios/general-ui'

interface TestSuite {
  name: string
  scenarios: Array<{
    name: string
    fn: (page: Page) => Promise<{
      passed: boolean
      duration: number
      errors: string[]
      details?: string
    }>
  }>
}

const TEST_SUITES: TestSuite[] = [
  {
    name: 'Goal Coaching',
    scenarios: [
      {
        name: 'Happy Path (AI)',
        fn: goalCoachingScenarios.testHappyPathWithAI,
      },
      {
        name: 'Happy Path (Predefined)',
        fn: goalCoachingScenarios.testHappyPathPredefined,
      },
      {
        name: 'All Stages Visited',
        fn: goalCoachingScenarios.testAllStagesVisited,
      },
      {
        name: 'Cancel Mid-Conversation',
        fn: goalCoachingScenarios.testCancelMidConversation,
      },
      {
        name: 'Goal Appears After Creation',
        fn: goalCoachingScenarios.testGoalAppearsAfterCreation,
      },
      {
        name: 'Randomized Responses',
        fn: goalCoachingScenarios.testRandomizedResponses,
      },
      {
        name: 'No Console Errors',
        fn: goalCoachingScenarios.testNoConsoleErrors,
      },
    ],
  },
  {
    name: 'General UI',
    scenarios: [
      {
        name: 'Navigation Without Errors',
        fn: generalUIScenarios.testNavigationNoErrors,
      },
      {
        name: 'Dashboard Loads',
        fn: generalUIScenarios.testDashboardLoad,
      },
      {
        name: 'Goals Page Loads',
        fn: generalUIScenarios.testGoalsPageLoad,
      },
      {
        name: 'Writing Editor Input',
        fn: generalUIScenarios.testWritingEditorInput,
      },
      {
        name: '404 Page Handling',
        fn: generalUIScenarios.testErrorPageHandling,
      },
      {
        name: 'Page Load Performance',
        fn: generalUIScenarios.testPageLoadPerformance,
      },
      {
        name: 'Responsive Layout',
        fn: generalUIScenarios.testResponsiveLayout,
      },
    ],
  },
]

interface TestResult {
  suite: string
  scenario: string
  passed: boolean
  duration: number
  errors: string[]
  details?: string
}

async function runTests(options: {
  suites?: string[]
  scenarios?: string[]
  headed?: boolean
  verbose?: boolean
}) {
  console.log('\n========================================')
  console.log('   Autonomous AI Testing Suite')
  console.log('========================================\n')

  const isHeaded = options.headed ?? process.env.HEADLESS !== 'true'
  const verbose = options.verbose ?? true

  console.log(`Mode: ${isHeaded ? 'Headed (visible browser)' : 'Headless'}`)
  console.log(`Verbose: ${verbose}\n`)

  const browser = await puppeteer.launch({
    headless: !isHeaded,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: { width: 1280, height: 800 },
  })

  const results: TestResult[] = []
  let suitesToRun = TEST_SUITES

  // Filter suites if specified
  if (options.suites && options.suites.length > 0) {
    suitesToRun = TEST_SUITES.filter((s) =>
      options.suites!.some(
        (name) => s.name.toLowerCase().includes(name.toLowerCase())
      )
    )
  }

  for (const suite of suitesToRun) {
    console.log(`\n${'─'.repeat(40)}`)
    console.log(`  ${suite.name}`)
    console.log(`${'─'.repeat(40)}\n`)

    let scenariosToRun = suite.scenarios

    // Filter scenarios if specified
    if (options.scenarios && options.scenarios.length > 0) {
      scenariosToRun = suite.scenarios.filter((s) =>
        options.scenarios!.some(
          (name) => s.name.toLowerCase().includes(name.toLowerCase())
        )
      )
    }

    for (const scenario of scenariosToRun) {
      const page = await browser.newPage()

      try {
        console.log(`  Running: ${scenario.name}...`)
        const startTime = Date.now()
        const result = await scenario.fn(page)

        results.push({
          suite: suite.name,
          scenario: scenario.name,
          passed: result.passed,
          duration: result.duration || Date.now() - startTime,
          errors: result.errors || [],
          details: result.details,
        })

        const status = result.passed ? '\x1b[32m✓ PASS\x1b[0m' : '\x1b[31m✗ FAIL\x1b[0m'
        console.log(`  ${status} (${result.duration}ms)`)

        if (!result.passed && result.details && verbose) {
          console.log(`\n  Details:\n${result.details.split('\n').map((l) => `    ${l}`).join('\n')}\n`)
        }

        if (!result.passed && result.errors.length > 0) {
          console.log(`  Errors:`)
          result.errors.forEach((e) => console.log(`    - ${e}`))
        }
      } catch (error) {
        results.push({
          suite: suite.name,
          scenario: scenario.name,
          passed: false,
          duration: 0,
          errors: [String(error)],
        })
        console.log(`  \x1b[31m✗ ERROR\x1b[0m: ${error}`)
      } finally {
        await page.close()
      }
    }
  }

  await browser.close()

  // Print summary
  console.log('\n========================================')
  console.log('   Test Summary')
  console.log('========================================\n')

  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed).length
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)

  console.log(`Total: ${results.length}`)
  console.log(`\x1b[32mPassed: ${passed}\x1b[0m`)
  console.log(`\x1b[31mFailed: ${failed}\x1b[0m`)
  console.log(`Duration: ${(totalDuration / 1000).toFixed(2)}s`)

  if (failed > 0) {
    console.log('\n\x1b[31mFailed Tests:\x1b[0m')
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.suite} > ${r.scenario}`)
        r.errors.forEach((e) => console.log(`      ${e}`))
      })
  }

  console.log('\n')

  return failed > 0 ? 1 : 0
}

// Parse command line arguments
function parseArgs(): {
  suites: string[]
  scenarios: string[]
  headed: boolean
  verbose: boolean
  help: boolean
} {
  const args = process.argv.slice(2)
  const options = {
    suites: [] as string[],
    scenarios: [] as string[],
    headed: process.env.HEADLESS !== 'true',
    verbose: true,
    help: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '--help' || arg === '-h') {
      options.help = true
    } else if (arg === '--suite' || arg === '-s') {
      if (args[i + 1]) {
        options.suites.push(args[++i])
      }
    } else if (arg === '--scenario' || arg === '-t') {
      if (args[i + 1]) {
        options.scenarios.push(args[++i])
      }
    } else if (arg === '--headless') {
      options.headed = false
    } else if (arg === '--headed') {
      options.headed = true
    } else if (arg === '--quiet' || arg === '-q') {
      options.verbose = false
    }
  }

  return options
}

function printHelp() {
  console.log(`
Autonomous AI Testing Suite

Usage: npx ts-node tests/ai-agent/run-tests.ts [options]

Options:
  -h, --help        Show this help message
  -s, --suite NAME  Run only suites matching NAME (can be used multiple times)
  -t, --scenario NAME  Run only scenarios matching NAME (can be used multiple times)
  --headless        Run in headless mode (no visible browser)
  --headed          Run with visible browser (default)
  -q, --quiet       Reduce output verbosity

Examples:
  npx ts-node tests/ai-agent/run-tests.ts                    # Run all tests
  npx ts-node tests/ai-agent/run-tests.ts --suite coaching   # Run coaching tests only
  npx ts-node tests/ai-agent/run-tests.ts -t "happy path"    # Run happy path scenarios
  npx ts-node tests/ai-agent/run-tests.ts --headless         # Run without browser window

Environment Variables:
  ANTHROPIC_API_KEY    API key for Claude (required for AI response generation)
  HEADLESS=true        Run in headless mode
  SKIP_AUTH=true       Skip authentication (set by npm scripts)
`)
}

// Main entry point
const options = parseArgs()

if (options.help) {
  printHelp()
  process.exit(0)
}

runTests(options)
  .then((exitCode) => process.exit(exitCode))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
