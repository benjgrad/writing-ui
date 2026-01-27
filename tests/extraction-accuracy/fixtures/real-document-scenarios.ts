/**
 * Real Document Test Scenarios
 *
 * Transforms exported user data into test scenarios for NVQ pipeline testing.
 * These scenarios use REAL documents as INPUT for extraction, not as quality examples.
 *
 * Ground truth expectations are NOT included here - they will be generated
 * in Phase 9 by running the NVQ extraction pipeline and manually reviewing results.
 *
 * Usage:
 *   import { REAL_DOCUMENT_SCENARIOS, getRealScenariosByType } from './real-document-scenarios'
 */

import * as fs from 'fs'
import * as path from 'path'
import type { QualityTestScenario, QualityExpectation, NoteStatus, NoteType, Stakeholder } from '../quality/types'

// ============================================================================
// Types for Exported Data
// ============================================================================

interface ExportedDocument {
  id: string
  title: string
  content: string
  wordCount: number
  createdAt: string
  updatedAt: string
}

interface ExportedCoachingMessage {
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

interface ExportedCoachingSession {
  id: string
  goalTitle: string | null
  messages: ExportedCoachingMessage[]
  createdAt: string
}

interface ExportedUserData {
  exportedAt: string
  userId: string
  anonymized: boolean
  stats: {
    documentCount: number
    totalDocumentWords: number
    coachingSessionCount: number
    totalCoachingMessages: number
  }
  documents: ExportedDocument[]
  coachingSessions: ExportedCoachingSession[]
}

// ============================================================================
// Content Classification
// ============================================================================

type ContentCategory = 'reflective' | 'technical' | 'planning' | 'coaching' | 'mixed'
type ContentComplexity = 'simple' | 'moderate' | 'complex'

interface ClassifiedDocument extends ExportedDocument {
  category: ContentCategory
  complexity: ContentComplexity
  themes: string[]
}

/**
 * Simple heuristics to classify document content
 */
function classifyDocument(doc: ExportedDocument): ClassifiedDocument {
  const content = doc.content.toLowerCase()
  const title = doc.title.toLowerCase()

  // Detect themes
  const themes: string[] = []
  if (content.includes('goal') || content.includes('plan') || content.includes('strategy')) {
    themes.push('planning')
  }
  if (content.includes('feel') || content.includes('emotion') || content.includes('reflect')) {
    themes.push('emotional')
  }
  if (content.includes('code') || content.includes('api') || content.includes('function') || content.includes('bug')) {
    themes.push('technical')
  }
  if (content.includes('i think') || content.includes('i believe') || content.includes('i want')) {
    themes.push('personal')
  }
  if (content.includes('learn') || content.includes('understand') || content.includes('insight')) {
    themes.push('learning')
  }

  // Determine category
  let category: ContentCategory = 'mixed'
  if (themes.includes('technical') && !themes.includes('emotional')) {
    category = 'technical'
  } else if (themes.includes('planning') && themes.length <= 2) {
    category = 'planning'
  } else if (themes.includes('emotional') || themes.includes('personal')) {
    category = 'reflective'
  }

  // Determine complexity based on word count and structure
  let complexity: ContentComplexity = 'simple'
  if (doc.wordCount > 200) {
    complexity = 'complex'
  } else if (doc.wordCount > 100) {
    complexity = 'moderate'
  }

  // Also consider sentence count and topic diversity
  const sentences = doc.content.split(/[.!?]+/).filter((s) => s.trim().length > 0)
  if (sentences.length > 10 || themes.length > 3) {
    complexity = 'complex'
  }

  return {
    ...doc,
    category,
    complexity,
    themes,
  }
}

// ============================================================================
// Scenario Generation
// ============================================================================

/**
 * Convert a document to a quality test scenario
 * Note: qualityExpectations is empty - ground truth will be generated in Phase 9
 */
function documentToScenario(doc: ClassifiedDocument): QualityTestScenario {
  return {
    name: `Real: ${doc.title.slice(0, 40)}${doc.title.length > 40 ? '...' : ''}`,
    description: `Real document (${doc.category}, ${doc.complexity}) - ${doc.wordCount} words`,

    documents: [
      {
        id: doc.id,
        content: doc.content,
        sourceType: doc.category === 'technical' ? 'technical' : doc.category === 'planning' ? 'planning' : 'reflective',
        metadata: {
          title: doc.title,
          wordCount: doc.wordCount,
          themes: doc.themes,
          complexity: doc.complexity,
          createdAt: doc.createdAt,
        },
      },
    ],

    existingNotes: [],
    existingTags: [],

    // Empty expectations - to be filled by Phase 9 ground truth generation
    qualityExpectations: [],

    // Context - could be enriched later
    availableProjects: ['Writing UI'], // Default project context
    availableMOCs: [],
    userGoals: [],
  }
}

/**
 * Convert a coaching session to a quality test scenario
 */
function coachingToScenario(session: ExportedCoachingSession): QualityTestScenario {
  // Build transcript from messages
  const transcript = session.messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')

  // Estimate complexity
  const totalWords = transcript.split(/\s+/).length
  let complexity: ContentComplexity = 'simple'
  if (totalWords > 500) {
    complexity = 'complex'
  } else if (totalWords > 200) {
    complexity = 'moderate'
  }

  const goalTitle = session.goalTitle || 'Unlinked Session'

  return {
    name: `Coaching: ${goalTitle.slice(0, 35)}${goalTitle.length > 35 ? '...' : ''}`,
    description: `Coaching session (${session.messages.length} messages, ${complexity})`,

    documents: [
      {
        id: session.id,
        content: transcript,
        sourceType: 'coaching',
        metadata: {
          goalTitle: session.goalTitle,
          messageCount: session.messages.length,
          complexity,
          createdAt: session.createdAt,
        },
      },
    ],

    existingNotes: [],
    existingTags: [],

    // Empty expectations - to be filled by Phase 9 ground truth generation
    qualityExpectations: [],

    // Context
    availableProjects: ['Writing UI'],
    availableMOCs: [],
    userGoals: session.goalTitle
      ? [
          {
            id: `goal-${session.id}`,
            title: session.goalTitle,
            whyRoot: '', // Not available in export
          },
        ]
      : [],
  }
}

// ============================================================================
// Data Loading
// ============================================================================

const DATA_FILE = path.join(__dirname, 'real-user-data.json')

let cachedData: ExportedUserData | null = null

/**
 * Load exported user data (cached)
 */
function loadExportedData(): ExportedUserData | null {
  if (cachedData) return cachedData

  if (!fs.existsSync(DATA_FILE)) {
    console.warn(`Warning: ${DATA_FILE} not found. Run export-user-data.ts first.`)
    return null
  }

  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8')
    cachedData = JSON.parse(raw) as ExportedUserData
    return cachedData
  } catch (error) {
    console.error('Error loading exported data:', error)
    return null
  }
}

// ============================================================================
// Scenario Collections
// ============================================================================

/**
 * Generate all document scenarios
 */
function generateDocumentScenarios(): QualityTestScenario[] {
  const data = loadExportedData()
  if (!data) return []

  return data.documents.map(classifyDocument).map(documentToScenario)
}

/**
 * Generate all coaching scenarios
 */
function generateCoachingScenarios(): QualityTestScenario[] {
  const data = loadExportedData()
  if (!data) return []

  return data.coachingSessions.filter((s) => s.messages.length >= 2).map(coachingToScenario)
}

// ============================================================================
// Exports
// ============================================================================

/** All document-based scenarios from real data */
export const REAL_DOCUMENT_SCENARIOS = generateDocumentScenarios()

/** All coaching-based scenarios from real data */
export const REAL_COACHING_SCENARIOS = generateCoachingScenarios()

/** All real user scenarios combined */
export const ALL_REAL_SCENARIOS: QualityTestScenario[] = [...REAL_DOCUMENT_SCENARIOS, ...REAL_COACHING_SCENARIOS]

// ============================================================================
// Filtering Functions
// ============================================================================

/**
 * Get real scenarios by content type
 */
export function getRealScenariosByType(
  sourceType: 'coaching' | 'technical' | 'reflective' | 'planning' | 'mixed'
): QualityTestScenario[] {
  if (sourceType === 'coaching') {
    return REAL_COACHING_SCENARIOS
  }

  return REAL_DOCUMENT_SCENARIOS.filter((s) => {
    const doc = s.documents[0]
    return doc?.sourceType === sourceType
  })
}

/**
 * Get real scenarios by complexity
 */
export function getRealScenariosByComplexity(complexity: ContentComplexity): QualityTestScenario[] {
  return ALL_REAL_SCENARIOS.filter((s) => {
    const meta = s.documents[0]?.metadata as { complexity?: string } | undefined
    return meta?.complexity === complexity
  })
}

/**
 * Get real scenarios by word count range
 */
export function getRealScenariosByWordCount(minWords: number, maxWords: number): QualityTestScenario[] {
  return REAL_DOCUMENT_SCENARIOS.filter((s) => {
    const meta = s.documents[0]?.metadata as { wordCount?: number } | undefined
    const wc = meta?.wordCount || 0
    return wc >= minWords && wc <= maxWords
  })
}

// ============================================================================
// Statistics
// ============================================================================

export interface RealScenarioStats {
  total: number
  documents: number
  coaching: number
  byCategory: Record<string, number>
  byComplexity: Record<string, number>
  wordCountRange: { min: number; max: number; avg: number }
}

/**
 * Get statistics about real scenarios
 */
export function getRealScenarioStats(): RealScenarioStats {
  const data = loadExportedData()
  if (!data) {
    return {
      total: 0,
      documents: 0,
      coaching: 0,
      byCategory: {},
      byComplexity: {},
      wordCountRange: { min: 0, max: 0, avg: 0 },
    }
  }

  const classifiedDocs = data.documents.map(classifyDocument)

  const byCategory: Record<string, number> = {}
  const byComplexity: Record<string, number> = {}

  for (const doc of classifiedDocs) {
    byCategory[doc.category] = (byCategory[doc.category] || 0) + 1
    byComplexity[doc.complexity] = (byComplexity[doc.complexity] || 0) + 1
  }

  const wordCounts = data.documents.map((d) => d.wordCount)
  const minWords = Math.min(...wordCounts)
  const maxWords = Math.max(...wordCounts)
  const avgWords = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length

  return {
    total: ALL_REAL_SCENARIOS.length,
    documents: REAL_DOCUMENT_SCENARIOS.length,
    coaching: REAL_COACHING_SCENARIOS.length,
    byCategory,
    byComplexity,
    wordCountRange: {
      min: minWords,
      max: maxWords,
      avg: Math.round(avgWords),
    },
  }
}

// ============================================================================
// Pre-built Scenario Sets
// ============================================================================

/** Short documents (< 100 words) for quick testing */
export const SHORT_REAL_SCENARIOS = getRealScenariosByWordCount(0, 100)

/** Medium documents (100-200 words) */
export const MEDIUM_REAL_SCENARIOS = getRealScenariosByWordCount(100, 200)

/** Long documents (200+ words) for comprehensive testing */
export const LONG_REAL_SCENARIOS = getRealScenariosByWordCount(200, Infinity)

/** Complex scenarios (long or multi-topic) */
export const COMPLEX_REAL_SCENARIOS = getRealScenariosByComplexity('complex')

/** Simple scenarios for baseline testing */
export const SIMPLE_REAL_SCENARIOS = getRealScenariosByComplexity('simple')

// ============================================================================
// Summary
// ============================================================================

export const REAL_SCENARIO_SUMMARY = {
  documents: REAL_DOCUMENT_SCENARIOS.length,
  coaching: REAL_COACHING_SCENARIOS.length,
  total: ALL_REAL_SCENARIOS.length,
  note: 'Ground truth expectations not included - run generate-ground-truth.ts to create them',
}

// Log summary on import (useful for debugging)
if (process.env.NODE_ENV === 'development') {
  const stats = getRealScenarioStats()
  console.log(`[Real Scenarios] Loaded ${stats.total} scenarios from user data`)
  console.log(`  Documents: ${stats.documents}, Coaching: ${stats.coaching}`)
  console.log(`  By category:`, stats.byCategory)
}
