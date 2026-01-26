/**
 * Type definitions for extraction accuracy metrics
 */

/**
 * Metrics for duplicate/consolidation detection
 */
export interface DuplicateDetectionMetrics {
  // Number of correctly identified duplicates
  truePositives: number
  // Number of non-duplicates incorrectly flagged as duplicates
  falsePositives: number
  // Number of actual duplicates that were missed
  falseNegatives: number
  // True negatives (correctly identified as not duplicates)
  trueNegatives: number
  // Precision: TP / (TP + FP)
  precision: number
  // Recall: TP / (TP + FN)
  recall: number
  // F1 Score: 2 * (precision * recall) / (precision + recall)
  f1Score: number
}

/**
 * Metrics for note consolidation behavior
 */
export interface ConsolidationMetrics {
  // Notes correctly consolidated with existing notes
  correctConsolidations: number
  // Notes that should have been consolidated but weren't
  missedConsolidations: number
  // Notes incorrectly consolidated (merged with wrong note)
  wrongConsolidations: number
  // Notes correctly created as new (not consolidated)
  correctNewNotes: number
  // Overall consolidation accuracy
  accuracy: number
}

/**
 * Metrics for tag reuse behavior
 */
export interface TagReuseMetrics {
  // Times an existing tag was correctly reused
  reusedExisting: number
  // Times a new tag was correctly created (truly new concept)
  correctlyCreatedNew: number
  // Times a new tag was created when an existing synonym should have been used
  shouldHaveReused: number
  // Tag reuse rate: reusedExisting / (reusedExisting + shouldHaveReused)
  reuseRate: number
  // Total tags assigned across all notes
  totalTagsAssigned: number
}

/**
 * Metrics for connection detection between notes
 */
export interface ConnectionMetrics {
  // Correct connections identified
  correctConnections: number
  // Connections that should exist but weren't created
  missedConnections: number
  // Connections created that shouldn't exist
  spuriousConnections: number
  // Connection precision
  precision: number
  // Connection recall
  recall: number
}

/**
 * Combined metrics for a single test run
 */
export interface ExtractionMetrics {
  duplicateDetection: DuplicateDetectionMetrics
  consolidation: ConsolidationMetrics
  tagReuse: TagReuseMetrics
  connections: ConnectionMetrics
  // Timing information
  timing: {
    totalMs: number
    contextRetrievalMs: number
    extractionMs: number
  }
}

/**
 * Results from running a single scenario with a specific strategy
 */
export interface ScenarioResult {
  scenarioName: string
  strategyName: string
  metrics: ExtractionMetrics
  // Raw extraction results for debugging
  extractedNotes: ExtractedNoteResult[]
  // Any errors encountered
  errors: string[]
}

/**
 * A single extracted note from the AI
 */
export interface ExtractedNoteResult {
  title: string
  content: string
  tags: string[]
  consolidatedWith: string | null
  mergedContent: string | null
  connections: Array<{
    targetTitle: string
    type: string
    strength: number
  }>
}

/**
 * Complete test report across all scenarios and strategies
 */
export interface TestReport {
  runId: string
  timestamp: string
  summary: {
    overallF1Score: number
    overallConsolidationAccuracy: number
    overallTagReuseRate: number
    bestStrategy: string
    recommendations: string[]
  }
  byScenario: Record<string, {
    byStrategy: Record<string, ExtractionMetrics>
  }>
  rawResults: ScenarioResult[]
}

/**
 * Ground truth for a single expected note
 */
export interface ExpectedNote {
  // Approximate title (can have variations)
  titlePatterns: string[]
  // Key phrases that must be present in content
  requiredPhrases: string[]
  // Should this consolidate with an existing note?
  shouldConsolidateWith: string | null
  // Expected tags (normalized lowercase)
  expectedTags: string[]
  // Expected connections
  expectedConnections: Array<{
    targetTitlePattern: string
    types: string[] // Acceptable connection types
  }>
}

/**
 * Ground truth for expected consolidations
 */
export interface ExpectedConsolidation {
  // Pattern for the new content that should trigger consolidation
  newContentPattern: string
  // Title of existing note it should merge with
  existingNoteTitle: string
  // Key phrases that should appear in merged content
  mergedContentPhrases: string[]
}

/**
 * A test scenario with input documents and expected outputs
 */
export interface TestScenario {
  name: string
  description: string
  // Documents to process
  documents: SyntheticDocument[]
  // Pre-existing notes in the system
  existingNotes: ExistingNote[]
  // Pre-existing tags in the system
  existingTags: string[]
  // Expected extraction results
  expectedNotes: ExpectedNote[]
  // Expected consolidations
  expectedConsolidations: ExpectedConsolidation[]
}

/**
 * A synthetic document for testing
 */
export interface SyntheticDocument {
  id: string
  content: string
  metadata: {
    // If set, this doc contains exact duplicate content from another doc
    hasExactDuplicateOf?: string
    // If set, this doc paraphrases content from another doc
    paraphrasedFrom?: string
    // Sections that are shared with other documents
    sharedSections?: Array<{
      docId: string
      sectionIndex: number
    }>
    // Ground truth tags that should be assigned
    expectedTags?: string[]
    // Notes this should consolidate with
    expectedConsolidations?: string[]
  }
}

/**
 * An existing note in the test environment
 */
export interface ExistingNote {
  id: string
  title: string
  content: string
  tags: string[]
}

/**
 * A ranked note returned by a matching strategy
 */
export interface RankedNote {
  id: string
  title: string
  content: string
  score: number
  // Optional: semantic similarity score (for strategies that compute it)
  semanticScore?: number
  // Optional: keyword match score
  keywordScore?: number
}

/**
 * A duplicate match detected by a strategy
 */
export interface DuplicateMatch {
  noteId: string
  noteTitle: string
  similarityScore: number
  matchType: 'exact' | 'paraphrase' | 'partial'
}

/**
 * Content record for duplicate detection
 */
export interface ContentRecord {
  id: string
  title: string
  content: string
}

// =============================================================================
// Note Quality (NVQ) Metrics Integration
// =============================================================================

/**
 * Re-export core NVQ types from quality module
 */
import type { QualityEvaluationResults } from '../quality/types'

export type {
  NoteStatus,
  NoteType,
  Stakeholder,
  NVQScore,
  WhyComponentScore,
  MetadataComponentScore,
  TaxonomyComponentScore,
  ConnectivityComponentScore,
  OriginalityComponentScore,
  NoteQualityMetrics,
  QualityExpectation,
  QualityTestScenario,
  NVQEvaluationResult,
  QualityEvaluationResults,
} from '../quality/types'

/**
 * Extended scenario result with NVQ scores
 */
export interface ScenarioResultWithQuality extends ScenarioResult {
  /** NVQ evaluation results for extracted notes */
  qualityResults?: QualityEvaluationResults
}

/**
 * Extended test report with NVQ metrics
 */
export interface TestReportWithQuality extends TestReport {
  /** Aggregate quality metrics across all scenarios */
  qualitySummary?: {
    /** Mean NVQ score across all extracted notes */
    meanNVQ: number
    /** Median NVQ score */
    medianNVQ: number
    /** Percentage of notes meeting quality threshold */
    passingRate: number
    /** Component-level failure rates */
    componentFailureRates: {
      why: number
      metadata: number
      taxonomy: number
      connectivity: number
      originality: number
    }
    /** Top issues found */
    topIssues: Array<{
      component: string
      issue: string
      count: number
    }>
    /** Recommendations for improvement */
    qualityRecommendations: string[]
  }
  /** Quality results per scenario */
  qualityByScenario?: Record<string, QualityEvaluationResults>
}

/**
 * Combined metrics for extraction + quality
 */
export interface CombinedMetrics {
  /** Standard extraction accuracy metrics */
  extraction: ExtractionMetrics
  /** Note quality metrics */
  quality?: {
    meanNVQ: number
    passingRate: number
    componentScores: {
      why: number
      metadata: number
      taxonomy: number
      connectivity: number
      originality: number
    }
  }
}

/**
 * Quality threshold configuration
 */
export interface QualityThresholds {
  /** Minimum NVQ score to pass (default: 7) */
  minimumNVQ: number
  /** Target mean NVQ across all notes */
  targetMeanNVQ: number
  /** Target passing rate (% of notes above minimum) */
  targetPassingRate: number
  /** Component-specific minimums */
  componentMinimums: {
    why: number
    metadata: number
    taxonomy: number
    connectivity: number
    originality: number
  }
}

/**
 * Default quality thresholds
 */
export const DEFAULT_QUALITY_THRESHOLDS: QualityThresholds = {
  minimumNVQ: 7,
  targetMeanNVQ: 7.5,
  targetPassingRate: 0.8,
  componentMinimums: {
    why: 1, // At least 1 out of 3
    metadata: 1, // At least 1 out of 2
    taxonomy: 1, // At least 1 out of 2
    connectivity: 1, // At least 1 out of 2
    originality: 0, // Optional
  },
}

/**
 * Quality evaluation options
 */
export interface QualityEvaluationOptions {
  /** Enable quality evaluation */
  enabled: boolean
  /** Thresholds to use */
  thresholds: QualityThresholds
  /** Include detailed breakdown in results */
  includeDetailedBreakdown: boolean
  /** Available projects for project linking evaluation */
  availableProjects: string[]
  /** Available MOCs for upward linking evaluation */
  availableMOCs: string[]
}

