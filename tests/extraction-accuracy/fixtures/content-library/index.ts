/**
 * Content Library Index
 *
 * Exports all fixture types from the content library.
 */

export {
  COACHING_TRANSCRIPTS,
  getAllCoachingTranscripts,
  getTranscriptsByProject,
  getTranscriptsByComplexity,
  getTranscriptsByTheme,
  type CoachingTranscriptFixture,
} from './coaching-transcripts'

export {
  TECHNICAL_DOCUMENTS,
  getAllTechnicalDocuments,
  getDocumentsByType,
  getDocumentsByComplexity,
  getDocumentsByTheme,
  type TechnicalDocumentFixture,
} from './technical-documents'

export {
  REFLECTIVE_ENTRIES,
  PLANNING_DOCUMENTS,
  EDGE_CASES,
  getAllReflectiveEntries,
  getAllPlanningDocuments,
  getAllEdgeCases,
  getFixturesBySourceType,
  getFixtureById,
  type ContentFixture,
} from './reflective-and-planning'

/**
 * Combined statistics for the content library
 */
export function getContentLibraryStats() {
  return {
    coachingTranscripts: 40,
    technicalDocuments: 30,
    reflectiveEntries: 20,
    planningDocuments: 15,
    edgeCases: 10,
    total: 115,
  }
}
