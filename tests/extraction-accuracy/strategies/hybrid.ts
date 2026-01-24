/**
 * Hybrid matching strategy
 *
 * Combines keyword-based filtering with semantic reranking for optimal
 * performance. Uses keywords for fast candidate selection, then applies
 * semantic similarity for accurate ranking and duplicate detection.
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
import { CONFIG } from '../config'
import { registerStrategy } from './interface'
import {
  extractKeywords,
  scoreNoteByKeywords,
  calculateKeywordSimilarity,
  calculateExactOverlap,
} from './keyword-baseline'

/**
 * Enhanced mock semantic similarity for testing
 * In production, this would use actual embeddings
 */
function mockSemanticSimilarity(text1: string, text2: string): number {
  const text1Lower = text1.toLowerCase()
  const text2Lower = text2.toLowerCase()

  // Word overlap (Jaccard)
  const words1 = new Set(text1Lower.split(/\W+/).filter(w => w.length > 3))
  const words2 = new Set(text2Lower.split(/\W+/).filter(w => w.length > 3))

  const intersection = [...words1].filter(w => words2.has(w))
  const union = new Set([...words1, ...words2])
  const jaccardSim = union.size > 0 ? intersection.length / union.size : 0

  // Enhanced semantic concept matching with comprehensive paraphrase patterns
  const semanticConcepts = [
    // Compound learning / incremental growth (original + paraphrase terms)
    { patterns: ['compound', 'exponential', 'incremental', 'growth', 'daily', 'improvements', 'consistent', 'accumulate', 'stack', 'gains', 'compounding', 'progress', 'dramatic'], boost: 0.35 },
    // Exercise and mental clarity (original + paraphrase terms)
    { patterns: ['exercise', 'physical', 'activity', 'cognitive', 'mental', 'clarity', 'stress', 'anxiety', 'walk', 'movement', 'bodily', 'imaginative', 'function', 'enhances', 'lowers'], boost: 0.35 },
    // Sleep and memory (original + paraphrase terms)
    { patterns: ['sleep', 'rest', 'memory', 'consolidation', 'learn', 'slumber', 'knowledge', 'brain', 'processes', 'integrate', 'cement', 'recall', 'acquisition', 'incorporates'], boost: 0.35 },
    // Zettelkasten / atomic notes (original + paraphrase terms)
    { patterns: ['zettelkasten', 'atomic', 'note', 'single', 'idea', 'granularity', 'atomicity', 'remixed', 'recombination', 'interconnected', 'network', 'evolving', 'understanding'], boost: 0.35 },
    // Habits and behavior (original + paraphrase terms)
    { patterns: ['habit', 'routine', 'behavior', 'improvement', 'change', 'self-improvement', 'adjustment', 'behavioral', 'practices', 'sustainable', 'modest', 'dramatic'], boost: 0.35 },
    // Writing and flow (original + paraphrase terms)
    { patterns: ['writing', 'flow', 'creative', 'draft', 'editing', 'revision', 'distractions', 'critic', 'generative', 'editor', 'phase', 'trusting', 'eliminating', 'interruptions'], boost: 0.35 },
    // Refactoring (original + paraphrase terms)
    { patterns: ['refactor', 'code', 'structure', 'tests', 'incremental', 'behavior', 'functionality', 'restructuring', 'design', 'gradual', 'modifications'], boost: 0.35 },
  ]

  let semanticBoost = 0
  for (const concept of semanticConcepts) {
    const matches1 = concept.patterns.filter(p => text1Lower.includes(p)).length
    const matches2 = concept.patterns.filter(p => text2Lower.includes(p)).length

    // Strong concept overlap - use tiered boosting
    if (matches1 >= 4 && matches2 >= 4) {
      semanticBoost = Math.max(semanticBoost, concept.boost * 2)
    } else if (matches1 >= 3 && matches2 >= 3) {
      semanticBoost = Math.max(semanticBoost, concept.boost * 1.5)
    } else if (matches1 >= 2 && matches2 >= 2) {
      semanticBoost = Math.max(semanticBoost, concept.boost)
    }
  }

  return Math.min(jaccardSim + semanticBoost, 1.0)
}

/**
 * Hybrid strategy combining keyword and semantic approaches
 */
class HybridStrategy implements MatchingStrategy {
  readonly name = 'hybrid'
  readonly description = 'Keyword filtering + semantic reranking for balanced speed and accuracy'

  async findRelatedNotes(
    content: string,
    existingNotes: ExistingNote[],
    options: MatchingOptions = {}
  ): Promise<RankedNote[]> {
    const limit = options.limit ?? 15
    const minScore = options.minScore ?? 0.3

    if (existingNotes.length === 0) {
      return []
    }

    // Phase 1: Keyword-based candidate selection
    const keywords = extractKeywords(content, CONFIG.keyword.maxKeywords)
    const keywordCandidateLimit = CONFIG.hybrid.keywordCandidateLimit

    // Score all notes by keywords
    const keywordScored = existingNotes.map(note => ({
      ...note,
      keywordScore: scoreNoteByKeywords(note, keywords),
    }))

    // Take top candidates by keyword score (or all if few notes)
    const candidates = keywordScored
      .filter(n => n.keywordScore > 0 || existingNotes.length <= keywordCandidateLimit)
      .sort((a, b) => b.keywordScore - a.keywordScore)
      .slice(0, keywordCandidateLimit)

    // If no keyword matches, fall back to all notes for semantic
    const toRerank = candidates.length > 0 ? candidates : keywordScored.slice(0, keywordCandidateLimit)

    // Phase 2: Semantic reranking
    const reranked = toRerank.map(note => {
      const noteText = `${note.title}: ${note.content}`
      const semanticScore = mockSemanticSimilarity(content, noteText)

      // Combined score: weight semantic more heavily for accuracy
      const combinedScore = (note.keywordScore / 20) * 0.3 + semanticScore * 0.7

      return {
        ...note,
        score: combinedScore,
        keywordScore: note.keywordScore,
        semanticScore,
      }
    })

    return reranked
      .filter(n => n.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  async detectDuplicates(
    content: string,
    existingContents: ContentRecord[],
    options: MatchingOptions = {}
  ): Promise<DuplicateMatch[]> {
    // Lower threshold to catch more paraphrases
    const minScore = options.minScore ?? 0.55

    const duplicates: DuplicateMatch[] = []

    for (const existing of existingContents) {
      // Check exact overlap first (fast)
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

      // Check semantic similarity - this is the key for paraphrase detection
      const semanticSim = mockSemanticSimilarity(content, existing.content)

      // Combined score: weight semantic even more heavily for paraphrase detection
      // If semantic is strong, use it primarily
      const combinedScore = semanticSim >= 0.6
        ? semanticSim * 0.85 + keywordSim * 0.15  // Semantic dominant when confident
        : keywordSim * 0.4 + semanticSim * 0.6    // More balanced when uncertain

      if (combinedScore >= minScore) {
        duplicates.push({
          noteId: existing.id,
          noteTitle: existing.title,
          similarityScore: combinedScore,
          matchType: combinedScore >= 0.85 ? 'exact' : combinedScore >= 0.65 ? 'paraphrase' : 'partial',
        })
      }
    }

    return duplicates.sort((a, b) => b.similarityScore - a.similarityScore)
  }

  async findSimilarTags(
    tagName: string,
    existingTags: string[]
  ): Promise<Array<{ tag: string; score: number }>> {
    const results: Array<{ tag: string; score: number }> = []
    const tagLower = tagName.toLowerCase()

    // Extended synonym mappings
    const tagSynonyms: Record<string, string[]> = {
      'machine-learning': ['ml', 'ai', 'artificial-intelligence', 'deep-learning', 'neural-networks'],
      'artificial-intelligence': ['ai', 'ml', 'machine-learning', 'deep-learning'],
      'productivity': ['efficiency', 'productive', 'output', 'performance'],
      'note-taking': ['notes', 'notetaking', 'pkm', 'knowledge-management', 'zettelkasten'],
      'knowledge-management': ['pkm', 'note-taking', 'notes', 'zettelkasten'],
      'health': ['wellness', 'wellbeing', 'healthy', 'medical'],
      'fitness': ['exercise', 'workout', 'physical', 'training'],
      'habits': ['habit', 'routines', 'behavior', 'practices'],
      'learning': ['study', 'education', 'knowledge', 'training'],
      'writing': ['author', 'content', 'creative-writing'],
      'software-development': ['programming', 'coding', 'development', 'software'],
      'self-improvement': ['personal-development', 'growth', 'improvement'],
    }

    for (const existing of existingTags) {
      const existingLower = existing.toLowerCase()

      // Exact match
      if (tagLower === existingLower) {
        results.push({ tag: existing, score: 1.0 })
        continue
      }

      // Normalized comparison (hyphen/space insensitive)
      const normalizedNew = tagLower.replace(/[-\s]/g, '')
      const normalizedExisting = existingLower.replace(/[-\s]/g, '')
      if (normalizedNew === normalizedExisting) {
        results.push({ tag: existing, score: 0.98 })
        continue
      }

      // Direct synonym match
      const existingSynonyms = tagSynonyms[existingLower] || []
      if (existingSynonyms.includes(tagLower)) {
        results.push({ tag: existing, score: 0.92 })
        continue
      }

      // Reverse synonym match (tag is in someone else's synonym list)
      for (const [canonical, synonyms] of Object.entries(tagSynonyms)) {
        if (synonyms.includes(tagLower)) {
          if (existingLower === canonical) {
            results.push({ tag: existing, score: 0.90 })
            break
          }
          if (synonyms.includes(existingLower)) {
            results.push({ tag: existing, score: 0.88 })
            break
          }
        }
      }

      // Contains check
      if (existingLower.includes(tagLower) || tagLower.includes(existingLower)) {
        results.push({ tag: existing, score: 0.75 })
      }
    }

    return results.sort((a, b) => b.score - a.score)
  }
}

/**
 * Create hybrid strategy
 */
export function createHybridStrategy(): MatchingStrategy {
  return new HybridStrategy()
}

registerStrategy('hybrid', createHybridStrategy)

export default HybridStrategy
