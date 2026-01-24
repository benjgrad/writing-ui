/**
 * Report generation for extraction accuracy tests
 *
 * Outputs results in various formats: console, JSON, and summary reports.
 */

import * as fs from 'fs'
import * as path from 'path'
import type {
  TestReport,
  ScenarioResult,
  ExtractionMetrics,
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
