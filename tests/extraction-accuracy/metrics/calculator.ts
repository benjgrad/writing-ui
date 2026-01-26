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
  NoteQualityMetrics,
  QualityEvaluationOptions,
  CombinedMetrics,
  DEFAULT_QUALITY_THRESHOLDS,
} from './types'

import type {
  NVQScore,
  QualityExtractedNote,
  QualityExpectation,
  NVQEvaluationResult,
  QualityEvaluationResults,
} from '../quality/types'

import { NVQEvaluator } from '../quality/evaluator'

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

// =============================================================================
// Note Quality (NVQ) Calculation
// =============================================================================

/**
 * Convert ExtractedNoteResult to QualityExtractedNote format
 */
function toQualityNote(note: ExtractedNoteResult): QualityExtractedNote {
  return {
    title: note.title,
    content: note.content,
    tags: note.tags,
    consolidatedWith: note.consolidatedWith,
    mergedContent: note.mergedContent,
    connections: note.connections,
    // Quality fields - extracted from content if present
    purposeStatement: extractPurposeStatement(note.content),
    project: extractProjectLink(note.content),
    status: extractStatus(note.content),
    noteType: extractNoteType(note.content),
    stakeholder: extractStakeholder(note.content),
  }
}

/**
 * Extract purpose statement from content ("I am keeping this because...")
 */
function extractPurposeStatement(content: string): string | null {
  const patterns = [
    /I am keeping this because[^.]*\./i,
    /I'm keeping this because[^.]*\./i,
    /Purpose:\s*([^\n]+)/i,
    /Why:\s*([^\n]+)/i,
  ]

  for (const pattern of patterns) {
    const match = content.match(pattern)
    if (match) {
      return match[0].trim()
    }
  }

  return null
}

/**
 * Extract project link from content
 */
function extractProjectLink(content: string): string | null {
  const patterns = [
    /\[\[Project\/([^\]]+)\]\]/i,
    /Project:\s*\[\[([^\]]+)\]\]/i,
    /Project:\s*([^\n]+)/i,
  ]

  for (const pattern of patterns) {
    const match = content.match(pattern)
    if (match) {
      return match[1].trim()
    }
  }

  return null
}

/**
 * Extract status from content
 */
function extractStatus(content: string): 'Seed' | 'Sapling' | 'Evergreen' | null {
  const statusMatch = content.match(/Status:\s*(Seed|Sapling|Evergreen)/i)
  if (statusMatch) {
    return statusMatch[1] as 'Seed' | 'Sapling' | 'Evergreen'
  }
  return null
}

/**
 * Extract note type from content
 */
function extractNoteType(content: string): 'Logic' | 'Technical' | 'Reflection' | null {
  const typeMatch = content.match(/Type:\s*(Logic|Technical|Reflection)/i)
  if (typeMatch) {
    return typeMatch[1] as 'Logic' | 'Technical' | 'Reflection'
  }
  return null
}

/**
 * Extract stakeholder from content
 */
function extractStakeholder(content: string): 'Self' | 'Future Users' | 'AI Agent' | null {
  const stakeholderMatch = content.match(/Stakeholder:\s*(Self|Future Users|AI Agent)/i)
  if (stakeholderMatch) {
    return stakeholderMatch[1] as 'Self' | 'Future Users' | 'AI Agent'
  }
  return null
}

/**
 * Calculate NVQ scores for extracted notes
 */
export function calculateNVQScores(
  extractedNotes: ExtractedNoteResult[],
  options: {
    availableProjects?: string[]
    availableMOCs?: string[]
    minimumNVQ?: number
  } = {}
): NVQScore[] {
  const { minimumNVQ = 7 } = options

  const evaluator = new NVQEvaluator({
    projects: options.availableProjects || [],
    mocs: options.availableMOCs || [],
    goals: [],
    passingThreshold: minimumNVQ,
  })

  return extractedNotes.map((note) => {
    const qualityNote = toQualityNote(note)
    return evaluator.evaluateNote(qualityNote)
  })
}

/**
 * Calculate aggregate NVQ metrics
 */
export function calculateNVQMetrics(
  scores: NVQScore[],
  minimumNVQ: number = 7
): NoteQualityMetrics {
  if (scores.length === 0) {
    return {
      meanNVQ: 0,
      medianNVQ: 0,
      minNVQ: 0,
      maxNVQ: 0,
      passingRate: 0,
      whyFailureRate: 0,
      metadataFailureRate: 0,
      taxonomyFailureRate: 0,
      connectivityFailureRate: 0,
      originalityFailureRate: 0,
      whyScoreDistribution: {},
      metadataScoreDistribution: {},
      taxonomyScoreDistribution: {},
      connectivityScoreDistribution: {},
      originalityScoreDistribution: {},
      totalNotesEvaluated: 0,
      notesWithPurpose: 0,
      notesWithCompleteMetadata: 0,
      notesWithFunctionalTags: 0,
      notesWithTwoLinks: 0,
      notesThatAreSynthesis: 0,
      topFailures: [],
    }
  }

  const totals = scores.map((s) => s.total).sort((a, b) => a - b)
  const meanNVQ = totals.reduce((a, b) => a + b, 0) / totals.length
  const medianNVQ = totals[Math.floor(totals.length / 2)]
  const minNVQ = totals[0]
  const maxNVQ = totals[totals.length - 1]
  const passingRate = scores.filter((s) => s.passing).length / scores.length

  // Component failure rates
  const whyFailures = scores.filter((s) => s.breakdown.why.score === 0).length
  const metadataFailures = scores.filter((s) => s.breakdown.metadata.score === 0).length
  const taxonomyFailures = scores.filter((s) => s.breakdown.taxonomy.score === 0).length
  const connectivityFailures = scores.filter((s) => s.breakdown.connectivity.score === 0).length
  const originalityFailures = scores.filter((s) => s.breakdown.originality.score === 0).length

  // Score distributions
  const whyScoreDistribution: Record<number, number> = {}
  const metadataScoreDistribution: Record<number, number> = {}
  const taxonomyScoreDistribution: Record<number, number> = {}
  const connectivityScoreDistribution: Record<number, number> = {}
  const originalityScoreDistribution: Record<number, number> = {}

  for (const score of scores) {
    whyScoreDistribution[score.breakdown.why.score] =
      (whyScoreDistribution[score.breakdown.why.score] || 0) + 1
    metadataScoreDistribution[score.breakdown.metadata.score] =
      (metadataScoreDistribution[score.breakdown.metadata.score] || 0) + 1
    taxonomyScoreDistribution[score.breakdown.taxonomy.score] =
      (taxonomyScoreDistribution[score.breakdown.taxonomy.score] || 0) + 1
    connectivityScoreDistribution[score.breakdown.connectivity.score] =
      (connectivityScoreDistribution[score.breakdown.connectivity.score] || 0) + 1
    originalityScoreDistribution[score.breakdown.originality.score] =
      (originalityScoreDistribution[score.breakdown.originality.score] || 0) + 1
  }

  // Detailed diagnostics
  const notesWithPurpose = scores.filter((s) => s.breakdown.why.rawStatement !== null).length
  const notesWithCompleteMetadata = scores.filter((s) => s.breakdown.metadata.fieldsPresent >= 3).length
  const notesWithFunctionalTags = scores.filter(
    (s) => s.breakdown.taxonomy.functionalTags > s.breakdown.taxonomy.topicTags
  ).length
  const notesWithTwoLinks = scores.filter((s) => s.breakdown.connectivity.meetsMinimum).length
  const notesThatAreSynthesis = scores.filter((s) => s.breakdown.originality.hasOriginalInsight).length

  // Top failures
  const failureCounts: Record<string, Record<string, number>> = {}
  for (const score of scores) {
    for (const component of score.failingComponents) {
      if (!failureCounts[component]) {
        failureCounts[component] = {}
      }
      const issue = getFailureIssue(score, component)
      failureCounts[component][issue] = (failureCounts[component][issue] || 0) + 1
    }
  }

  const topFailures: Array<{ component: string; issue: string; count: number }> = []
  for (const [component, issues] of Object.entries(failureCounts)) {
    for (const [issue, count] of Object.entries(issues)) {
      topFailures.push({ component, issue, count })
    }
  }
  topFailures.sort((a, b) => b.count - a.count)

  return {
    meanNVQ,
    medianNVQ,
    minNVQ,
    maxNVQ,
    passingRate,
    whyFailureRate: whyFailures / scores.length,
    metadataFailureRate: metadataFailures / scores.length,
    taxonomyFailureRate: taxonomyFailures / scores.length,
    connectivityFailureRate: connectivityFailures / scores.length,
    originalityFailureRate: originalityFailures / scores.length,
    whyScoreDistribution,
    metadataScoreDistribution,
    taxonomyScoreDistribution,
    connectivityScoreDistribution,
    originalityScoreDistribution,
    totalNotesEvaluated: scores.length,
    notesWithPurpose,
    notesWithCompleteMetadata,
    notesWithFunctionalTags,
    notesWithTwoLinks,
    notesThatAreSynthesis,
    topFailures: topFailures.slice(0, 10),
  }
}

/**
 * Get failure issue description for a component
 */
function getFailureIssue(score: NVQScore, component: string): string {
  switch (component) {
    case 'why':
      if (!score.breakdown.why.hasFirstPerson) return 'Missing first-person statement'
      if (!score.breakdown.why.linksToPersonalGoal) return 'No link to personal goal'
      if (!score.breakdown.why.isActionable) return 'Not actionable'
      return 'Unknown why issue'
    case 'metadata':
      if (!score.breakdown.metadata.hasStatus) return 'Missing status field'
      if (!score.breakdown.metadata.hasType) return 'Missing type field'
      if (!score.breakdown.metadata.hasStakeholder) return 'Missing stakeholder field'
      return 'Incomplete metadata'
    case 'taxonomy':
      if (score.breakdown.taxonomy.topicTags > 0) return 'Contains topic tags instead of functional'
      if (score.breakdown.taxonomy.exceedsLimit) return 'Too many tags (>5)'
      return 'No functional tags'
    case 'connectivity':
      if (!score.breakdown.connectivity.hasUpwardLink) return 'Missing upward link'
      if (!score.breakdown.connectivity.hasSidewaysLink) return 'Missing sideways link'
      return 'Insufficient connections'
    case 'originality':
      if (score.breakdown.originality.isWikipediaFact) return 'Pure fact without synthesis'
      return 'Low synthesis ratio'
    default:
      return 'Unknown issue'
  }
}

/**
 * Evaluate quality for a set of extracted notes against expectations
 */
export function evaluateQuality(
  extractedNotes: ExtractedNoteResult[],
  expectations: QualityExpectation[],
  options: {
    scenarioName?: string
    availableProjects?: string[]
    availableMOCs?: string[]
    minimumNVQ?: number
  } = {}
): QualityEvaluationResults {
  const { scenarioName = 'unnamed', minimumNVQ = 7 } = options

  const evaluator = new NVQEvaluator({
    projects: options.availableProjects || [],
    mocs: options.availableMOCs || [],
    goals: [],
    passingThreshold: minimumNVQ,
  })

  const noteResults: NVQEvaluationResult[] = []

  for (const note of extractedNotes) {
    const qualityNote = toQualityNote(note)
    const nvqScore = evaluator.evaluateNote(qualityNote)

    // Try to match with an expectation
    const matchedExpectation = findMatchingExpectation(note, expectations)

    const issues: string[] = []
    if (!nvqScore.passing) {
      issues.push(`NVQ score ${nvqScore.total}/10 below threshold`)
    }
    for (const component of nvqScore.failingComponents) {
      issues.push(`${component}: ${getFailureIssue(nvqScore, component)}`)
    }

    noteResults.push({
      noteTitle: note.title,
      noteContent: note.content,
      nvqScore,
      matchedExpectation,
      issues,
    })
  }

  const allScores = noteResults.map((r) => r.nvqScore)
  const aggregateMetrics = calculateNVQMetrics(allScores, minimumNVQ)

  // Generate recommendations
  const recommendations: string[] = []
  if (aggregateMetrics.whyFailureRate > 0.3) {
    recommendations.push('Add purpose statements ("I am keeping this because...") to more notes')
  }
  if (aggregateMetrics.metadataFailureRate > 0.3) {
    recommendations.push('Include metadata fields (Status, Type, Stakeholder) in extraction')
  }
  if (aggregateMetrics.taxonomyFailureRate > 0.3) {
    recommendations.push('Use functional tags (#task/*, #skill/*) instead of topic tags')
  }
  if (aggregateMetrics.connectivityFailureRate > 0.3) {
    recommendations.push('Add upward links to projects/MOCs and sideways links to related notes')
  }
  if (aggregateMetrics.originalityFailureRate > 0.5) {
    recommendations.push('Encourage synthesis and personal interpretation over raw facts')
  }

  return {
    scenarioName,
    noteResults,
    aggregateMetrics,
    recommendations,
  }
}

/**
 * Find matching expectation for an extracted note
 */
function findMatchingExpectation(
  note: ExtractedNoteResult,
  expectations: QualityExpectation[]
): QualityExpectation | null {
  const titleLower = note.title.toLowerCase()
  const contentLower = note.content.toLowerCase()

  for (const exp of expectations) {
    // Check title patterns
    const titleMatch = (exp.titlePatterns || []).some(
      (pattern) => titleLower.includes(pattern.toLowerCase())
    )

    // Check content requirements (empty array means no content requirements)
    const contentRequirements = exp.contentMustContain || []
    const contentMatch = contentRequirements.length === 0 || contentRequirements.every(
      (phrase) => contentLower.includes(phrase.toLowerCase())
    )

    if (titleMatch && contentMatch) {
      return exp
    }
  }

  return null
}

/**
 * Calculate combined extraction + quality metrics
 */
export function calculateCombinedMetrics(
  extractedNotes: ExtractedNoteResult[],
  scenario: TestScenario,
  timing: { totalMs: number; contextRetrievalMs: number; extractionMs: number },
  qualityOptions?: {
    enabled: boolean
    availableProjects?: string[]
    availableMOCs?: string[]
    minimumNVQ?: number
  }
): CombinedMetrics {
  const extraction = calculateAllMetrics(extractedNotes, scenario, timing)

  if (!qualityOptions?.enabled) {
    return { extraction }
  }

  const nvqScores = calculateNVQScores(extractedNotes, {
    availableProjects: qualityOptions.availableProjects,
    availableMOCs: qualityOptions.availableMOCs,
    minimumNVQ: qualityOptions.minimumNVQ,
  })

  const nvqMetrics = calculateNVQMetrics(nvqScores, qualityOptions.minimumNVQ)

  return {
    extraction,
    quality: {
      meanNVQ: nvqMetrics.meanNVQ,
      passingRate: nvqMetrics.passingRate,
      componentScores: {
        why: 1 - nvqMetrics.whyFailureRate,
        metadata: 1 - nvqMetrics.metadataFailureRate,
        taxonomy: 1 - nvqMetrics.taxonomyFailureRate,
        connectivity: 1 - nvqMetrics.connectivityFailureRate,
        originality: 1 - nvqMetrics.originalityFailureRate,
      },
    },
  }
}
