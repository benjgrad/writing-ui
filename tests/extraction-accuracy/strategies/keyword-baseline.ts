/**
 * Keyword-based matching strategy (current baseline)
 *
 * This implements the current production approach from the edge function:
 * - Extract keywords from content (stop-word filtering, frequency ranking)
 * - Score notes by keyword presence (title +2, content +1)
 * - Return top matches sorted by score
 */

import type {
  MatchingStrategy,
  MatchingOptions,
} from './interface'
import type {
  RankedNote,
  DuplicateMatch,
  ContentRecord,
  ExistingNote,
} from '../metrics/types'
import { CONFIG, STOP_WORDS } from '../config'
import { registerStrategy } from './interface'

/**
 * Extract keywords from text for matching
 */
export function extractKeywords(text: string, limit: number = CONFIG.keyword.maxKeywords): string[] {
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length >= CONFIG.keyword.minKeywordLength && !STOP_WORDS.has(w))

  // Count frequency
  const freq = new Map<string, number>()
  words.forEach(w => freq.set(w, (freq.get(w) || 0) + 1))

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word)
}

/**
 * Score a note against a set of keywords
 */
export function scoreNoteByKeywords(
  note: { title: string; content: string },
  keywords: string[]
): number {
  const titleLower = note.title.toLowerCase()
  const contentLower = note.content.toLowerCase()
  let score = 0

  for (const kw of keywords) {
    if (titleLower.includes(kw)) {
      score += CONFIG.keyword.titleMatchWeight
    }
    if (contentLower.includes(kw)) {
      score += CONFIG.keyword.contentMatchWeight
    }
  }

  return score
}

/**
 * Calculate simple text similarity using keyword overlap
 */
export function calculateKeywordSimilarity(text1: string, text2: string): number {
  const kw1 = new Set(extractKeywords(text1, 20))
  const kw2 = new Set(extractKeywords(text2, 20))

  if (kw1.size === 0 || kw2.size === 0) return 0

  const intersection = [...kw1].filter(k => kw2.has(k))
  const union = new Set([...kw1, ...kw2])

  return intersection.length / union.size
}

/**
 * Calculate exact text overlap percentage
 */
export function calculateExactOverlap(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/)
  const words2 = text2.toLowerCase().split(/\s+/)

  // Use n-grams for better phrase matching
  const ngrams1 = new Set<string>()
  const ngrams2 = new Set<string>()

  // Create 3-grams
  for (let i = 0; i < words1.length - 2; i++) {
    ngrams1.add(words1.slice(i, i + 3).join(' '))
  }
  for (let i = 0; i < words2.length - 2; i++) {
    ngrams2.add(words2.slice(i, i + 3).join(' '))
  }

  if (ngrams1.size === 0 || ngrams2.size === 0) return 0

  const intersection = [...ngrams1].filter(ng => ngrams2.has(ng))
  return intersection.length / Math.min(ngrams1.size, ngrams2.size)
}

/**
 * Keyword baseline matching strategy
 */
class KeywordBaselineStrategy implements MatchingStrategy {
  readonly name = 'keyword-baseline'
  readonly description = 'Current production keyword matching (from edge function)'

  async findRelatedNotes(
    content: string,
    existingNotes: ExistingNote[],
    options: MatchingOptions = {}
  ): Promise<RankedNote[]> {
    const limit = options.limit ?? 15
    const minScore = options.minScore ?? 0

    const keywords = extractKeywords(content)

    if (keywords.length === 0) {
      return []
    }

    // Score all notes
    const scoredNotes = existingNotes.map(note => ({
      ...note,
      score: scoreNoteByKeywords(note, keywords),
      keywordScore: scoreNoteByKeywords(note, keywords),
    }))

    // Filter and sort
    return scoredNotes
      .filter(n => n.score > minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  async detectDuplicates(
    content: string,
    existingContents: ContentRecord[],
    options: MatchingOptions = {}
  ): Promise<DuplicateMatch[]> {
    const minScore = options.minScore ?? CONFIG.thresholds.duplicateThreshold

    const duplicates: DuplicateMatch[] = []

    for (const existing of existingContents) {
      // Check for exact overlap
      const exactOverlap = calculateExactOverlap(content, existing.content)
      if (exactOverlap >= 0.8) {
        duplicates.push({
          noteId: existing.id,
          noteTitle: existing.title,
          similarityScore: exactOverlap,
          matchType: 'exact',
        })
        continue
      }

      // Check keyword similarity
      const keywordSim = calculateKeywordSimilarity(content, existing.content)
      if (keywordSim >= minScore) {
        duplicates.push({
          noteId: existing.id,
          noteTitle: existing.title,
          similarityScore: keywordSim,
          matchType: keywordSim >= 0.8 ? 'exact' : 'partial',
        })
      }
    }

    return duplicates.sort((a, b) => b.similarityScore - a.similarityScore)
  }

  async findSimilarTags(
    tagName: string,
    existingTags: string[]
  ): Promise<Array<{ tag: string; score: number }>> {
    const tagLower = tagName.toLowerCase()
    const results: Array<{ tag: string; score: number }> = []

    for (const existing of existingTags) {
      const existingLower = existing.toLowerCase()

      // Exact match
      if (tagLower === existingLower) {
        results.push({ tag: existing, score: 1.0 })
        continue
      }

      // Normalized match (remove hyphens/spaces)
      const normalizedNew = tagLower.replace(/[-\s]/g, '')
      const normalizedExisting = existingLower.replace(/[-\s]/g, '')
      if (normalizedNew === normalizedExisting) {
        results.push({ tag: existing, score: 0.95 })
        continue
      }

      // Contains check
      if (existingLower.includes(tagLower) || tagLower.includes(existingLower)) {
        results.push({ tag: existing, score: 0.7 })
        continue
      }

      // Character-level similarity (Levenshtein-like)
      const charSim = calculateCharacterSimilarity(tagLower, existingLower)
      if (charSim > 0.6) {
        results.push({ tag: existing, score: charSim })
      }
    }

    return results.sort((a, b) => b.score - a.score)
  }
}

/**
 * Simple character-level similarity (normalized edit distance)
 */
function calculateCharacterSimilarity(str1: string, str2: string): number {
  const len1 = str1.length
  const len2 = str2.length

  if (len1 === 0 || len2 === 0) return 0

  // Count matching characters
  let matches = 0
  const chars1 = new Map<string, number>()
  const chars2 = new Map<string, number>()

  for (const c of str1) chars1.set(c, (chars1.get(c) || 0) + 1)
  for (const c of str2) chars2.set(c, (chars2.get(c) || 0) + 1)

  for (const [char, count] of chars1) {
    matches += Math.min(count, chars2.get(char) || 0)
  }

  return (2 * matches) / (len1 + len2)
}

// Create and register the strategy
export function createKeywordBaselineStrategy(): MatchingStrategy {
  return new KeywordBaselineStrategy()
}

registerStrategy('keyword-baseline', createKeywordBaselineStrategy)

export default KeywordBaselineStrategy
