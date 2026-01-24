/**
 * Ground truth utilities for evaluating extraction results
 *
 * Provides functions to compare extracted notes against expected results
 * and determine correctness of consolidations, tags, and connections.
 */

import type {
  ExpectedNote,
  ExpectedConsolidation,
  ExtractedNoteResult,
  ExistingNote,
} from '../metrics/types'

/**
 * Check if a title matches any of the expected patterns
 */
export function titleMatchesPatterns(
  title: string,
  patterns: string[]
): boolean {
  const titleLower = title.toLowerCase()
  return patterns.some(pattern => {
    const patternLower = pattern.toLowerCase()
    // Support simple regex-like patterns with |
    if (patternLower.includes('|')) {
      const alternatives = patternLower.split('|')
      return alternatives.some(alt => titleLower.includes(alt.trim()))
    }
    return titleLower.includes(patternLower)
  })
}

/**
 * Check if content contains all required phrases
 */
export function contentContainsPhrases(
  content: string,
  phrases: string[]
): boolean {
  const contentLower = content.toLowerCase()
  return phrases.every(phrase => contentLower.includes(phrase.toLowerCase()))
}

/**
 * Calculate similarity between two sets (Jaccard index)
 */
export function setJaccardSimilarity(
  set1: Set<string>,
  set2: Set<string>
): number {
  if (set1.size === 0 && set2.size === 0) return 1
  const intersection = new Set([...set1].filter(x => set2.has(x)))
  const union = new Set([...set1, ...set2])
  return intersection.size / union.size
}

/**
 * Check if tags match expected (allowing for normalization)
 */
export function tagsMatch(
  actualTags: string[],
  expectedTags: string[]
): { matches: string[]; missing: string[]; extra: string[] } {
  const normalizedActual = new Set(actualTags.map(t => t.toLowerCase()))
  const normalizedExpected = new Set(expectedTags.map(t => t.toLowerCase()))

  const matches = [...normalizedExpected].filter(t => normalizedActual.has(t))
  const missing = [...normalizedExpected].filter(t => !normalizedActual.has(t))
  const extra = [...normalizedActual].filter(t => !normalizedExpected.has(t))

  return { matches, missing, extra }
}

/**
 * Find the best matching expected note for an extracted note
 */
export function findMatchingExpectedNote(
  extracted: ExtractedNoteResult,
  expectedNotes: ExpectedNote[]
): { match: ExpectedNote | null; confidence: number } {
  let bestMatch: ExpectedNote | null = null
  let bestConfidence = 0

  for (const expected of expectedNotes) {
    let score = 0

    // Check title match
    if (titleMatchesPatterns(extracted.title, expected.titlePatterns)) {
      score += 0.4
    }

    // Check content phrases
    const phrasesFound = expected.requiredPhrases.filter(phrase =>
      extracted.content.toLowerCase().includes(phrase.toLowerCase())
    ).length
    score += 0.4 * (phrasesFound / Math.max(expected.requiredPhrases.length, 1))

    // Check tag overlap
    const tagOverlap = tagsMatch(extracted.tags, expected.expectedTags)
    score += 0.2 * (tagOverlap.matches.length / Math.max(expected.expectedTags.length, 1))

    if (score > bestConfidence) {
      bestConfidence = score
      bestMatch = expected
    }
  }

  return { match: bestConfidence > 0.5 ? bestMatch : null, confidence: bestConfidence }
}

/**
 * Check if an extracted note correctly consolidated with an existing note
 */
export function checkConsolidation(
  extracted: ExtractedNoteResult,
  existingNotes: ExistingNote[],
  expectedConsolidations: ExpectedConsolidation[]
): {
  shouldHaveConsolidated: boolean
  didConsolidate: boolean
  consolidatedCorrectly: boolean
  expectedTarget: string | null
  actualTarget: string | null
} {
  // Find if this extracted note's content matches any expected consolidation
  let matchingExpectation: ExpectedConsolidation | null = null
  for (const ec of expectedConsolidations) {
    const regex = new RegExp(ec.newContentPattern, 'i')
    if (regex.test(extracted.content)) {
      matchingExpectation = ec
      break
    }
  }

  const shouldHaveConsolidated = matchingExpectation !== null
  const didConsolidate = extracted.consolidatedWith !== null
  const actualTarget = extracted.consolidatedWith
  const expectedTarget = matchingExpectation?.existingNoteTitle ?? null

  // Check if consolidation was correct
  let consolidatedCorrectly = false
  if (shouldHaveConsolidated && didConsolidate && expectedTarget) {
    // Check if consolidated with the right note
    consolidatedCorrectly =
      actualTarget?.toLowerCase() === expectedTarget.toLowerCase()
  } else if (!shouldHaveConsolidated && !didConsolidate) {
    // Correctly did NOT consolidate
    consolidatedCorrectly = true
  }

  return {
    shouldHaveConsolidated,
    didConsolidate,
    consolidatedCorrectly,
    expectedTarget,
    actualTarget,
  }
}

/**
 * Evaluate connection correctness
 */
export function evaluateConnections(
  extracted: ExtractedNoteResult,
  expected: ExpectedNote,
  allNotes: Array<{ title: string }>
): {
  correct: number
  missed: number
  spurious: number
} {
  const expectedConnections = expected.expectedConnections
  const actualConnections = extracted.connections

  let correct = 0
  let missed = 0
  const matchedExpected = new Set<number>()

  // Check each expected connection
  for (let i = 0; i < expectedConnections.length; i++) {
    const exp = expectedConnections[i]
    const pattern = exp.targetTitlePattern.toLowerCase()

    // Find matching actual connection
    const match = actualConnections.find(actual => {
      const targetLower = actual.targetTitle.toLowerCase()
      // Check if title matches pattern
      if (pattern.includes('|')) {
        const alternatives = pattern.split('|')
        return alternatives.some(alt => targetLower.includes(alt.trim()))
      }
      return targetLower.includes(pattern)
    })

    if (match && exp.types.includes(match.type)) {
      correct++
      matchedExpected.add(i)
    } else {
      missed++
    }
  }

  // Count spurious (connections that weren't expected)
  const spurious = actualConnections.length - correct

  return { correct, missed, spurious }
}

/**
 * Check if a tag should have been reused from existing tags
 */
export function shouldReuseTag(
  newTag: string,
  existingTags: string[]
): { shouldReuse: boolean; existingTag: string | null } {
  const newTagLower = newTag.toLowerCase()

  // Direct match
  const directMatch = existingTags.find(t => t.toLowerCase() === newTagLower)
  if (directMatch) {
    return { shouldReuse: true, existingTag: directMatch }
  }

  // Common synonyms and variations
  const synonymGroups: Record<string, string[]> = {
    'machine-learning': ['ml', 'machine learning', 'machinelearning'],
    'artificial-intelligence': ['ai', 'artificial intelligence', 'artificialintelligence'],
    'productivity': ['productive', 'being-productive', 'efficiency'],
    'note-taking': ['notes', 'note-management', 'notetaking'],
    'software-development': ['programming', 'coding', 'development'],
    'health': ['wellness', 'wellbeing', 'well-being'],
    'fitness': ['exercise', 'workout', 'workouts', 'physical-fitness'],
    'habits': ['habit', 'routines', 'daily-habits'],
    'learning': ['education', 'study', 'studying'],
  }

  for (const existingTag of existingTags) {
    const existingLower = existingTag.toLowerCase()

    // Check if existing tag has synonyms that match the new tag
    const synonyms = synonymGroups[existingLower]
    if (synonyms && synonyms.some(syn => syn === newTagLower)) {
      return { shouldReuse: true, existingTag: existingTag }
    }

    // Check if new tag is in any synonym group that matches existing
    for (const [canonical, syns] of Object.entries(synonymGroups)) {
      if (
        syns.includes(newTagLower) &&
        (existingLower === canonical || syns.includes(existingLower))
      ) {
        return { shouldReuse: true, existingTag: existingTag }
      }
    }

    // Check for simple variations (hyphen vs space vs none)
    const normalizedNew = newTagLower.replace(/[-\s]/g, '')
    const normalizedExisting = existingLower.replace(/[-\s]/g, '')
    if (normalizedNew === normalizedExisting) {
      return { shouldReuse: true, existingTag: existingTag }
    }
  }

  return { shouldReuse: false, existingTag: null }
}
