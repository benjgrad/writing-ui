/**
 * Metrics calculation for extraction accuracy testing
 *
 * Compares extracted notes against expected results to compute
 * precision, recall, F1 scores, and other accuracy metrics.
 */

import type {
  ExtractionMetrics,
  DuplicateDetectionMetrics,
  ConsolidationMetrics,
  TagReuseMetrics,
  ConnectionMetrics,
  ExtractedNoteResult,
  ExpectedNote,
  ExpectedConsolidation,
  ExistingNote,
  TestScenario,
} from './types'

import {
  findMatchingExpectedNote,
  checkConsolidation,
  evaluateConnections,
  tagsMatch,
  shouldReuseTag,
} from '../fixtures/ground-truth'

/**
 * Calculate duplicate detection metrics
 */
export function calculateDuplicateMetrics(
  extractedNotes: ExtractedNoteResult[],
  expectedConsolidations: ExpectedConsolidation[],
  existingNotes: ExistingNote[]
): DuplicateDetectionMetrics {
  let truePositives = 0
  let falsePositives = 0
  let falseNegatives = 0
  let trueNegatives = 0

  // Track which expected consolidations were matched
  const matchedConsolidations = new Set<number>()

  for (const extracted of extractedNotes) {
    const consolidationResult = checkConsolidation(
      extracted,
      existingNotes,
      expectedConsolidations
    )

    if (consolidationResult.shouldHaveConsolidated) {
      if (consolidationResult.didConsolidate && consolidationResult.consolidatedCorrectly) {
        truePositives++
        // Find and mark the matched consolidation
        const idx = expectedConsolidations.findIndex(
          ec => ec.existingNoteTitle.toLowerCase() === consolidationResult.expectedTarget?.toLowerCase()
        )
        if (idx >= 0) matchedConsolidations.add(idx)
      } else if (consolidationResult.didConsolidate && !consolidationResult.consolidatedCorrectly) {
        falsePositives++ // Consolidated with wrong note
        falseNegatives++ // Missed the correct consolidation
      } else {
        falseNegatives++ // Should have consolidated but didn't
      }
    } else {
      if (consolidationResult.didConsolidate) {
        falsePositives++ // Consolidated when it shouldn't have
      } else {
        trueNegatives++ // Correctly didn't consolidate
      }
    }
  }

  // Count any expected consolidations that weren't matched at all
  const unmatchedExpected = expectedConsolidations.length - matchedConsolidations.size
  falseNegatives += unmatchedExpected

  const precision = truePositives + falsePositives > 0
    ? truePositives / (truePositives + falsePositives)
    : 1

  const recall = truePositives + falseNegatives > 0
    ? truePositives / (truePositives + falseNegatives)
    : 1

  const f1Score = precision + recall > 0
    ? 2 * (precision * recall) / (precision + recall)
    : 0

  return {
    truePositives,
    falsePositives,
    falseNegatives,
    trueNegatives,
    precision,
    recall,
    f1Score,
  }
}

/**
 * Calculate consolidation metrics
 */
export function calculateConsolidationMetrics(
  extractedNotes: ExtractedNoteResult[],
  expectedConsolidations: ExpectedConsolidation[],
  existingNotes: ExistingNote[]
): ConsolidationMetrics {
  let correctConsolidations = 0
  let missedConsolidations = 0
  let wrongConsolidations = 0
  let correctNewNotes = 0

  const matchedExpected = new Set<number>()

  for (const extracted of extractedNotes) {
    const result = checkConsolidation(extracted, existingNotes, expectedConsolidations)

    if (result.shouldHaveConsolidated) {
      if (result.didConsolidate && result.consolidatedCorrectly) {
        correctConsolidations++
        const idx = expectedConsolidations.findIndex(
          ec => ec.existingNoteTitle.toLowerCase() === result.expectedTarget?.toLowerCase()
        )
        if (idx >= 0) matchedExpected.add(idx)
      } else if (result.didConsolidate) {
        wrongConsolidations++
      } else {
        missedConsolidations++
      }
    } else {
      if (result.didConsolidate) {
        wrongConsolidations++
      } else {
        correctNewNotes++
      }
    }
  }

  // Count expected consolidations never attempted
  missedConsolidations += expectedConsolidations.length - matchedExpected.size

  const total = correctConsolidations + missedConsolidations + wrongConsolidations + correctNewNotes
  const accuracy = total > 0
    ? (correctConsolidations + correctNewNotes) / total
    : 1

  return {
    correctConsolidations,
    missedConsolidations,
    wrongConsolidations,
    correctNewNotes,
    accuracy,
  }
}

/**
 * Calculate tag reuse metrics
 */
export function calculateTagReuseMetrics(
  extractedNotes: ExtractedNoteResult[],
  existingTags: string[]
): TagReuseMetrics {
  let reusedExisting = 0
  let correctlyCreatedNew = 0
  let shouldHaveReused = 0
  let totalTagsAssigned = 0

  for (const note of extractedNotes) {
    for (const tag of note.tags) {
      totalTagsAssigned++

      const reuseCheck = shouldReuseTag(tag, existingTags)

      if (reuseCheck.shouldReuse) {
        // Should reuse an existing tag
        if (existingTags.some(t => t.toLowerCase() === tag.toLowerCase())) {
          reusedExisting++ // Correctly reused
        } else {
          shouldHaveReused++ // Created new but should have reused
        }
      } else {
        // Truly new concept, okay to create
        correctlyCreatedNew++
      }
    }
  }

  const reuseRate = reusedExisting + shouldHaveReused > 0
    ? reusedExisting / (reusedExisting + shouldHaveReused)
    : 1

  return {
    reusedExisting,
    correctlyCreatedNew,
    shouldHaveReused,
    reuseRate,
    totalTagsAssigned,
  }
}

/**
 * Calculate connection metrics
 */
export function calculateConnectionMetrics(
  extractedNotes: ExtractedNoteResult[],
  expectedNotes: ExpectedNote[]
): ConnectionMetrics {
  let correctConnections = 0
  let missedConnections = 0
  let spuriousConnections = 0

  for (const extracted of extractedNotes) {
    // Find matching expected note
    const { match: expected, confidence } = findMatchingExpectedNote(extracted, expectedNotes)

    if (expected && confidence > 0.5) {
      // Evaluate connections for this note
      const allNoteTitles = extractedNotes.map(n => ({ title: n.title }))
      const connResult = evaluateConnections(extracted, expected, allNoteTitles)

      correctConnections += connResult.correct
      missedConnections += connResult.missed
      spuriousConnections += connResult.spurious
    } else {
      // No matching expected note - all connections are spurious
      spuriousConnections += extracted.connections.length
    }
  }

  const precision = correctConnections + spuriousConnections > 0
    ? correctConnections / (correctConnections + spuriousConnections)
    : 1

  const recall = correctConnections + missedConnections > 0
    ? correctConnections / (correctConnections + missedConnections)
    : 1

  return {
    correctConnections,
    missedConnections,
    spuriousConnections,
    precision,
    recall,
  }
}

/**
 * Calculate all metrics for a test scenario
 */
export function calculateAllMetrics(
  extractedNotes: ExtractedNoteResult[],
  scenario: TestScenario,
  timing: { totalMs: number; contextRetrievalMs: number; extractionMs: number }
): ExtractionMetrics {
  const duplicateDetection = calculateDuplicateMetrics(
    extractedNotes,
    scenario.expectedConsolidations,
    scenario.existingNotes
  )

  const consolidation = calculateConsolidationMetrics(
    extractedNotes,
    scenario.expectedConsolidations,
    scenario.existingNotes
  )

  const tagReuse = calculateTagReuseMetrics(
    extractedNotes,
    scenario.existingTags
  )

  const connections = calculateConnectionMetrics(
    extractedNotes,
    scenario.expectedNotes
  )

  return {
    duplicateDetection,
    consolidation,
    tagReuse,
    connections,
    timing,
  }
}

/**
 * Calculate aggregate metrics across multiple scenario results
 */
export function aggregateMetrics(
  results: ExtractionMetrics[]
): ExtractionMetrics {
  if (results.length === 0) {
    return {
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
    }
  }

  // Sum all counts
  const totals = {
    dd: { tp: 0, fp: 0, fn: 0, tn: 0 },
    cons: { correct: 0, missed: 0, wrong: 0, new: 0 },
    tags: { reused: 0, newCorrect: 0, shouldReuse: 0, total: 0 },
    conn: { correct: 0, missed: 0, spurious: 0 },
    time: { total: 0, context: 0, extraction: 0 },
  }

  for (const r of results) {
    totals.dd.tp += r.duplicateDetection.truePositives
    totals.dd.fp += r.duplicateDetection.falsePositives
    totals.dd.fn += r.duplicateDetection.falseNegatives
    totals.dd.tn += r.duplicateDetection.trueNegatives

    totals.cons.correct += r.consolidation.correctConsolidations
    totals.cons.missed += r.consolidation.missedConsolidations
    totals.cons.wrong += r.consolidation.wrongConsolidations
    totals.cons.new += r.consolidation.correctNewNotes

    totals.tags.reused += r.tagReuse.reusedExisting
    totals.tags.newCorrect += r.tagReuse.correctlyCreatedNew
    totals.tags.shouldReuse += r.tagReuse.shouldHaveReused
    totals.tags.total += r.tagReuse.totalTagsAssigned

    totals.conn.correct += r.connections.correctConnections
    totals.conn.missed += r.connections.missedConnections
    totals.conn.spurious += r.connections.spuriousConnections

    totals.time.total += r.timing.totalMs
    totals.time.context += r.timing.contextRetrievalMs
    totals.time.extraction += r.timing.extractionMs
  }

  // Recalculate derived metrics
  const ddPrecision = totals.dd.tp + totals.dd.fp > 0
    ? totals.dd.tp / (totals.dd.tp + totals.dd.fp)
    : 1
  const ddRecall = totals.dd.tp + totals.dd.fn > 0
    ? totals.dd.tp / (totals.dd.tp + totals.dd.fn)
    : 1
  const ddF1 = ddPrecision + ddRecall > 0
    ? 2 * (ddPrecision * ddRecall) / (ddPrecision + ddRecall)
    : 0

  const consTotal = totals.cons.correct + totals.cons.missed + totals.cons.wrong + totals.cons.new
  const consAccuracy = consTotal > 0
    ? (totals.cons.correct + totals.cons.new) / consTotal
    : 1

  const tagReuseRate = totals.tags.reused + totals.tags.shouldReuse > 0
    ? totals.tags.reused / (totals.tags.reused + totals.tags.shouldReuse)
    : 1

  const connPrecision = totals.conn.correct + totals.conn.spurious > 0
    ? totals.conn.correct / (totals.conn.correct + totals.conn.spurious)
    : 1
  const connRecall = totals.conn.correct + totals.conn.missed > 0
    ? totals.conn.correct / (totals.conn.correct + totals.conn.missed)
    : 1

  return {
    duplicateDetection: {
      truePositives: totals.dd.tp,
      falsePositives: totals.dd.fp,
      falseNegatives: totals.dd.fn,
      trueNegatives: totals.dd.tn,
      precision: ddPrecision,
      recall: ddRecall,
      f1Score: ddF1,
    },
    consolidation: {
      correctConsolidations: totals.cons.correct,
      missedConsolidations: totals.cons.missed,
      wrongConsolidations: totals.cons.wrong,
      correctNewNotes: totals.cons.new,
      accuracy: consAccuracy,
    },
    tagReuse: {
      reusedExisting: totals.tags.reused,
      correctlyCreatedNew: totals.tags.newCorrect,
      shouldHaveReused: totals.tags.shouldReuse,
      reuseRate: tagReuseRate,
      totalTagsAssigned: totals.tags.total,
    },
    connections: {
      correctConnections: totals.conn.correct,
      missedConnections: totals.conn.missed,
      spuriousConnections: totals.conn.spurious,
      precision: connPrecision,
      recall: connRecall,
    },
    timing: {
      totalMs: totals.time.total / results.length,
      contextRetrievalMs: totals.time.context / results.length,
      extractionMs: totals.time.extraction / results.length,
    },
  }
}
