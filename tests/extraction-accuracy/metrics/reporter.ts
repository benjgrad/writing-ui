/**
 * Report generation for extraction accuracy tests
 *
 * Outputs results in various formats: console, JSON, and summary reports.
 */

import * as fs from 'fs'
import * as path from 'path'
import type {
  TestReport,
  TestReportWithQuality,
  ScenarioResult,
  ExtractionMetrics,
  NVQScore,
  NoteQualityMetrics,
  QualityEvaluationResults,
} from './types'
import { aggregateMetrics } from './calculator'

/**
 * ANSI color codes for terminal output
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

/**
 * Format a percentage with color coding
 */
function formatPercent(value: number, thresholds = { good: 0.8, ok: 0.6 }): string {
  const percent = (value * 100).toFixed(1) + '%'
  if (value >= thresholds.good) {
    return `${colors.green}${percent}${colors.reset}`
  } else if (value >= thresholds.ok) {
    return `${colors.yellow}${percent}${colors.reset}`
  }
  return `${colors.red}${percent}${colors.reset}`
}

/**
 * Format a number with padding
 */
function pad(value: number | string, width: number): string {
  return String(value).padStart(width)
}

/**
 * Print a horizontal line
 */
function printLine(char = '-', width = 80): void {
  console.log(char.repeat(width))
}

/**
 * Print metrics for a single scenario/strategy
 */
export function printMetrics(metrics: ExtractionMetrics, label: string): void {
  console.log(`\n${colors.bright}${colors.cyan}${label}${colors.reset}\n`)

  // Duplicate Detection
  console.log(`${colors.bright}Duplicate Detection:${colors.reset}`)
  console.log(`  Precision:    ${formatPercent(metrics.duplicateDetection.precision)}`)
  console.log(`  Recall:       ${formatPercent(metrics.duplicateDetection.recall)}`)
  console.log(`  F1 Score:     ${formatPercent(metrics.duplicateDetection.f1Score)}`)
  console.log(`  TP/FP/FN/TN:  ${metrics.duplicateDetection.truePositives}/${metrics.duplicateDetection.falsePositives}/${metrics.duplicateDetection.falseNegatives}/${metrics.duplicateDetection.trueNegatives}`)

  // Consolidation
  console.log(`\n${colors.bright}Consolidation:${colors.reset}`)
  console.log(`  Accuracy:     ${formatPercent(metrics.consolidation.accuracy)}`)
  console.log(`  Correct:      ${metrics.consolidation.correctConsolidations}`)
  console.log(`  Missed:       ${metrics.consolidation.missedConsolidations}`)
  console.log(`  Wrong:        ${metrics.consolidation.wrongConsolidations}`)
  console.log(`  New Notes:    ${metrics.consolidation.correctNewNotes}`)

  // Tag Reuse
  console.log(`\n${colors.bright}Tag Reuse:${colors.reset}`)
  console.log(`  Reuse Rate:   ${formatPercent(metrics.tagReuse.reuseRate, { good: 0.9, ok: 0.7 })}`)
  console.log(`  Reused:       ${metrics.tagReuse.reusedExisting}`)
  console.log(`  Should Reuse: ${metrics.tagReuse.shouldHaveReused}`)
  console.log(`  New (correct):${metrics.tagReuse.correctlyCreatedNew}`)

  // Connections
  console.log(`\n${colors.bright}Connections:${colors.reset}`)
  console.log(`  Precision:    ${formatPercent(metrics.connections.precision)}`)
  console.log(`  Recall:       ${formatPercent(metrics.connections.recall)}`)
  console.log(`  Correct:      ${metrics.connections.correctConnections}`)
  console.log(`  Missed:       ${metrics.connections.missedConnections}`)
  console.log(`  Spurious:     ${metrics.connections.spuriousConnections}`)

  // Timing
  console.log(`\n${colors.bright}Timing:${colors.reset}`)
  console.log(`  Total:        ${metrics.timing.totalMs.toFixed(0)}ms`)
  console.log(`  Context:      ${metrics.timing.contextRetrievalMs.toFixed(0)}ms`)
  console.log(`  Extraction:   ${metrics.timing.extractionMs.toFixed(0)}ms`)
}

/**
 * Print comparison table of strategies
 */
export function printStrategyComparison(
  results: Map<string, ExtractionMetrics>
): void {
  console.log(`\n${colors.bright}${colors.magenta}Strategy Comparison${colors.reset}\n`)

  const strategies = Array.from(results.keys())
  const headerRow = ['Metric', ...strategies]

  // Determine column widths
  const colWidths = headerRow.map((h, i) =>
    Math.max(h.length, i === 0 ? 20 : 12)
  )

  // Print header
  const header = headerRow.map((h, i) => pad(h, colWidths[i])).join(' | ')
  console.log(header)
  printLine('-', header.length)

  // Define metrics to display
  const metrics: Array<{ label: string; getValue: (m: ExtractionMetrics) => number }> = [
    { label: 'Dup. F1 Score', getValue: m => m.duplicateDetection.f1Score },
    { label: 'Dup. Precision', getValue: m => m.duplicateDetection.precision },
    { label: 'Dup. Recall', getValue: m => m.duplicateDetection.recall },
    { label: 'Cons. Accuracy', getValue: m => m.consolidation.accuracy },
    { label: 'Tag Reuse Rate', getValue: m => m.tagReuse.reuseRate },
    { label: 'Conn. Precision', getValue: m => m.connections.precision },
    { label: 'Conn. Recall', getValue: m => m.connections.recall },
    { label: 'Avg Time (ms)', getValue: m => m.timing.totalMs },
  ]

  for (const metric of metrics) {
    const row = [
      pad(metric.label, colWidths[0]),
      ...strategies.map((s, i) => {
        const value = metric.getValue(results.get(s)!)
        const formatted = metric.label.includes('Time')
          ? value.toFixed(0)
          : (value * 100).toFixed(1) + '%'
        return pad(formatted, colWidths[i + 1])
      }),
    ]
    console.log(row.join(' | '))
  }
}

/**
 * Generate recommendations based on results
 */
function generateRecommendations(
  results: Map<string, ExtractionMetrics>
): string[] {
  const recommendations: string[] = []
  const strategies = Array.from(results.entries())

  // Find best strategy for each metric
  let bestF1Strategy = ''
  let bestF1Score = 0
  let bestConsStrategy = ''
  let bestConsScore = 0
  let bestTagStrategy = ''
  let bestTagScore = 0

  for (const [name, metrics] of strategies) {
    if (metrics.duplicateDetection.f1Score > bestF1Score) {
      bestF1Score = metrics.duplicateDetection.f1Score
      bestF1Strategy = name
    }
    if (metrics.consolidation.accuracy > bestConsScore) {
      bestConsScore = metrics.consolidation.accuracy
      bestConsStrategy = name
    }
    if (metrics.tagReuse.reuseRate > bestTagScore) {
      bestTagScore = metrics.tagReuse.reuseRate
      bestTagStrategy = name
    }
  }

  // Overall recommendation
  if (bestF1Strategy === bestConsStrategy && bestConsStrategy === bestTagStrategy) {
    recommendations.push(`Use "${bestF1Strategy}" - it performs best across all metrics`)
  } else {
    recommendations.push(`Best for duplicate detection: "${bestF1Strategy}" (F1: ${(bestF1Score * 100).toFixed(1)}%)`)
    recommendations.push(`Best for consolidation: "${bestConsStrategy}" (Accuracy: ${(bestConsScore * 100).toFixed(1)}%)`)
    recommendations.push(`Best for tag reuse: "${bestTagStrategy}" (Rate: ${(bestTagScore * 100).toFixed(1)}%)`)
  }

  // Specific improvement suggestions
  for (const [name, metrics] of strategies) {
    if (metrics.duplicateDetection.recall < 0.7) {
      recommendations.push(`"${name}": Improve duplicate recall - too many duplicates being missed`)
    }
    if (metrics.tagReuse.reuseRate < 0.8) {
      recommendations.push(`"${name}": Improve tag matching - too many synonymous tags being created`)
    }
    if (metrics.consolidation.missedConsolidations > metrics.consolidation.correctConsolidations) {
      recommendations.push(`"${name}": Improve consolidation detection - more consolidations missed than caught`)
    }
  }

  return recommendations
}

/**
 * Generate full test report
 */
export function generateReport(
  results: ScenarioResult[],
  strategyMetrics: Map<string, ExtractionMetrics>
): TestReport {
  const runId = `run-${Date.now()}`
  const timestamp = new Date().toISOString()

  // Find best strategy
  let bestStrategy = ''
  let bestOverallScore = 0
  for (const [name, metrics] of strategyMetrics) {
    const overallScore = (
      metrics.duplicateDetection.f1Score * 0.4 +
      metrics.consolidation.accuracy * 0.3 +
      metrics.tagReuse.reuseRate * 0.3
    )
    if (overallScore > bestOverallScore) {
      bestOverallScore = overallScore
      bestStrategy = name
    }
  }

  const bestMetrics = strategyMetrics.get(bestStrategy)!

  // Build by-scenario breakdown
  const byScenario: TestReport['byScenario'] = {}
  for (const result of results) {
    if (!byScenario[result.scenarioName]) {
      byScenario[result.scenarioName] = { byStrategy: {} }
    }
    byScenario[result.scenarioName].byStrategy[result.strategyName] = result.metrics
  }

  return {
    runId,
    timestamp,
    summary: {
      overallF1Score: bestMetrics.duplicateDetection.f1Score,
      overallConsolidationAccuracy: bestMetrics.consolidation.accuracy,
      overallTagReuseRate: bestMetrics.tagReuse.reuseRate,
      bestStrategy,
      recommendations: generateRecommendations(strategyMetrics),
    },
    byScenario,
    rawResults: results,
  }
}

/**
 * Save report to JSON file
 */
export function saveReportToFile(report: TestReport, outputDir: string): string {
  const filename = `extraction-accuracy-${report.runId}.json`
  const filepath = path.join(outputDir, filename)

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  fs.writeFileSync(filepath, JSON.stringify(report, null, 2))
  return filepath
}

/**
 * Print full report to console
 */
export function printReport(report: TestReport): void {
  printLine('=', 80)
  console.log(`${colors.bright}${colors.magenta}EXTRACTION ACCURACY TEST REPORT${colors.reset}`)
  console.log(`Run ID: ${report.runId}`)
  console.log(`Time: ${report.timestamp}`)
  printLine('=', 80)

  // Summary
  console.log(`\n${colors.bright}SUMMARY${colors.reset}`)
  console.log(`Best Strategy: ${colors.cyan}${report.summary.bestStrategy}${colors.reset}`)
  console.log(`Overall F1 Score: ${formatPercent(report.summary.overallF1Score)}`)
  console.log(`Consolidation Accuracy: ${formatPercent(report.summary.overallConsolidationAccuracy)}`)
  console.log(`Tag Reuse Rate: ${formatPercent(report.summary.overallTagReuseRate, { good: 0.9, ok: 0.7 })}`)

  // Recommendations
  console.log(`\n${colors.bright}RECOMMENDATIONS${colors.reset}`)
  for (const rec of report.summary.recommendations) {
    console.log(`  - ${rec}`)
  }

  // Per-scenario breakdown
  printLine('=', 80)
  console.log(`\n${colors.bright}RESULTS BY SCENARIO${colors.reset}`)

  for (const [scenarioName, data] of Object.entries(report.byScenario)) {
    console.log(`\n${colors.bright}${colors.blue}${scenarioName}${colors.reset}`)
    printLine('-', 40)

    for (const [strategyName, metrics] of Object.entries(data.byStrategy)) {
      console.log(`  ${colors.cyan}${strategyName}${colors.reset}:`)
      console.log(`    F1=${formatPercent(metrics.duplicateDetection.f1Score)} ` +
        `Cons=${formatPercent(metrics.consolidation.accuracy)} ` +
        `Tags=${formatPercent(metrics.tagReuse.reuseRate, { good: 0.9, ok: 0.7 })}`)
    }
  }

  printLine('=', 80)
}

/**
 * Print a quick summary for CI/automated testing
 */
export function printCISummary(report: TestReport): void {
  console.log('EXTRACTION_ACCURACY_TEST_RESULTS')
  console.log(`STATUS=${report.summary.overallF1Score >= 0.7 ? 'PASS' : 'FAIL'}`)
  console.log(`BEST_STRATEGY=${report.summary.bestStrategy}`)
  console.log(`F1_SCORE=${(report.summary.overallF1Score * 100).toFixed(1)}`)
  console.log(`CONSOLIDATION_ACCURACY=${(report.summary.overallConsolidationAccuracy * 100).toFixed(1)}`)
  console.log(`TAG_REUSE_RATE=${(report.summary.overallTagReuseRate * 100).toFixed(1)}`)
}

// =============================================================================
// NVQ (Note Quality) Reporting Functions
// =============================================================================

/**
 * Format NVQ score with color coding
 */
function formatNVQScore(score: number, max: number = 10): string {
  const percent = score / max
  const scoreStr = score.toFixed(1)
  if (percent >= 0.7) {
    return `${colors.green}${scoreStr}${colors.reset}`
  } else if (percent >= 0.5) {
    return `${colors.yellow}${scoreStr}${colors.reset}`
  }
  return `${colors.red}${scoreStr}${colors.reset}`
}

/**
 * Format a component score with its max value
 */
function formatComponentScore(score: number, max: number): string {
  const percent = score / max
  const str = `${score.toFixed(1)}/${max}`
  if (percent >= 0.7) {
    return `${colors.green}${str}${colors.reset}`
  } else if (percent >= 0.5) {
    return `${colors.yellow}${str}${colors.reset}`
  }
  return `${colors.red}${str}${colors.reset}`
}

/**
 * Create a simple bar chart
 */
function createBar(value: number, max: number = 1, width: number = 20): string {
  const filled = Math.round((value / max) * width)
  const empty = width - filled
  const bar = '█'.repeat(filled) + '░'.repeat(empty)
  const percent = value >= 0.7 ? colors.green : value >= 0.5 ? colors.yellow : colors.red
  return `${percent}${bar}${colors.reset}`
}

/**
 * Print NVQ metrics summary
 */
export function printQualityMetrics(metrics: NoteQualityMetrics, label: string = 'Note Quality (NVQ) Metrics'): void {
  console.log(`\n${colors.bright}${colors.cyan}${label}${colors.reset}\n`)

  // Overall scores
  console.log(`${colors.bright}Overall Scores:${colors.reset}`)
  console.log(`  Mean NVQ:     ${formatNVQScore(metrics.meanNVQ)} ${createBar(metrics.meanNVQ / 10)}`)
  console.log(`  Median NVQ:   ${formatNVQScore(metrics.medianNVQ)} ${createBar(metrics.medianNVQ / 10)}`)
  console.log(`  Min/Max:      ${metrics.minNVQ.toFixed(1)} / ${metrics.maxNVQ.toFixed(1)}`)
  console.log(`  Passing Rate: ${formatPercent(metrics.passingRate)} ${createBar(metrics.passingRate)}`)

  // Component failure rates
  console.log(`\n${colors.bright}Component Failure Rates:${colors.reset}`)
  console.log(`  Why:          ${formatPercent(1 - metrics.whyFailureRate)} passing ${createBar(1 - metrics.whyFailureRate)}`)
  console.log(`  Metadata:     ${formatPercent(1 - metrics.metadataFailureRate)} passing ${createBar(1 - metrics.metadataFailureRate)}`)
  console.log(`  Taxonomy:     ${formatPercent(1 - metrics.taxonomyFailureRate)} passing ${createBar(1 - metrics.taxonomyFailureRate)}`)
  console.log(`  Connectivity: ${formatPercent(1 - metrics.connectivityFailureRate)} passing ${createBar(1 - metrics.connectivityFailureRate)}`)
  console.log(`  Originality:  ${formatPercent(1 - metrics.originalityFailureRate)} passing ${createBar(1 - metrics.originalityFailureRate)}`)

  // Top issues
  if (metrics.topFailures.length > 0) {
    console.log(`\n${colors.bright}Top Issues:${colors.reset}`)
    for (const failure of metrics.topFailures.slice(0, 5)) {
      console.log(`  ${colors.red}•${colors.reset} [${failure.component}] ${failure.issue} (${failure.count} notes)`)
    }
  }
}

/**
 * Print detailed NVQ breakdown for a single note
 */
export function printNVQBreakdown(score: NVQScore, noteTitle: string): void {
  const status = score.passing
    ? `${colors.green}PASS${colors.reset}`
    : `${colors.red}FAIL${colors.reset}`

  console.log(`\n  ${colors.bright}${noteTitle}${colors.reset} [${status}]`)
  console.log(`    Total: ${formatNVQScore(score.total)}/10`)
  console.log(`    Components:`)
  console.log(`      Why:          ${formatComponentScore(score.breakdown.why.score, 3)}`)
  console.log(`      Metadata:     ${formatComponentScore(score.breakdown.metadata.score, 2)}`)
  console.log(`      Taxonomy:     ${formatComponentScore(score.breakdown.taxonomy.score, 2)}`)
  console.log(`      Connectivity: ${formatComponentScore(score.breakdown.connectivity.score, 2)}`)
  console.log(`      Originality:  ${formatComponentScore(score.breakdown.originality.score, 1)}`)

  if (score.failingComponents.length > 0) {
    console.log(`    ${colors.yellow}Failing:${colors.reset} ${score.failingComponents.join(', ')}`)
  }
}

/**
 * Print quality evaluation results for a scenario
 */
export function printQualityResults(results: QualityEvaluationResults, verbose: boolean = false): void {
  console.log(`\n${colors.bright}${colors.blue}Quality Results: ${results.scenarioName}${colors.reset}`)
  printLine('-', 60)

  // Summary stats
  console.log(`Notes Evaluated: ${results.noteResults.length}`)
  console.log(`Passing: ${results.noteResults.filter(r => r.nvqScore.passing).length}/${results.noteResults.length}`)

  // Aggregate metrics
  printQualityMetrics(results.aggregateMetrics, 'Aggregate Metrics')

  // Individual note breakdowns (if verbose)
  if (verbose && results.noteResults.length > 0) {
    console.log(`\n${colors.bright}Individual Note Scores:${colors.reset}`)
    for (const noteResult of results.noteResults) {
      printNVQBreakdown(noteResult.nvqScore, noteResult.noteTitle)
    }
  }
}

/**
 * Generate quality recommendations based on metrics
 */
export function generateQualityRecommendations(metrics: NoteQualityMetrics): string[] {
  const recommendations: string[] = []

  // Check each component failure rate
  if (metrics.whyFailureRate > 0.3) {
    recommendations.push(
      `Why statements failing ${(metrics.whyFailureRate * 100).toFixed(0)}% - ` +
      `Improve extraction to capture first-person purpose statements ("I am keeping this because...")`
    )
  }

  if (metrics.metadataFailureRate > 0.3) {
    recommendations.push(
      `Metadata incomplete ${(metrics.metadataFailureRate * 100).toFixed(0)}% - ` +
      `Ensure notes include Status (Seed/Sapling/Evergreen), Type, and Stakeholder fields`
    )
  }

  if (metrics.taxonomyFailureRate > 0.3) {
    recommendations.push(
      `Taxonomy issues ${(metrics.taxonomyFailureRate * 100).toFixed(0)}% - ` +
      `Use functional tags (#task/*, #skill/*, #insight/*) instead of generic topic tags`
    )
  }

  if (metrics.connectivityFailureRate > 0.3) {
    recommendations.push(
      `Connectivity gaps ${(metrics.connectivityFailureRate * 100).toFixed(0)}% - ` +
      `Each note needs upward link (MOC/Project) and sideways links (related concepts)`
    )
  }

  if (metrics.originalityFailureRate > 0.5) {
    recommendations.push(
      `Low originality ${(metrics.originalityFailureRate * 100).toFixed(0)}% - ` +
      `Notes should synthesize insights, not just capture raw facts`
    )
  }

  // Overall passing rate
  if (metrics.passingRate < 0.7) {
    recommendations.push(
      `Only ${(metrics.passingRate * 100).toFixed(0)}% of notes pass NVQ threshold (target: 70%) - ` +
      `Focus on improving the weakest components first`
    )
  }

  // Add recommendations from top failures
  for (const failure of metrics.topFailures.slice(0, 3)) {
    if (!recommendations.some(r => r.includes(failure.issue))) {
      recommendations.push(`Address "${failure.issue}" in ${failure.component} component (${failure.count} notes affected)`)
    }
  }

  return recommendations
}

/**
 * Print full quality report
 */
export function printQualityReport(
  qualityResults: Map<string, QualityEvaluationResults>,
  verbose: boolean = false
): void {
  printLine('=', 80)
  console.log(`${colors.bright}${colors.magenta}NOTE QUALITY (NVQ) REPORT${colors.reset}`)
  printLine('=', 80)

  // Aggregate across all scenarios
  const allNoteResults = Array.from(qualityResults.values()).flatMap(r => r.noteResults)
  const allScores = allNoteResults.map(r => r.nvqScore.total)

  if (allScores.length === 0) {
    console.log(`\n${colors.yellow}No notes evaluated.${colors.reset}`)
    return
  }

  // Calculate overall metrics
  const mean = allScores.reduce((a, b) => a + b, 0) / allScores.length
  const sorted = [...allScores].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  const passing = allScores.filter(s => s >= 7).length
  const passingRate = passing / allScores.length

  console.log(`\n${colors.bright}OVERALL SUMMARY${colors.reset}`)
  console.log(`Total Notes Evaluated: ${allScores.length}`)
  console.log(`Mean NVQ Score:        ${formatNVQScore(mean)} ${createBar(mean / 10)}`)
  console.log(`Median NVQ Score:      ${formatNVQScore(median)} ${createBar(median / 10)}`)
  console.log(`Passing Rate:          ${formatPercent(passingRate)} (${passing}/${allScores.length} notes ≥7)`)

  // Per-scenario breakdown
  console.log(`\n${colors.bright}BY SCENARIO${colors.reset}`)
  printLine('-', 60)

  for (const [scenarioName, results] of qualityResults) {
    const scenarioScores = results.noteResults.map(r => r.nvqScore.total)
    const scenarioMean = scenarioScores.reduce((a, b) => a + b, 0) / scenarioScores.length
    const scenarioPassing = scenarioScores.filter(s => s >= 7).length

    console.log(`\n${colors.cyan}${scenarioName}${colors.reset}`)
    console.log(`  Notes: ${scenarioScores.length}  Mean: ${formatNVQScore(scenarioMean)}  Passing: ${scenarioPassing}/${scenarioScores.length}`)

    if (verbose) {
      printQualityResults(results, true)
    }
  }

  // Recommendations
  const aggregateMetrics: NoteQualityMetrics = {
    meanNVQ: mean,
    medianNVQ: median,
    minNVQ: Math.min(...allScores),
    maxNVQ: Math.max(...allScores),
    passingRate,
    whyFailureRate: allNoteResults.filter(r => r.nvqScore.breakdown.why.score < 1).length / allNoteResults.length,
    metadataFailureRate: allNoteResults.filter(r => r.nvqScore.breakdown.metadata.score < 1).length / allNoteResults.length,
    taxonomyFailureRate: allNoteResults.filter(r => r.nvqScore.breakdown.taxonomy.score < 1).length / allNoteResults.length,
    connectivityFailureRate: allNoteResults.filter(r => r.nvqScore.breakdown.connectivity.score < 1).length / allNoteResults.length,
    originalityFailureRate: allNoteResults.filter(r => r.nvqScore.breakdown.originality.score < 1).length / allNoteResults.length,
    topFailures: [],
  }

  const recommendations = generateQualityRecommendations(aggregateMetrics)
  if (recommendations.length > 0) {
    console.log(`\n${colors.bright}RECOMMENDATIONS${colors.reset}`)
    for (const rec of recommendations) {
      console.log(`  ${colors.yellow}•${colors.reset} ${rec}`)
    }
  }

  printLine('=', 80)
}

/**
 * Generate report with quality metrics
 */
export function generateReportWithQuality(
  results: ScenarioResult[],
  strategyMetrics: Map<string, ExtractionMetrics>,
  qualityResults?: Map<string, QualityEvaluationResults>
): TestReportWithQuality {
  // Generate base report
  const baseReport = generateReport(results, strategyMetrics)

  if (!qualityResults || qualityResults.size === 0) {
    return baseReport as TestReportWithQuality
  }

  // Aggregate quality metrics
  const allNoteResults = Array.from(qualityResults.values()).flatMap(r => r.noteResults)

  if (allNoteResults.length === 0) {
    return baseReport as TestReportWithQuality
  }

  const allScores = allNoteResults.map(r => r.nvqScore.total)
  const mean = allScores.reduce((a, b) => a + b, 0) / allScores.length
  const sorted = [...allScores].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  const passingRate = allScores.filter(s => s >= 7).length / allScores.length

  // Component means
  const componentScores = {
    why: allNoteResults.reduce((sum, r) => sum + r.nvqScore.breakdown.why.score, 0) / allNoteResults.length,
    metadata: allNoteResults.reduce((sum, r) => sum + r.nvqScore.breakdown.metadata.score, 0) / allNoteResults.length,
    taxonomy: allNoteResults.reduce((sum, r) => sum + r.nvqScore.breakdown.taxonomy.score, 0) / allNoteResults.length,
    connectivity: allNoteResults.reduce((sum, r) => sum + r.nvqScore.breakdown.connectivity.score, 0) / allNoteResults.length,
    originality: allNoteResults.reduce((sum, r) => sum + r.nvqScore.breakdown.originality.score, 0) / allNoteResults.length,
  }

  // Component failure rates
  const componentFailureRates = {
    why: allNoteResults.filter(r => r.nvqScore.breakdown.why.score < 1).length / allNoteResults.length,
    metadata: allNoteResults.filter(r => r.nvqScore.breakdown.metadata.score < 1).length / allNoteResults.length,
    taxonomy: allNoteResults.filter(r => r.nvqScore.breakdown.taxonomy.score < 1).length / allNoteResults.length,
    connectivity: allNoteResults.filter(r => r.nvqScore.breakdown.connectivity.score < 1).length / allNoteResults.length,
    originality: allNoteResults.filter(r => r.nvqScore.breakdown.originality.score < 1).length / allNoteResults.length,
  }

  // Top issues
  const issueCounter = new Map<string, { component: string; issue: string; count: number }>()

  for (const noteResult of allNoteResults) {
    for (const component of noteResult.nvqScore.failingComponents) {
      const key = component
      if (issueCounter.has(key)) {
        issueCounter.get(key)!.count++
      } else {
        issueCounter.set(key, { component, issue: `${component} score too low`, count: 1 })
      }
    }
  }

  const topIssues = Array.from(issueCounter.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Build quality recommendations
  const qualityRecommendations = generateQualityRecommendations({
    meanNVQ: mean,
    medianNVQ: median,
    minNVQ: Math.min(...allScores),
    maxNVQ: Math.max(...allScores),
    passingRate,
    whyFailureRate: componentFailureRates.why,
    metadataFailureRate: componentFailureRates.metadata,
    taxonomyFailureRate: componentFailureRates.taxonomy,
    connectivityFailureRate: componentFailureRates.connectivity,
    originalityFailureRate: componentFailureRates.originality,
    topFailures: topIssues,
  })

  // Convert quality results to record
  const qualityByScenario: Record<string, QualityEvaluationResults> = {}
  for (const [name, results] of qualityResults) {
    qualityByScenario[name] = results
  }

  return {
    ...baseReport,
    qualitySummary: {
      meanNVQ: mean,
      medianNVQ: median,
      passingRate,
      componentFailureRates,
      topIssues,
      qualityRecommendations,
    },
    qualityByScenario,
  }
}

/**
 * Print CI summary with quality metrics
 */
export function printCISummaryWithQuality(report: TestReportWithQuality): void {
  // Print base CI summary
  printCISummary(report)

  // Add quality metrics if available
  if (report.qualitySummary) {
    console.log(`NVQ_MEAN=${report.qualitySummary.meanNVQ.toFixed(1)}`)
    console.log(`NVQ_MEDIAN=${report.qualitySummary.medianNVQ.toFixed(1)}`)
    console.log(`NVQ_PASSING_RATE=${(report.qualitySummary.passingRate * 100).toFixed(1)}`)
    console.log(`NVQ_STATUS=${report.qualitySummary.passingRate >= 0.7 ? 'PASS' : 'FAIL'}`)
  }
}
