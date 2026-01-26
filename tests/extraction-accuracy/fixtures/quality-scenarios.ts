/**
 * Quality Test Scenarios
 *
 * Combines content library fixtures into structured test scenarios
 * for the Note Quality (NVQ) scoring system.
 */

import type { QualityTestScenario } from '../quality/types'
import { COACHING_TRANSCRIPTS, type CoachingTranscriptFixture } from './content-library/coaching-transcripts'
import { TECHNICAL_DOCUMENTS, type TechnicalDocumentFixture } from './content-library/technical-documents'
import {
  REFLECTIVE_ENTRIES,
  PLANNING_DOCUMENTS,
  EDGE_CASES,
  type ContentFixture,
} from './content-library/reflective-and-planning'

// =============================================================================
// Scenario Generation Helpers
// =============================================================================

/**
 * Convert a coaching transcript to a quality test scenario
 */
function coachingToScenario(transcript: CoachingTranscriptFixture): QualityTestScenario {
  return {
    name: `Coaching: ${transcript.goal.title}`,
    description: `Test extraction from coaching session about ${transcript.goal.title}`,
    documents: [
      {
        id: transcript.id,
        content: transcript.transcript,
        sourceType: 'coaching',
        metadata: {
          goalTitle: transcript.goal.title,
          goalWhyRoot: transcript.goal.whyRoot,
          goalMicroWin: transcript.goal.microWin,
        },
      },
    ],
    existingNotes: [],
    existingTags: [],
    qualityExpectations: transcript.expectedNotes,
    availableProjects: transcript.metadata.projectContext ? [transcript.metadata.projectContext] : [],
    availableMOCs: [],
    userGoals: [
      {
        id: `goal-${transcript.id}`,
        title: transcript.goal.title,
        whyRoot: transcript.goal.whyRoot,
      },
    ],
  }
}

/**
 * Convert a technical document to a quality test scenario
 */
function technicalToScenario(doc: TechnicalDocumentFixture): QualityTestScenario {
  return {
    name: `Technical: ${doc.title}`,
    description: `Test extraction from technical document: ${doc.title}`,
    documents: [
      {
        id: doc.id,
        content: doc.content,
        sourceType: 'technical',
        metadata: {
          documentType: doc.metadata.documentType,
          themes: doc.metadata.themes,
        },
      },
    ],
    existingNotes: [],
    existingTags: doc.metadata.themes.map((t) => `#${t}`),
    qualityExpectations: doc.expectedNotes,
    availableProjects: doc.metadata.projectContext ? [doc.metadata.projectContext] : [],
    availableMOCs: [],
    userGoals: [],
  }
}

/**
 * Convert a content fixture to a quality test scenario
 */
function fixtureToScenario(fixture: ContentFixture): QualityTestScenario {
  return {
    name: `${fixture.sourceType.charAt(0).toUpperCase() + fixture.sourceType.slice(1)}: ${fixture.title}`,
    description: `Test extraction from ${fixture.sourceType} content: ${fixture.title}`,
    documents: [
      {
        id: fixture.id,
        content: fixture.content,
        sourceType: fixture.sourceType as 'reflective' | 'planning' | 'edge-case',
        metadata: {
          contentType: fixture.metadata.contentType,
          themes: fixture.metadata.themes,
        },
      },
    ],
    existingNotes: [],
    existingTags: fixture.metadata.themes.map((t) => `#${t}`),
    qualityExpectations: fixture.expectedNotes,
    availableProjects: fixture.metadata.projectContext ? [fixture.metadata.projectContext] : [],
    availableMOCs: [],
    userGoals: [],
  }
}

// =============================================================================
// Generated Scenarios
// =============================================================================

/** All coaching-based quality test scenarios */
export const COACHING_SCENARIOS: QualityTestScenario[] = COACHING_TRANSCRIPTS.map(coachingToScenario)

/** All technical document quality test scenarios */
export const TECHNICAL_SCENARIOS: QualityTestScenario[] = TECHNICAL_DOCUMENTS.map(technicalToScenario)

/** All reflective journal quality test scenarios */
export const REFLECTIVE_SCENARIOS: QualityTestScenario[] = REFLECTIVE_ENTRIES.map(fixtureToScenario)

/** All planning document quality test scenarios */
export const PLANNING_SCENARIOS: QualityTestScenario[] = PLANNING_DOCUMENTS.map(fixtureToScenario)

/** All edge case quality test scenarios */
export const EDGE_CASE_SCENARIOS: QualityTestScenario[] = EDGE_CASES.map(fixtureToScenario)

// =============================================================================
// Combined Scenarios
// =============================================================================

/** All quality test scenarios combined */
export const ALL_QUALITY_SCENARIOS: QualityTestScenario[] = [
  ...COACHING_SCENARIOS,
  ...TECHNICAL_SCENARIOS,
  ...REFLECTIVE_SCENARIOS,
  ...PLANNING_SCENARIOS,
  ...EDGE_CASE_SCENARIOS,
]

// =============================================================================
// Scenario Filtering
// =============================================================================

/**
 * Get scenarios by source type
 */
export function getScenariosBySourceType(
  sourceType: 'coaching' | 'technical' | 'reflective' | 'planning' | 'edge-case'
): QualityTestScenario[] {
  switch (sourceType) {
    case 'coaching':
      return COACHING_SCENARIOS
    case 'technical':
      return TECHNICAL_SCENARIOS
    case 'reflective':
      return REFLECTIVE_SCENARIOS
    case 'planning':
      return PLANNING_SCENARIOS
    case 'edge-case':
      return EDGE_CASE_SCENARIOS
    default:
      return []
  }
}

/**
 * Get scenarios by complexity
 */
export function getScenariosByComplexity(complexity: 'simple' | 'moderate' | 'complex'): QualityTestScenario[] {
  const allFixtures = [
    ...COACHING_TRANSCRIPTS.map((t) => ({ ...t, scenario: coachingToScenario(t) })),
    ...TECHNICAL_DOCUMENTS.map((d) => ({ ...d, metadata: d.metadata, scenario: technicalToScenario(d) })),
    ...REFLECTIVE_ENTRIES.map((f) => ({ ...f, scenario: fixtureToScenario(f) })),
    ...PLANNING_DOCUMENTS.map((f) => ({ ...f, scenario: fixtureToScenario(f) })),
    ...EDGE_CASES.map((f) => ({ ...f, scenario: fixtureToScenario(f) })),
  ]

  return allFixtures.filter((f) => f.metadata.complexity === complexity).map((f) => f.scenario)
}

/**
 * Get scenarios by project context
 */
export function getScenariosByProject(projectContext: string): QualityTestScenario[] {
  return ALL_QUALITY_SCENARIOS.filter(
    (s) => s.availableProjects.includes(projectContext) || s.availableProjects.length === 0
  )
}

/**
 * Get scenarios that have expectations (non-empty expected notes)
 */
export function getScenariosWithExpectations(): QualityTestScenario[] {
  return ALL_QUALITY_SCENARIOS.filter((s) => s.qualityExpectations.length > 0)
}

/**
 * Get edge case scenarios that should produce no notes
 */
export function getEmptyExpectationScenarios(): QualityTestScenario[] {
  return ALL_QUALITY_SCENARIOS.filter((s) => s.qualityExpectations.length === 0)
}

// =============================================================================
// Scenario Statistics
// =============================================================================

export interface ScenarioStats {
  total: number
  bySourceType: Record<string, number>
  byComplexity: Record<string, number>
  withExpectations: number
  withoutExpectations: number
  byProject: Record<string, number>
}

/**
 * Get statistics about available scenarios
 */
export function getScenarioStats(): ScenarioStats {
  const bySourceType: Record<string, number> = {
    coaching: COACHING_SCENARIOS.length,
    technical: TECHNICAL_SCENARIOS.length,
    reflective: REFLECTIVE_SCENARIOS.length,
    planning: PLANNING_SCENARIOS.length,
    'edge-case': EDGE_CASE_SCENARIOS.length,
  }

  const byComplexity: Record<string, number> = {
    simple: getScenariosByComplexity('simple').length,
    moderate: getScenariosByComplexity('moderate').length,
    complex: getScenariosByComplexity('complex').length,
  }

  const byProject: Record<string, number> = {}
  ALL_QUALITY_SCENARIOS.forEach((s) => {
    const project = s.availableProjects[0] || 'none'
    byProject[project] = (byProject[project] || 0) + 1
  })

  return {
    total: ALL_QUALITY_SCENARIOS.length,
    bySourceType,
    byComplexity,
    withExpectations: getScenariosWithExpectations().length,
    withoutExpectations: getEmptyExpectationScenarios().length,
    byProject,
  }
}

// =============================================================================
// Sampling Utilities
// =============================================================================

/**
 * Get a random sample of scenarios
 */
export function sampleScenarios(count: number, seed?: number): QualityTestScenario[] {
  const scenarios = [...ALL_QUALITY_SCENARIOS]

  // Simple seeded random for reproducibility
  const random = seed !== undefined ? seededRandom(seed) : Math.random

  // Fisher-Yates shuffle
  for (let i = scenarios.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[scenarios[i], scenarios[j]] = [scenarios[j], scenarios[i]]
  }

  return scenarios.slice(0, count)
}

/**
 * Get a stratified sample (balanced across source types)
 */
export function stratifiedSample(countPerType: number): QualityTestScenario[] {
  const result: QualityTestScenario[] = []

  const types: Array<'coaching' | 'technical' | 'reflective' | 'planning' | 'edge-case'> = [
    'coaching',
    'technical',
    'reflective',
    'planning',
    'edge-case',
  ]

  for (const type of types) {
    const typeScenarios = getScenariosBySourceType(type)
    const sampled = typeScenarios.slice(0, countPerType)
    result.push(...sampled)
  }

  return result
}

/**
 * Simple seeded random number generator
 */
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = Math.sin(s) * 10000
    return s - Math.floor(s)
  }
}

// =============================================================================
// Lookup Functions
// =============================================================================

/**
 * Get a quality scenario by name
 */
export function getQualityScenarioByName(name: string): QualityTestScenario | undefined {
  return ALL_QUALITY_SCENARIOS.find(s => s.name === name || s.name.toLowerCase() === name.toLowerCase())
}

/**
 * Get all scenario names
 */
export function getAllQualityScenarioNames(): string[] {
  return ALL_QUALITY_SCENARIOS.map(s => s.name)
}

// =============================================================================
// Pre-built Scenario Sets
// =============================================================================

/**
 * Quick smoke test - 5 scenarios, one of each type
 */
export const SMOKE_TEST_SCENARIOS = stratifiedSample(1)

/**
 * Standard test suite - 25 scenarios, 5 of each type
 */
export const STANDARD_TEST_SCENARIOS = stratifiedSample(5)

/**
 * Full test suite - all scenarios with expectations
 */
export const FULL_TEST_SCENARIOS = getScenariosWithExpectations()

/**
 * Writing UI project scenarios only
 */
export const WRITING_UI_SCENARIOS = getScenariosByProject('Writing UI')

/**
 * Complex scenarios only
 */
export const COMPLEX_SCENARIOS = getScenariosByComplexity('complex')

// =============================================================================
// Export Summary
// =============================================================================

export const SCENARIO_SUMMARY = {
  coaching: COACHING_SCENARIOS.length,
  technical: TECHNICAL_SCENARIOS.length,
  reflective: REFLECTIVE_SCENARIOS.length,
  planning: PLANNING_SCENARIOS.length,
  edgeCases: EDGE_CASE_SCENARIOS.length,
  total: ALL_QUALITY_SCENARIOS.length,
}
