/**
 * Note Vitality Quotient (NVQ) Type Definitions
 *
 * Production types for the NVQ scoring system.
 * Based on Zettelkasten best practices and metadata requirements.
 */

// ============================================================================
// Metadata Enums
// ============================================================================

/** Note maturity status */
export type NoteStatus = 'Seed' | 'Sapling' | 'Evergreen'

/** Note content type */
export type NoteType = 'Logic' | 'Technical' | 'Reflection'

/** Target audience for the note */
export type Stakeholder = 'Self' | 'Future Users' | 'AI Agent'

// ============================================================================
// Functional Tag Types
// ============================================================================

/** Categories of functional tags (vs topic tags) */
export type TagCategory = 'action' | 'skill' | 'evolution' | 'project'

/** Parsed tag with category classification */
export interface FunctionalTag {
  /** Original tag string, e.g., "#task/research" */
  raw: string
  /** Parsed category, null if topic tag */
  category: TagCategory | null
  /** Action/skill portion, e.g., "research" from "#task/research" */
  action: string | null
  /** True if this is a generic topic tag (not functional) */
  isTopicTag: boolean
}

// ============================================================================
// Connection Classification
// ============================================================================

/** Direction of note connections */
export type ConnectionDirection = 'upward' | 'sideways' | 'downward'

/** Connection with classified direction */
export interface ClassifiedConnection {
  targetTitle: string
  originalType: string // 'related', 'extends', 'supports', etc.
  direction: ConnectionDirection
  isToMOC: boolean
  isToProject: boolean
}

// ============================================================================
// NVQ Component Scores
// ============================================================================

/**
 * "Why" Component Score (0-3 points)
 *
 * Evaluates the purpose statement: "I am keeping this because..."
 * - First person statement: 1 point
 * - Links to personal goal: 1 point
 * - Is actionable/explains utility: 1 point
 */
export interface WhyComponentScore {
  score: number // 0-3
  hasFirstPerson: boolean
  linksToPersonalGoal: boolean
  isActionable: boolean
  rawStatement: string | null
}

/**
 * Metadata Component Score (0-2 points)
 *
 * Evaluates presence of structured metadata fields.
 * - 3-4 fields present: 2 points
 * - 2 fields present: 1 point
 * - 0-1 fields present: 0 points
 */
export interface MetadataComponentScore {
  score: number // 0-2
  hasProject: boolean
  projectLink: string | null
  hasStatus: boolean
  status: NoteStatus | null
  hasType: boolean
  type: NoteType | null
  hasStakeholder: boolean
  stakeholder: Stakeholder | null
  fieldsPresent: number // 0-4
}

/**
 * Taxonomy Component Score (0-2 points)
 *
 * Evaluates tag quality: functional vs topic tags.
 * - All functional tags: 2 points
 * - Mix of functional + topic: 1 point
 * - Only topic tags: 0 points
 * - Penalty for >5 tags
 */
export interface TaxonomyComponentScore {
  score: number // 0-2
  totalTags: number
  functionalTags: number
  topicTags: number
  tagBreakdown: FunctionalTag[]
  hasActionTag: boolean
  hasSkillTag: boolean
  hasEvolutionTag: boolean
  hasProjectTag: boolean
  exceedsLimit: boolean // More than 5 tags
}

/**
 * Connectivity Component Score (0-2 points)
 *
 * Evaluates the "Two-Link Minimum" requirement.
 * - Upward + Sideways link: 2 points
 * - One direction only: 1 point
 * - No links: 0 points
 */
export interface ConnectivityComponentScore {
  score: number // 0-2
  hasUpwardLink: boolean
  upwardLinks: ClassifiedConnection[]
  hasSidewaysLink: boolean
  sidewaysLinks: ClassifiedConnection[]
  totalConnections: number
  meetsMinimum: boolean
}

/**
 * Originality Component Score (0-1 points)
 *
 * Evaluates synthesis vs raw data.
 * - Original insight and not Wikipedia-fact: 1 point
 * - Otherwise: 0 points
 */
export interface OriginalityComponentScore {
  score: number // 0-1
  synthesisRatio: number // 0.0-1.0
  hasOriginalInsight: boolean
  isWikipediaFact: boolean
  reasoningProvided: string
}

// ============================================================================
// Complete NVQ Score
// ============================================================================

/**
 * NVQ breakdown by component for database storage
 */
export interface NVQBreakdown {
  why: number
  metadata: number
  taxonomy: number
  connectivity: number
  originality: number
}

/**
 * Complete NVQ Score for a single note
 */
export interface NVQScore {
  /** Total score out of 10 */
  total: number
  /** Breakdown by component */
  breakdown: {
    why: WhyComponentScore // 0-3
    metadata: MetadataComponentScore // 0-2
    taxonomy: TaxonomyComponentScore // 0-2
    connectivity: ConnectivityComponentScore // 0-2
    originality: OriginalityComponentScore // 0-1
  }
  /** Whether the note passes (>= threshold, default 7) */
  passing: boolean
  /** Components that scored 0 */
  failingComponents: string[]
}

/**
 * Simplified breakdown for database storage (JSONB)
 */
export function toStorableBreakdown(score: NVQScore): NVQBreakdown {
  return {
    why: score.breakdown.why.score,
    metadata: score.breakdown.metadata.score,
    taxonomy: score.breakdown.taxonomy.score,
    connectivity: score.breakdown.connectivity.score,
    originality: score.breakdown.originality.score,
  }
}

// ============================================================================
// Note Types for Evaluation
// ============================================================================

/**
 * Note structure for NVQ evaluation
 */
export interface NVQExtractedNote {
  // Standard extraction fields
  title: string
  content: string
  tags: string[]
  connections: Array<{
    targetTitle: string
    type: string
    strength: number
  }>

  // Quality metadata fields (from NVQ-aware extraction)
  purposeStatement?: string | null // "I am keeping this because..."
  project?: string | null // e.g., "[[Writing UI]]"
  status?: NoteStatus | null
  noteType?: NoteType | null
  stakeholder?: Stakeholder | null
}

/**
 * Result of evaluating a single note
 */
export interface NVQEvaluationResult {
  noteTitle: string
  noteContent: string
  nvqScore: NVQScore
  issues: string[]
}

// ============================================================================
// Aggregate Metrics
// ============================================================================

/**
 * Aggregate NVQ metrics across all notes
 */
export interface NVQAggregateMetrics {
  // Overall scores
  meanNVQ: number
  medianNVQ: number
  minNVQ: number
  maxNVQ: number
  passingRate: number // % of notes scoring >= threshold

  // Component failure rates (% scoring 0)
  whyFailureRate: number
  metadataFailureRate: number
  taxonomyFailureRate: number
  connectivityFailureRate: number
  originalityFailureRate: number

  // Counts
  totalNotesEvaluated: number
  notesWithPurpose: number
  notesWithCompleteMetadata: number
  notesWithFunctionalTags: number
  notesWithTwoLinks: number
  notesThatAreSynthesis: number

  // Most common failures (for recommendations)
  topFailures: Array<{
    component: string
    issue: string
    count: number
  }>
}

// ============================================================================
// Evaluator Configuration
// ============================================================================

/**
 * Configuration for NVQ evaluator
 */
export interface NVQEvaluatorConfig {
  /** MOCs (Maps of Content) for upward link detection */
  mocs: string[]
  /** Project names for upward link detection */
  projects: string[]
  /** User's goals for purpose statement validation */
  goals: Array<{ title: string; whyRoot: string }>
  /** Passing score threshold (default 7) */
  passingThreshold?: number
}

/**
 * Quality status for workflow management
 */
export type QualityStatus = 'pending' | 'passing' | 'needs_review' | 'manual_override'

/**
 * Determine quality status from NVQ score
 */
export function getQualityStatus(score: NVQScore): QualityStatus {
  return score.passing ? 'passing' : 'needs_review'
}
