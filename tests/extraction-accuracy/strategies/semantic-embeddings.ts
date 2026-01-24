/**
 * Semantic embedding-based matching strategy
 *
 * Uses OpenAI embeddings to compute semantic similarity between texts.
 * This enables detection of paraphrased content that keyword matching misses.
 */

import OpenAI from 'openai'
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

/**
 * Cache for embeddings to avoid recomputing
 */
const embeddingCache = new Map<string, number[]>()

/**
 * OpenAI client (lazy initialized)
 */
let openaiClient: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required for semantic strategy')
    }
    openaiClient = new OpenAI({ apiKey })
  }
  return openaiClient
}

/**
 * Generate embedding for a text
 */
async function getEmbedding(text: string): Promise<number[]> {
  // Check cache first
  const cacheKey = text.slice(0, 500) // Use first 500 chars as cache key
  const cached = embeddingCache.get(cacheKey)
  if (cached) {
    return cached
  }

  const client = getOpenAIClient()

  const response = await client.embeddings.create({
    model: CONFIG.embeddingModel,
    input: text,
    dimensions: CONFIG.embeddingDimensions,
  })

  const embedding = response.data[0].embedding
  embeddingCache.set(cacheKey, embedding)

  return embedding
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  if (normA === 0 || normB === 0) return 0

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Semantic matching strategy using OpenAI embeddings
 */
class SemanticEmbeddingStrategy implements MatchingStrategy {
  readonly name = 'semantic'
  readonly description = 'OpenAI embeddings with cosine similarity for semantic matching'

  private initialized = false

  async initialize(): Promise<void> {
    // Verify API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.warn('Warning: OPENAI_API_KEY not set, semantic strategy will fail')
    }
    this.initialized = true
  }

  async cleanup(): Promise<void> {
    // Clear embedding cache
    embeddingCache.clear()
    this.initialized = false
  }

  async findRelatedNotes(
    content: string,
    existingNotes: ExistingNote[],
    options: MatchingOptions = {}
  ): Promise<RankedNote[]> {
    const limit = options.limit ?? 15
    const minScore = options.minScore ?? CONFIG.thresholds.relatedThreshold

    if (existingNotes.length === 0) {
      return []
    }

    try {
      // Get embedding for query content
      const queryEmbedding = await getEmbedding(content)

      // Score all notes by semantic similarity
      const scoredNotes = await Promise.all(
        existingNotes.map(async note => {
          // Combine title and content for embedding
          const noteText = `${note.title}: ${note.content}`
          const noteEmbedding = await getEmbedding(noteText)
          const similarity = cosineSimilarity(queryEmbedding, noteEmbedding)

          return {
            ...note,
            score: similarity,
            semanticScore: similarity,
          }
        })
      )

      return scoredNotes
        .filter(n => n.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
    } catch (error) {
      console.error('Semantic matching error:', error)
      return []
    }
  }

  async detectDuplicates(
    content: string,
    existingContents: ContentRecord[],
    options: MatchingOptions = {}
  ): Promise<DuplicateMatch[]> {
    const minScore = options.minScore ?? CONFIG.thresholds.duplicateThreshold

    if (existingContents.length === 0) {
      return []
    }

    try {
      const queryEmbedding = await getEmbedding(content)
      const duplicates: DuplicateMatch[] = []

      for (const existing of existingContents) {
        const existingEmbedding = await getEmbedding(existing.content)
        const similarity = cosineSimilarity(queryEmbedding, existingEmbedding)

        if (similarity >= minScore) {
          duplicates.push({
            noteId: existing.id,
            noteTitle: existing.title,
            similarityScore: similarity,
            matchType: similarity >= 0.95 ? 'exact' : similarity >= 0.8 ? 'paraphrase' : 'partial',
          })
        }
      }

      return duplicates.sort((a, b) => b.similarityScore - a.similarityScore)
    } catch (error) {
      console.error('Duplicate detection error:', error)
      return []
    }
  }

  async findSimilarTags(
    tagName: string,
    existingTags: string[]
  ): Promise<Array<{ tag: string; score: number }>> {
    if (existingTags.length === 0) {
      return []
    }

    try {
      const tagEmbedding = await getEmbedding(tagName)
      const results: Array<{ tag: string; score: number }> = []

      for (const existing of existingTags) {
        // Direct match
        if (tagName.toLowerCase() === existing.toLowerCase()) {
          results.push({ tag: existing, score: 1.0 })
          continue
        }

        const existingEmbedding = await getEmbedding(existing)
        const similarity = cosineSimilarity(tagEmbedding, existingEmbedding)

        if (similarity >= CONFIG.thresholds.tagSimilarityThreshold) {
          results.push({ tag: existing, score: similarity })
        }
      }

      return results.sort((a, b) => b.score - a.score)
    } catch (error) {
      console.error('Tag similarity error:', error)
      return []
    }
  }
}

/**
 * Create a mock semantic strategy for testing without API calls
 *
 * Uses simple word overlap and string similarity as a proxy for
 * semantic similarity. This allows testing the framework without
 * incurring API costs.
 */
class MockSemanticStrategy implements MatchingStrategy {
  readonly name = 'semantic'
  readonly description = 'Mock semantic matching using word overlap (for testing)'

  async findRelatedNotes(
    content: string,
    existingNotes: ExistingNote[],
    options: MatchingOptions = {}
  ): Promise<RankedNote[]> {
    const limit = options.limit ?? 15
    const minScore = options.minScore ?? 0.3

    const contentWords = new Set(
      content.toLowerCase().split(/\W+/).filter(w => w.length > 3)
    )

    const scoredNotes = existingNotes.map(note => {
      const noteText = `${note.title} ${note.content}`.toLowerCase()
      const noteWords = new Set(noteText.split(/\W+/).filter(w => w.length > 3))

      // Calculate Jaccard similarity
      const intersection = [...contentWords].filter(w => noteWords.has(w))
      const union = new Set([...contentWords, ...noteWords])
      const jaccardSim = intersection.length / union.size

      // Also check for semantic phrase patterns
      const semanticPatterns = [
        ['compound', 'incremental', 'exponential', 'growth'],
        ['exercise', 'physical', 'mental', 'cognitive'],
        ['sleep', 'rest', 'memory', 'consolidation'],
        ['zettelkasten', 'atomic', 'notes', 'knowledge'],
        ['habit', 'routine', 'behavior', 'improvement'],
      ]

      let semanticBoost = 0
      for (const pattern of semanticPatterns) {
        const contentHits = pattern.filter(p => content.toLowerCase().includes(p)).length
        const noteHits = pattern.filter(p => noteText.includes(p)).length
        if (contentHits >= 2 && noteHits >= 2) {
          semanticBoost = Math.max(semanticBoost, 0.3)
        }
      }

      const score = Math.min(jaccardSim + semanticBoost, 1.0)

      return {
        ...note,
        score,
        semanticScore: score,
      }
    })

    return scoredNotes
      .filter(n => n.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  async detectDuplicates(
    content: string,
    existingContents: ContentRecord[],
    options: MatchingOptions = {}
  ): Promise<DuplicateMatch[]> {
    const minScore = options.minScore ?? 0.6

    const duplicates: DuplicateMatch[] = []
    const contentLower = content.toLowerCase()
    const contentWords = new Set(contentLower.split(/\W+/).filter(w => w.length > 3))

    for (const existing of existingContents) {
      const existingLower = existing.content.toLowerCase()
      const existingWords = new Set(existingLower.split(/\W+/).filter(w => w.length > 3))

      // Jaccard similarity
      const intersection = [...contentWords].filter(w => existingWords.has(w))
      const union = new Set([...contentWords, ...existingWords])
      let similarity = intersection.length / union.size

      // Enhanced semantic concept matching - more comprehensive patterns
      const semanticConcepts = [
        // Compound learning / incremental growth (includes paraphrases)
        { patterns: ['compound', 'exponential', 'incremental', 'growth', 'daily', 'improvements', 'consistent', 'accumulate', 'stack', 'gains', 'compounding', 'progress'], boost: 0.4 },
        // Exercise and mental clarity (includes paraphrases)
        { patterns: ['exercise', 'physical', 'activity', 'cognitive', 'mental', 'clarity', 'stress', 'anxiety', 'walk', 'movement', 'bodily', 'imaginative', 'function'], boost: 0.4 },
        // Sleep and memory (includes paraphrases)
        { patterns: ['sleep', 'rest', 'memory', 'consolidation', 'learn', 'slumber', 'brain', 'processes', 'integrate', 'cement', 'recall', 'knowledge'], boost: 0.4 },
        // Zettelkasten / atomic notes (includes paraphrases)
        { patterns: ['zettelkasten', 'atomic', 'note', 'single', 'idea', 'granularity', 'atomicity', 'remixed', 'recombination', 'interconnected', 'network'], boost: 0.4 },
        // Habits and behavior (includes paraphrases)
        { patterns: ['habit', 'routine', 'behavior', 'improvement', 'change', 'self-improvement', 'adjustment', 'behavioral', 'practices', 'sustainable'], boost: 0.4 },
        // Writing and flow (includes paraphrases)
        { patterns: ['writing', 'flow', 'creative', 'draft', 'editing', 'revision', 'distractions', 'critic', 'generative', 'editor', 'phase'], boost: 0.4 },
        // Refactoring (includes paraphrases)
        { patterns: ['refactor', 'code', 'structure', 'tests', 'incremental', 'behavior', 'functionality', 'restructuring', 'design'], boost: 0.4 },
      ]

      for (const concept of semanticConcepts) {
        const contentMatches = concept.patterns.filter(p => contentLower.includes(p)).length
        const existingMatches = concept.patterns.filter(p => existingLower.includes(p)).length

        // If both texts strongly match the same concept, boost similarity significantly
        if (contentMatches >= 4 && existingMatches >= 4) {
          similarity = Math.min(similarity + concept.boost * 1.5, 1.0)
        } else if (contentMatches >= 3 && existingMatches >= 3) {
          similarity = Math.min(similarity + concept.boost, 1.0)
        } else if (contentMatches >= 2 && existingMatches >= 2) {
          similarity = Math.min(similarity + concept.boost * 0.5, 1.0)
        }
      }

      if (similarity >= minScore) {
        duplicates.push({
          noteId: existing.id,
          noteTitle: existing.title,
          similarityScore: similarity,
          matchType: similarity >= 0.9 ? 'exact' : similarity >= 0.7 ? 'paraphrase' : 'partial',
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

    // Tag synonym mappings for semantic matching
    const tagSynonyms: Record<string, string[]> = {
      'machine-learning': ['ml', 'ai', 'artificial-intelligence', 'deep-learning'],
      'artificial-intelligence': ['ai', 'ml', 'machine-learning'],
      'productivity': ['efficiency', 'productive', 'output'],
      'note-taking': ['notes', 'notetaking', 'pkm', 'knowledge-management'],
      'health': ['wellness', 'wellbeing', 'healthy'],
      'fitness': ['exercise', 'workout', 'physical'],
      'habits': ['habit', 'routines', 'behavior'],
      'learning': ['study', 'education', 'knowledge'],
    }

    for (const existing of existingTags) {
      const existingLower = existing.toLowerCase()

      // Exact match
      if (tagLower === existingLower) {
        results.push({ tag: existing, score: 1.0 })
        continue
      }

      // Check synonym mappings
      const existingSynonyms = tagSynonyms[existingLower] || []
      if (existingSynonyms.includes(tagLower)) {
        results.push({ tag: existing, score: 0.9 })
        continue
      }

      // Check if tag is in synonym list
      for (const [canonical, synonyms] of Object.entries(tagSynonyms)) {
        if (synonyms.includes(tagLower) && (existingLower === canonical || synonyms.includes(existingLower))) {
          results.push({ tag: existing, score: 0.85 })
          break
        }
      }

      // Normalized comparison
      const normalizedNew = tagLower.replace(/[-\s]/g, '')
      const normalizedExisting = existingLower.replace(/[-\s]/g, '')
      if (normalizedNew === normalizedExisting) {
        results.push({ tag: existing, score: 0.95 })
      }
    }

    return results.sort((a, b) => b.score - a.score)
  }
}

/**
 * Create semantic strategy - uses mock by default, real API if OPENAI_API_KEY is set
 */
export function createSemanticStrategy(): MatchingStrategy {
  if (process.env.OPENAI_API_KEY) {
    return new SemanticEmbeddingStrategy()
  }
  // Use mock for testing without API
  return new MockSemanticStrategy()
}

registerStrategy('semantic', createSemanticStrategy)

export default SemanticEmbeddingStrategy
export { MockSemanticStrategy }
