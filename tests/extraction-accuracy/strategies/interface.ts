/**
 * Interface for matching strategies
 *
 * Strategies implement different approaches to finding related notes
 * and detecting duplicates. This allows A/B testing of different
 * matching algorithms.
 */

import type {
  RankedNote,
  DuplicateMatch,
  ContentRecord,
  ExistingNote,
} from '../metrics/types'

/**
 * Options for matching strategy operations
 */
export interface MatchingOptions {
  // Maximum number of results to return
  limit?: number
  // Minimum score threshold for inclusion
  minScore?: number
  // Include debugging information in results
  debug?: boolean
}

/**
 * Interface that all matching strategies must implement
 */
export interface MatchingStrategy {
  /**
   * Unique name for this strategy
   */
  readonly name: string

  /**
   * Human-readable description
   */
  readonly description: string

  /**
   * Find notes related to the given content
   *
   * @param content - The content to find related notes for
   * @param existingNotes - All existing notes to search through
   * @param options - Optional configuration
   * @returns Ranked list of related notes, sorted by relevance score (descending)
   */
  findRelatedNotes(
    content: string,
    existingNotes: ExistingNote[],
    options?: MatchingOptions
  ): Promise<RankedNote[]>

  /**
   * Detect potential duplicates for the given content
   *
   * @param content - The content to check for duplicates
   * @param existingContents - Existing content records to check against
   * @param options - Optional configuration
   * @returns List of potential duplicate matches
   */
  detectDuplicates(
    content: string,
    existingContents: ContentRecord[],
    options?: MatchingOptions
  ): Promise<DuplicateMatch[]>

  /**
   * Find similar tags to the given tag name
   *
   * @param tagName - The tag to find similar tags for
   * @param existingTags - List of existing tags
   * @returns List of similar existing tags, sorted by similarity
   */
  findSimilarTags(
    tagName: string,
    existingTags: string[]
  ): Promise<Array<{ tag: string; score: number }>>

  /**
   * Initialize the strategy (load models, connect to services, etc.)
   * Called once before testing begins.
   */
  initialize?(): Promise<void>

  /**
   * Clean up resources when testing is complete
   */
  cleanup?(): Promise<void>
}

/**
 * Factory function type for creating strategies
 */
export type StrategyFactory = () => MatchingStrategy

/**
 * Registry of available strategies
 */
export const strategyRegistry: Map<string, StrategyFactory> = new Map()

/**
 * Register a strategy factory
 */
export function registerStrategy(name: string, factory: StrategyFactory): void {
  strategyRegistry.set(name, factory)
}

/**
 * Get a strategy by name
 */
export function getStrategy(name: string): MatchingStrategy | null {
  const factory = strategyRegistry.get(name)
  return factory ? factory() : null
}

/**
 * Get all registered strategy names
 */
export function getStrategyNames(): string[] {
  return Array.from(strategyRegistry.keys())
}
