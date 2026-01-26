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
 *   --quality           Include NVQ (Note Quality) evaluation
 *   --quality-only      Run only NVQ evaluation (skip standard extraction accuracy tests)
 *   --verbose           Show detailed output including individual note scores
 *   --help              Show this help message
 */

import * as path from 'path'
import type {
  TestScenario,
  ScenarioResult,
  ExtractionMetrics,
  QualityEvaluationResults,
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
  generateReportWithQuality,
  printReport,
  printMetrics,
  printStrategyComparison,
  printCISummary,
  printCISummaryWithQuality,
  printQualityReport,
  saveReportToFile,
} from './metrics/reporter'
import { aggregateMetrics, evaluateQuality } from './metrics/calculator'
import {
  ALL_QUALITY_SCENARIOS,
  SMOKE_TEST_SCENARIOS,
  getQualityScenarioByName,
} from './fixtures/quality-scenarios'
import type { QualityTestScenario } from './quality/types'

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
  quality: boolean
  qualityOnly: boolean
  verbose: boolean
  help: boolean
}

function parseArgs(): CLIArgs {
  const args: CLIArgs = {
    compare: false,
    output: path.join(__dirname, 'reports'),
    ci: false,
    quality: false,
    qualityOnly: false,
    verbose: false,
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
      case '--quality':
        args.quality = true
        break
      case '--quality-only':
        args.qualityOnly = true
        args.quality = true
        break
      case '--verbose':
        args.verbose = true
        break
      case '--help':
        args.help = true
        break
    }
  }

  return args
}

function printHelp(): void {
  const qualityScenarioNames = ALL_QUALITY_SCENARIOS.slice(0, 5).map(s => s.name).join(', ')
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
  --quality           Include NVQ (Note Quality) evaluation
  --quality-only      Run only NVQ evaluation (skip extraction accuracy tests)
  --verbose           Show detailed output including individual note scores
  --help              Show this help message

Quality Scenarios (${ALL_QUALITY_SCENARIOS.length} total):
  ${qualityScenarioNames}...

Examples:
  # Run baseline strategy on all scenarios
  npx tsx tests/extraction-accuracy/runner.ts --strategy keyword-baseline

  # Compare all strategies
  npx tsx tests/extraction-accuracy/runner.ts --compare

  # Run specific scenario with all strategies
  npx tsx tests/extraction-accuracy/runner.ts --scenario "Paraphrase Detection" --compare

  # Run with NVQ quality evaluation
  npx tsx tests/extraction-accuracy/runner.ts --quality

  # Run only NVQ quality evaluation
  npx tsx tests/extraction-accuracy/runner.ts --quality-only --verbose
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
 * Run quality evaluation for a single scenario
 */
async function runQualityScenario(
  scenario: QualityTestScenario,
  strategyName: string
): Promise<{ scenarioResult: ScenarioResult; qualityResults: QualityEvaluationResults }> {
  const strategy = getStrategy(strategyName)
  if (!strategy) {
    throw new Error(`Strategy not found: ${strategyName}`)
  }

  // Convert quality scenario to standard TestScenario format
  const testScenario: TestScenario = {
    name: scenario.name,
    description: scenario.description,
    documents: scenario.documents.map((doc, i) => ({
      id: doc.id || `doc-${i}`,
      content: doc.content,
      metadata: doc.metadata || {},
    })),
    existingNotes: scenario.existingNotes.map(n => ({
      id: n.id,
      title: n.title,
      content: n.content,
      tags: [],
    })),
    existingTags: scenario.existingTags,
    expectedNotes: scenario.qualityExpectations.map(exp => ({
      titlePatterns: exp.titlePatterns,
      requiredPhrases: exp.contentMustContain || [],
      shouldConsolidateWith: null,
      expectedTags: exp.expectedFunctionalTags || [],
      expectedConnections: (exp.expectedSidewaysLinks || []).map(link => ({
        targetTitlePattern: link,
        types: ['related'],
      })),
    })),
    expectedConsolidations: [],
  }

  const harness = createHarness()
  await harness.setup(testScenario)

  try {
    const results = await harness.runExtraction(strategy)
    const extractedNotes = results.flatMap(r => r.extractedNotes)
    const metrics = harness.evaluate(results, testScenario)

    // Run quality evaluation
    const qualityResults = evaluateQuality(
      extractedNotes,
      scenario.qualityExpectations,
      {
        scenarioName: scenario.name,
        availableProjects: scenario.availableProjects || [],
        availableMOCs: scenario.availableMOCs || [],
        minimumNVQ: 7,
      }
    )

    return {
      scenarioResult: {
        scenarioName: scenario.name,
        strategyName,
        metrics,
        extractedNotes,
        errors: [],
      },
      qualityResults,
    }
  } catch (error) {
    return {
      scenarioResult: {
        scenarioName: scenario.name,
        strategyName,
        metrics: {
          duplicateDetection: { truePositives: 0, falsePositives: 0, falseNegatives: 0, trueNegatives: 0, precision: 0, recall: 0, f1Score: 0 },
          consolidation: { correctConsolidations: 0, missedConsolidations: 0, wrongConsolidations: 0, correctNewNotes: 0, accuracy: 0 },
          tagReuse: { reusedExisting: 0, correctlyCreatedNew: 0, shouldHaveReused: 0, reuseRate: 0, totalTagsAssigned: 0 },
          connections: { correctConnections: 0, missedConnections: 0, spuriousConnections: 0, precision: 0, recall: 0 },
          timing: { totalMs: 0, contextRetrievalMs: 0, extractionMs: 0 },
        },
        extractedNotes: [],
        errors: [error instanceof Error ? error.message : String(error)],
      },
      qualityResults: {
        scenarioName: scenario.name,
        noteResults: [],
        aggregateMetrics: {
          meanNVQ: 0, medianNVQ: 0, minNVQ: 0, maxNVQ: 0, passingRate: 0,
          whyFailureRate: 1, metadataFailureRate: 1, taxonomyFailureRate: 1,
          connectivityFailureRate: 1, originalityFailureRate: 1, topFailures: [],
        },
        expectationResults: [],
      },
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

  // Quality-only mode
  if (args.qualityOnly) {
    console.log('Running NVQ (Note Quality) evaluation only...\n')

    const qualityScenarios = args.scenario
      ? [getQualityScenarioByName(args.scenario)].filter((s): s is QualityTestScenario => s !== undefined)
      : SMOKE_TEST_SCENARIOS // Use smoke test by default for faster runs

    if (qualityScenarios.length === 0) {
      console.error(`Quality scenario not found: ${args.scenario}`)
      process.exit(1)
    }

    const strategyName = args.strategy || 'keyword-baseline'
    console.log(`Running ${qualityScenarios.length} quality scenario(s) with ${strategyName}:\n`)

    const qualityResults = new Map<string, QualityEvaluationResults>()

    for (const scenario of qualityScenarios) {
      console.log(`  Evaluating: ${scenario.name}...`)
      try {
        const result = await runQualityScenario(scenario, strategyName)
        qualityResults.set(scenario.name, result.qualityResults)

        const nvq = result.qualityResults.aggregateMetrics
        const passing = result.qualityResults.noteResults.filter(r => r.nvqScore.passing).length
        const total = result.qualityResults.noteResults.length

        console.log(`    ✓ Mean NVQ: ${nvq.meanNVQ.toFixed(1)} | Passing: ${passing}/${total}`)
      } catch (error) {
        console.log(`    ❌ Error: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    console.log('\n')

    // Print quality report
    if (args.ci) {
      const allNotes = Array.from(qualityResults.values()).flatMap(r => r.noteResults)
      const scores = allNotes.map(n => n.nvqScore.total)
      const mean = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
      const passingRate = scores.length > 0 ? scores.filter(s => s >= 7).length / scores.length : 0

      console.log('NVQ_EVALUATION_RESULTS')
      console.log(`NVQ_STATUS=${passingRate >= 0.7 ? 'PASS' : 'FAIL'}`)
      console.log(`NVQ_MEAN=${mean.toFixed(1)}`)
      console.log(`NVQ_PASSING_RATE=${(passingRate * 100).toFixed(1)}`)
    } else {
      printQualityReport(qualityResults, args.verbose)
    }

    // Check threshold
    const allNotes = Array.from(qualityResults.values()).flatMap(r => r.noteResults)
    const passingRate = allNotes.length > 0
      ? allNotes.filter(n => n.nvqScore.passing).length / allNotes.length
      : 0

    if (passingRate < 0.7) {
      console.log(`\n⚠️  NVQ passing rate ${(passingRate * 100).toFixed(1)}% below 70% threshold`)
      process.exit(1)
    }

    console.log('\n✅ Quality evaluation completed\n')
    return
  }

  // Standard extraction accuracy testing (with optional quality)
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
  console.log(`  Strategies: ${strategies.join(', ')}`)
  if (args.quality) {
    console.log(`  Quality: NVQ evaluation enabled`)
  }
  console.log()

  // Run all combinations
  const allResults: ScenarioResult[] = []
  const strategyMetrics = new Map<string, ExtractionMetrics>()
  const qualityResults = new Map<string, QualityEvaluationResults>()

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

      // Run quality evaluation if enabled
      if (args.quality && result.extractedNotes.length > 0) {
        const qResults = evaluateQuality(
          result.extractedNotes,
          scenario.expectedNotes.map(exp => ({
            titlePatterns: exp.titlePatterns,
            contentMustContain: exp.requiredPhrases || [],
            purposePattern: /.*/,
            expectedProject: null,
            expectedStatus: 'Seed' as const,
            expectedType: 'Logic' as const,
            expectedStakeholder: 'Self' as const,
            expectedFunctionalTags: exp.expectedTags || [],
            forbiddenTags: [],
            expectedUpwardLink: null,
            expectedSidewaysLinks: exp.expectedConnections?.map(c => c.targetTitlePattern) || [],
            isSynthesis: true,
            synthesisIndicators: [],
          })),
          {
            scenarioName: scenario.name,
            minimumNVQ: 7,
          }
        )
        qualityResults.set(`${scenario.name}:${strategy}`, qResults)

        const nvq = qResults.aggregateMetrics
        console.log(`      NVQ: ${nvq.meanNVQ.toFixed(1)} avg | ${(nvq.passingRate * 100).toFixed(0)}% passing`)
      }
    }

    // Aggregate metrics for this strategy
    const aggregated = aggregateMetrics(strategyResults.map(r => r.metrics))
    strategyMetrics.set(strategy, aggregated)
  }

  console.log('\n')

  // Generate and output report
  const report = args.quality
    ? generateReportWithQuality(allResults, strategyMetrics, qualityResults)
    : generateReport(allResults, strategyMetrics)

  if (args.ci) {
    if (args.quality && 'qualitySummary' in report) {
      printCISummaryWithQuality(report)
    } else {
      printCISummary(report)
    }
  } else {
    // Print detailed results
    if (args.compare && strategies.length > 1) {
      printStrategyComparison(strategyMetrics)
    }

    printReport(report)

    // Print quality report if enabled
    if (args.quality && qualityResults.size > 0) {
      printQualityReport(qualityResults, args.verbose)
    }

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

  // Check quality threshold if enabled
  if (args.quality && qualityResults.size > 0) {
    const allNotes = Array.from(qualityResults.values()).flatMap(r => r.noteResults)
    const passingRate = allNotes.length > 0
      ? allNotes.filter(n => n.nvqScore.passing).length / allNotes.length
      : 0

    if (passingRate < 0.7) {
      console.log(`\n⚠️  NVQ passing rate ${(passingRate * 100).toFixed(1)}% below 70% threshold`)
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
