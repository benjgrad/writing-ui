#!/usr/bin/env npx tsx
/**
 * Main test runner for extraction accuracy testing
 *
 * Usage:
 *   npx tsx tests/extraction-accuracy/runner.ts [options]
 *
 * Options:
 *   --strategy <name>   Run only the specified strategy (keyword-baseline, semantic, hybrid)
 *   --scenario <name>   Run only the specified scenario
 *   --compare           Run all strategies and compare results
 *   --output <dir>      Output directory for reports (default: tests/extraction-accuracy/reports)
 *   --ci                Output in CI-friendly format
 *   --help              Show this help message
 */

import * as path from 'path'
import type {
  TestScenario,
  ScenarioResult,
  ExtractionMetrics,
} from './metrics/types'
import { createHarness } from './harness/extraction-harness'
import { getAllScenarios, getScenario } from './fixtures/synthetic-generator'
import {
  getStrategy,
  getStrategyNames,
  registerStrategy,
} from './strategies/interface'
import { createKeywordBaselineStrategy } from './strategies/keyword-baseline'
import { createSemanticStrategy } from './strategies/semantic-embeddings'
import { createHybridStrategy } from './strategies/hybrid'
import {
  generateReport,
  printReport,
  printMetrics,
  printStrategyComparison,
  printCISummary,
  saveReportToFile,
} from './metrics/reporter'
import { aggregateMetrics } from './metrics/calculator'

// Register available strategies
registerStrategy('keyword-baseline', createKeywordBaselineStrategy)
registerStrategy('semantic', createSemanticStrategy)
registerStrategy('hybrid', createHybridStrategy)

// Parse command line arguments
interface CLIArgs {
  strategy?: string
  scenario?: string
  compare: boolean
  output: string
  ci: boolean
  help: boolean
}

function parseArgs(): CLIArgs {
  const args: CLIArgs = {
    compare: false,
    output: path.join(__dirname, 'reports'),
    ci: false,
    help: false,
  }

  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--strategy':
        args.strategy = argv[++i]
        break
      case '--scenario':
        args.scenario = argv[++i]
        break
      case '--compare':
        args.compare = true
        break
      case '--output':
        args.output = argv[++i]
        break
      case '--ci':
        args.ci = true
        break
      case '--help':
        args.help = true
        break
    }
  }

  return args
}

function printHelp(): void {
  console.log(`
Extraction Accuracy Test Runner

Usage:
  npx tsx tests/extraction-accuracy/runner.ts [options]

Options:
  --strategy <name>   Run only the specified strategy
                      Available: ${getStrategyNames().join(', ')}
  --scenario <name>   Run only the specified scenario
                      Available: ${getAllScenarios().map(s => s.name).join(', ')}
  --compare           Run all strategies and compare results
  --output <dir>      Output directory for reports
  --ci                Output in CI-friendly format
  --help              Show this help message

Examples:
  # Run baseline strategy on all scenarios
  npx tsx tests/extraction-accuracy/runner.ts --strategy keyword-baseline

  # Compare all strategies
  npx tsx tests/extraction-accuracy/runner.ts --compare

  # Run specific scenario with all strategies
  npx tsx tests/extraction-accuracy/runner.ts --scenario "Paraphrase Detection" --compare
`)
}

/**
 * Run a single scenario with a single strategy
 */
async function runScenarioWithStrategy(
  scenario: TestScenario,
  strategyName: string
): Promise<ScenarioResult> {
  const strategy = getStrategy(strategyName)
  if (!strategy) {
    throw new Error(`Strategy not found: ${strategyName}`)
  }

  const harness = createHarness()
  await harness.setup(scenario)

  try {
    const results = await harness.runExtraction(strategy)
    const metrics = harness.evaluate(results, scenario)

    return {
      scenarioName: scenario.name,
      strategyName,
      metrics,
      extractedNotes: results.flatMap(r => r.extractedNotes),
      errors: [],
    }
  } catch (error) {
    return {
      scenarioName: scenario.name,
      strategyName,
      metrics: {
        duplicateDetection: {
          truePositives: 0,
          falsePositives: 0,
          falseNegatives: 0,
          trueNegatives: 0,
          precision: 0,
          recall: 0,
          f1Score: 0,
        },
        consolidation: {
          correctConsolidations: 0,
          missedConsolidations: 0,
          wrongConsolidations: 0,
          correctNewNotes: 0,
          accuracy: 0,
        },
        tagReuse: {
          reusedExisting: 0,
          correctlyCreatedNew: 0,
          shouldHaveReused: 0,
          reuseRate: 0,
          totalTagsAssigned: 0,
        },
        connections: {
          correctConnections: 0,
          missedConnections: 0,
          spuriousConnections: 0,
          precision: 0,
          recall: 0,
        },
        timing: {
          totalMs: 0,
          contextRetrievalMs: 0,
          extractionMs: 0,
        },
      },
      extractedNotes: [],
      errors: [error instanceof Error ? error.message : String(error)],
    }
  } finally {
    harness.teardown()
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = parseArgs()

  if (args.help) {
    printHelp()
    process.exit(0)
  }

  console.log('\n🧪 Extraction Accuracy Test Runner\n')

  // Determine which scenarios to run
  let scenarios: TestScenario[]
  if (args.scenario) {
    const scenario = getScenario(args.scenario)
    if (!scenario) {
      console.error(`Scenario not found: ${args.scenario}`)
      console.error(`Available scenarios: ${getAllScenarios().map(s => s.name).join(', ')}`)
      process.exit(1)
    }
    scenarios = [scenario]
  } else {
    scenarios = getAllScenarios()
  }

  // Determine which strategies to run
  let strategies: string[]
  if (args.compare) {
    strategies = getStrategyNames()
  } else if (args.strategy) {
    if (!getStrategy(args.strategy)) {
      console.error(`Strategy not found: ${args.strategy}`)
      console.error(`Available strategies: ${getStrategyNames().join(', ')}`)
      process.exit(1)
    }
    strategies = [args.strategy]
  } else {
    // Default to keyword-baseline
    strategies = ['keyword-baseline']
  }

  console.log(`Running ${scenarios.length} scenario(s) with ${strategies.length} strategy(ies):\n`)
  console.log(`  Scenarios: ${scenarios.map(s => s.name).join(', ')}`)
  console.log(`  Strategies: ${strategies.join(', ')}\n`)

  // Run all combinations
  const allResults: ScenarioResult[] = []
  const strategyMetrics = new Map<string, ExtractionMetrics>()

  for (const strategy of strategies) {
    const strategyResults: ScenarioResult[] = []

    for (const scenario of scenarios) {
      console.log(`  Running: ${scenario.name} with ${strategy}...`)
      const result = await runScenarioWithStrategy(scenario, strategy)
      allResults.push(result)
      strategyResults.push(result)

      if (result.errors.length > 0) {
        console.log(`    ❌ Errors: ${result.errors.join(', ')}`)
      } else {
        console.log(`    ✓ F1: ${(result.metrics.duplicateDetection.f1Score * 100).toFixed(1)}% | ` +
          `Cons: ${(result.metrics.consolidation.accuracy * 100).toFixed(1)}% | ` +
          `Tags: ${(result.metrics.tagReuse.reuseRate * 100).toFixed(1)}%`)
      }
    }

    // Aggregate metrics for this strategy
    const aggregated = aggregateMetrics(strategyResults.map(r => r.metrics))
    strategyMetrics.set(strategy, aggregated)
  }

  console.log('\n')

  // Generate and output report
  const report = generateReport(allResults, strategyMetrics)

  if (args.ci) {
    printCISummary(report)
  } else {
    // Print detailed results
    if (args.compare && strategies.length > 1) {
      printStrategyComparison(strategyMetrics)
    }

    printReport(report)

    // Save report to file
    const reportPath = saveReportToFile(report, args.output)
    console.log(`\n📄 Report saved to: ${reportPath}`)
  }

  // Exit with error code if any strategy fails to meet thresholds
  const bestMetrics = strategyMetrics.get(report.summary.bestStrategy)
  if (bestMetrics) {
    const f1Pass = bestMetrics.duplicateDetection.f1Score >= 0.7
    const consPass = bestMetrics.consolidation.accuracy >= 0.7
    const tagPass = bestMetrics.tagReuse.reuseRate >= 0.8

    if (!f1Pass || !consPass || !tagPass) {
      console.log('\n⚠️  Some metrics below threshold:')
      if (!f1Pass) console.log('   - F1 Score < 70%')
      if (!consPass) console.log('   - Consolidation Accuracy < 70%')
      if (!tagPass) console.log('   - Tag Reuse Rate < 80%')
      process.exit(1)
    }
  }

  console.log('\n✅ All tests completed\n')
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
