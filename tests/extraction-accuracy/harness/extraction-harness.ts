/**
 * Test harness for extraction accuracy testing
 *
 * Wraps the extraction process to enable controlled testing
 * with synthetic documents and ground truth comparison.
 */

import type {
  TestScenario,
  SyntheticDocument,
  ExistingNote,
  ExtractedNoteResult,
  ExtractionMetrics,
} from '../metrics/types'
import type { MatchingStrategy } from '../strategies/interface'
import { calculateAllMetrics } from '../metrics/calculator'

/**
 * Result from running extraction on a document
 */
export interface DocumentExtractionResult {
  documentId: string
  extractedNotes: ExtractedNoteResult[]
  timing: {
    contextRetrievalMs: number
    extractionMs: number
    totalMs: number
  }
}

/**
 * Mock AI provider for testing strategies without calling Claude
 *
 * This simulates what the AI would return based on the matching strategy's
 * ability to find related content and suggest consolidations.
 */
export class MockExtractionProvider {
  constructor(private strategy: MatchingStrategy) {}

  /**
   * Simulate extraction using the strategy's matching capabilities
   *
   * This doesn't actually call Claude - it uses the strategy to determine
   * what consolidations and connections should be detected.
   */
  async extractNotes(
    content: string,
    existingNotes: ExistingNote[],
    existingTags: string[]
  ): Promise<ExtractedNoteResult[]> {
    const results: ExtractedNoteResult[] = []

    // Split content into paragraphs (simulating atomic note extraction)
    const paragraphs = content
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 50)

    for (const paragraph of paragraphs) {
      // Use strategy to find related notes
      const relatedNotes = await this.strategy.findRelatedNotes(
        paragraph,
        existingNotes,
        { limit: 5 }
      )

      // Use strategy to detect duplicates
      const duplicates = await this.strategy.detectDuplicates(
        paragraph,
        existingNotes.map(n => ({ id: n.id, title: n.title, content: n.content })),
        {}
      )

      // Generate title from first few words
      const words = paragraph.split(/\s+/).slice(0, 6)
      const title = words.join(' ') + '...'

      // Determine if we should consolidate
      let consolidateWith: string | null = null
      let mergedContent: string | null = null

      // If high similarity duplicate found, consolidate
      if (duplicates.length > 0 && duplicates[0].similarityScore > 0.7) {
        consolidateWith = duplicates[0].noteTitle
        mergedContent = `${existingNotes.find(n => n.id === duplicates[0].noteId)?.content || ''}\n\nAdditional insight: ${paragraph}`
      }

      // Find similar tags
      const tagCandidates = ['learning', 'productivity', 'habits', 'writing']
      const tags: string[] = []

      for (const candidate of tagCandidates) {
        const similar = await this.strategy.findSimilarTags(candidate, existingTags)
        if (similar.length > 0 && similar[0].score > 0.8) {
          tags.push(similar[0].tag)
        } else if (paragraph.toLowerCase().includes(candidate)) {
          // Create new tag if no similar existing tag
          tags.push(candidate)
        }
      }

      // Create connections to related notes
      const connections = relatedNotes
        .filter(n => n.score > 0.5)
        .slice(0, 3)
        .map(n => ({
          targetTitle: n.title,
          type: 'related' as const,
          strength: Math.min(n.score / 10, 1),
        }))

      results.push({
        title,
        content: paragraph,
        tags: tags.length > 0 ? tags : ['uncategorized'],
        consolidatedWith: consolidateWith,
        mergedContent,
        connections,
      })
    }

    return results
  }
}

/**
 * Test harness for running extraction accuracy tests
 */
export class ExtractionHarness {
  private existingNotes: ExistingNote[] = []
  private existingTags: string[] = []
  private documents: SyntheticDocument[] = []

  /**
   * Set up the test environment with existing notes and tags
   */
  async setup(scenario: TestScenario): Promise<void> {
    this.existingNotes = [...scenario.existingNotes]
    this.existingTags = [...scenario.existingTags]
    this.documents = [...scenario.documents]
  }

  /**
   * Inject additional documents for testing
   */
  injectDocuments(docs: SyntheticDocument[]): void {
    this.documents.push(...docs)
  }

  /**
   * Inject additional existing notes
   */
  injectExistingNotes(notes: ExistingNote[]): void {
    this.existingNotes.push(...notes)
  }

  /**
   * Run extraction on all documents using the given strategy
   */
  async runExtraction(
    strategy: MatchingStrategy
  ): Promise<DocumentExtractionResult[]> {
    const results: DocumentExtractionResult[] = []
    const provider = new MockExtractionProvider(strategy)

    // Initialize strategy if needed
    if (strategy.initialize) {
      await strategy.initialize()
    }

    for (const doc of this.documents) {
      const startTime = Date.now()

      // Simulate context retrieval timing
      const contextStart = Date.now()
      const relatedNotes = await strategy.findRelatedNotes(
        doc.content,
        this.existingNotes,
        { limit: 15 }
      )
      const contextRetrievalMs = Date.now() - contextStart

      // Run extraction
      const extractionStart = Date.now()
      const extractedNotes = await provider.extractNotes(
        doc.content,
        this.existingNotes,
        this.existingTags
      )
      const extractionMs = Date.now() - extractionStart

      const totalMs = Date.now() - startTime

      // Update existing notes with newly extracted ones (for subsequent documents)
      for (const note of extractedNotes) {
        if (!note.consolidatedWith) {
          this.existingNotes.push({
            id: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            title: note.title,
            content: note.content,
            tags: note.tags,
          })
        }
      }

      results.push({
        documentId: doc.id,
        extractedNotes,
        timing: {
          contextRetrievalMs,
          extractionMs,
          totalMs,
        },
      })
    }

    // Cleanup strategy if needed
    if (strategy.cleanup) {
      await strategy.cleanup()
    }

    return results
  }

  /**
   * Evaluate extraction results against the scenario's expected outcomes
   */
  evaluate(
    results: DocumentExtractionResult[],
    scenario: TestScenario
  ): ExtractionMetrics {
    // Flatten all extracted notes
    const allExtracted = results.flatMap(r => r.extractedNotes)

    // Calculate aggregate timing
    const timing = {
      totalMs: results.reduce((sum, r) => sum + r.timing.totalMs, 0),
      contextRetrievalMs: results.reduce((sum, r) => sum + r.timing.contextRetrievalMs, 0),
      extractionMs: results.reduce((sum, r) => sum + r.timing.extractionMs, 0),
    }

    return calculateAllMetrics(allExtracted, scenario, timing)
  }

  /**
   * Reset the harness state
   */
  teardown(): void {
    this.existingNotes = []
    this.existingTags = []
    this.documents = []
  }
}

/**
 * Create a new test harness instance
 */
export function createHarness(): ExtractionHarness {
  return new ExtractionHarness()
}
