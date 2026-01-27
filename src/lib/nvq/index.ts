/**
 * Note Vitality Quotient (NVQ) Library
 *
 * Production NVQ scoring system for Zettelkasten note quality evaluation.
 *
 * @example
 * ```typescript
 * import { createNVQEvaluator, NVQExtractedNote } from '@/lib/nvq'
 *
 * const evaluator = createNVQEvaluator({
 *   mocs: ['Accessibility', 'AI Tools'],
 *   projects: ['Writing UI'],
 *   goals: [{ title: 'Build accessible journaling', whyRoot: 'self-love' }],
 * })
 *
 * const note: NVQExtractedNote = {
 *   title: 'Progressive Enhancement for Voice Input',
 *   content: 'I am keeping this because...',
 *   tags: ['#task/implement', '#skill/accessibility'],
 *   connections: [{ targetTitle: '[[MOC/Accessibility]]', type: 'upward', strength: 0.9 }],
 *   purposeStatement: 'I am keeping this because...',
 *   status: 'Seed',
 *   noteType: 'Technical',
 *   stakeholder: 'Future Users',
 *   project: '[[Project/Writing UI]]',
 * }
 *
 * const score = evaluator.evaluateNote(note)
 * console.log(score.total) // 0-10
 * console.log(score.passing) // true if >= 7
 * ```
 */

// Core evaluator
export { NVQEvaluator, createNVQEvaluator, quickEvaluateNote } from './evaluator'

// Types
export type {
  // Enums
  NoteStatus,
  NoteType,
  Stakeholder,
  TagCategory,
  ConnectionDirection,
  QualityStatus,

  // Tag types
  FunctionalTag,
  ClassifiedConnection,

  // Component scores
  WhyComponentScore,
  MetadataComponentScore,
  TaxonomyComponentScore,
  ConnectivityComponentScore,
  OriginalityComponentScore,

  // Main score types
  NVQScore,
  NVQBreakdown,
  NVQExtractedNote,
  NVQEvaluationResult,
  NVQAggregateMetrics,

  // Config
  NVQEvaluatorConfig,
} from './types'

// Type utilities
export { toStorableBreakdown, getQualityStatus } from './types'

// Pattern utilities (for advanced use)
export {
  classifyTag,
  isTopicTag,
  extractProjectName,
  extractWikilinks,
  calculateSynthesisRatio,
} from './patterns'
