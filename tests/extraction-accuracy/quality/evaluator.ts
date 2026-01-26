/**
 * NVQ Scoring Engine
 *
 * Evaluates extracted notes against the 10-point NVQ scorecard:
 * - Why (0-3): Purpose statement, goal link, actionability
 * - Metadata (0-2): Status, Type, Stakeholder (Project encouraged)
 * - Taxonomy (0-2): Functional vs topic tags
 * - Connectivity (0-2): Upward + Sideways links
 * - Originality (0-1): Synthesis vs raw data
 */

import type {
  NVQScore,
  WhyComponentScore,
  MetadataComponentScore,
  TaxonomyComponentScore,
  ConnectivityComponentScore,
  OriginalityComponentScore,
  QualityExtractedNote,
  QualityExpectation,
  FunctionalTag,
  NoteStatus,
  NoteType,
  Stakeholder,
  ClassifiedConnection,
  NoteQualityMetrics,
  NVQEvaluationResult,
} from './types'

import {
  PURPOSE_PATTERNS,
  METADATA_PATTERNS,
  LINK_PATTERNS,
  SYNTHESIS_PATTERNS,
  classifyTag,
  extractProjectName,
  extractWikilinks,
  calculateSynthesisRatio,
  countPatternMatches,
} from './patterns'

// ============================================================================
// Evaluator Configuration
// ============================================================================

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

// ============================================================================
// NVQ Evaluator Class
// ============================================================================

export class NVQEvaluator {
  private mocPatterns: RegExp[]
  private projectPatterns: RegExp[]
  private userGoals: Array<{ title: string; whyRoot: string }>
  private passingThreshold: number

  constructor(config: NVQEvaluatorConfig) {
    this.mocPatterns = config.mocs.map((m) => new RegExp(`\\[\\[.*${this.escapeRegex(m)}.*\\]\\]`, 'i'))
    this.projectPatterns = config.projects.map((p) => new RegExp(`\\[\\[.*${this.escapeRegex(p)}.*\\]\\]`, 'i'))
    this.userGoals = config.goals
    this.passingThreshold = config.passingThreshold ?? 7
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  // ==========================================================================
  // Main Evaluation Method
  // ==========================================================================

  /**
   * Evaluate a single note and return its NVQ score
   */
  evaluateNote(note: QualityExtractedNote, expectation?: QualityExpectation): NVQScore {
    const why = this.scoreWhy(note, expectation)
    const metadata = this.scoreMetadata(note, expectation)
    const taxonomy = this.scoreTaxonomy(note, expectation)
    const connectivity = this.scoreConnectivity(note, expectation)
    const originality = this.scoreOriginality(note, expectation)

    const total = why.score + metadata.score + taxonomy.score + connectivity.score + originality.score

    const failingComponents: string[] = []
    if (why.score === 0) failingComponents.push('why')
    if (metadata.score === 0) failingComponents.push('metadata')
    if (taxonomy.score === 0) failingComponents.push('taxonomy')
    if (connectivity.score === 0) failingComponents.push('connectivity')
    if (originality.score === 0) failingComponents.push('originality')

    return {
      total,
      breakdown: { why, metadata, taxonomy, connectivity, originality },
      passing: total >= this.passingThreshold,
      failingComponents,
    }
  }

  // ==========================================================================
  // Component Scoring Methods
  // ==========================================================================

  /**
   * Score the "Why" component (0-3 points)
   */
  private scoreWhy(note: QualityExtractedNote, expectation?: QualityExpectation): WhyComponentScore {
    const purpose = note.purposeStatement || ''
    const content = `${note.title} ${note.content} ${purpose}`
    let score = 0

    // Check for first person statement (1 point)
    const hasFirstPerson = PURPOSE_PATTERNS.FIRST_PERSON.test(purpose) || PURPOSE_PATTERNS.FIRST_PERSON.test(content)
    if (hasFirstPerson) score += 1

    // Check if links to personal goal (1 point)
    const linksToPersonalGoal = this.checkGoalLink(content)
    if (linksToPersonalGoal) score += 1

    // Check if actionable (1 point)
    const isActionable = PURPOSE_PATTERNS.ACTIONABLE.test(purpose) || PURPOSE_PATTERNS.ACTIONABLE.test(content)
    if (isActionable) score += 1

    return {
      score,
      hasFirstPerson,
      linksToPersonalGoal,
      isActionable,
      rawStatement: purpose || null,
    }
  }

  private checkGoalLink(content: string): boolean {
    const contentLower = content.toLowerCase()
    return this.userGoals.some(
      (goal) =>
        contentLower.includes(goal.title.toLowerCase()) ||
        (goal.whyRoot && contentLower.includes(goal.whyRoot.toLowerCase()))
    )
  }

  /**
   * Score the Metadata component (0-2 points)
   * Project is encouraged but not required
   */
  private scoreMetadata(note: QualityExtractedNote, expectation?: QualityExpectation): MetadataComponentScore {
    let fieldsPresent = 0

    // Check project (encouraged, not required)
    const hasProject = !!note.project
    const projectLink = note.project || extractProjectName(note.content)
    if (hasProject || projectLink) fieldsPresent++

    // Check status
    const hasStatus = !!note.status && ['Seed', 'Sapling', 'Evergreen'].includes(note.status)
    if (hasStatus) fieldsPresent++

    // Check type
    const hasType = !!note.noteType && ['Logic', 'Technical', 'Reflection'].includes(note.noteType)
    if (hasType) fieldsPresent++

    // Check stakeholder
    const hasStakeholder = !!note.stakeholder && ['Self', 'Future Users', 'AI Agent'].includes(note.stakeholder)
    if (hasStakeholder) fieldsPresent++

    // Score: 3-4 fields = 2 points, 2 fields = 1 point, 0-1 = 0 points
    let score = 0
    if (fieldsPresent >= 3) score = 2
    else if (fieldsPresent >= 2) score = 1

    return {
      score,
      hasProject: hasProject || !!projectLink,
      projectLink: projectLink || note.project,
      hasStatus,
      status: note.status,
      hasType,
      type: note.noteType,
      hasStakeholder,
      stakeholder: note.stakeholder,
      fieldsPresent,
    }
  }

  /**
   * Score the Taxonomy component (0-2 points)
   */
  private scoreTaxonomy(note: QualityExtractedNote, expectation?: QualityExpectation): TaxonomyComponentScore {
    const tagBreakdown = this.classifyTags(note.tags)
    const functionalTags = tagBreakdown.filter((t) => !t.isTopicTag)
    const topicTags = tagBreakdown.filter((t) => t.isTopicTag)

    const hasActionTag = tagBreakdown.some((t) => t.category === 'action')
    const hasSkillTag = tagBreakdown.some((t) => t.category === 'skill')
    const hasEvolutionTag = tagBreakdown.some((t) => t.category === 'evolution')
    const hasProjectTag = tagBreakdown.some((t) => t.category === 'project')
    const exceedsLimit = note.tags.length > 5

    // Score: all functional = 2, mix = 1, only topic = 0
    let score = 0
    if (functionalTags.length > 0 && topicTags.length === 0) {
      score = 2
    } else if (functionalTags.length > 0) {
      score = 1
    }

    // Penalty for exceeding tag limit
    if (exceedsLimit && score > 0) {
      score -= 1
    }

    return {
      score: Math.max(0, score),
      totalTags: note.tags.length,
      functionalTags: functionalTags.length,
      topicTags: topicTags.length,
      tagBreakdown,
      hasActionTag,
      hasSkillTag,
      hasEvolutionTag,
      hasProjectTag,
      exceedsLimit,
    }
  }

  private classifyTags(tags: string[]): FunctionalTag[] {
    return tags.map((tag) => {
      const classification = classifyTag(tag)
      return {
        raw: tag,
        category: classification.category,
        action: classification.action,
        isTopicTag: classification.isTopicTag,
      }
    })
  }

  /**
   * Score the Connectivity component (0-2 points)
   */
  private scoreConnectivity(
    note: QualityExtractedNote,
    expectation?: QualityExpectation
  ): ConnectivityComponentScore {
    const classifiedConnections = this.classifyConnections(note.connections, note.content)

    const upwardLinks = classifiedConnections.filter((c) => c.direction === 'upward')
    const sidewaysLinks = classifiedConnections.filter((c) => c.direction === 'sideways')

    const hasUpwardLink = upwardLinks.length > 0
    const hasSidewaysLink = sidewaysLinks.length > 0
    const meetsMinimum = hasUpwardLink && hasSidewaysLink

    // Score: both = 2, one = 1, none = 0
    let score = 0
    if (meetsMinimum) {
      score = 2
    } else if (hasUpwardLink || hasSidewaysLink) {
      score = 1
    }

    return {
      score,
      hasUpwardLink,
      upwardLinks,
      hasSidewaysLink,
      sidewaysLinks,
      totalConnections: note.connections.length,
      meetsMinimum,
    }
  }

  private classifyConnections(
    connections: Array<{ targetTitle: string; type: string; strength: number }>,
    content: string
  ): ClassifiedConnection[] {
    // Also extract wikilinks from content for additional connections
    const contentLinks = extractWikilinks(content)
    const allConnections = [
      ...connections.map((c) => ({ targetTitle: c.targetTitle, originalType: c.type })),
      ...contentLinks.map((link) => ({ targetTitle: link, originalType: 'reference' })),
    ]

    return allConnections.map((conn) => {
      const target = conn.targetTitle.toLowerCase()

      // Check if upward (to MOC or Project)
      const isToMOC =
        this.mocPatterns.some((p) => p.test(conn.targetTitle)) ||
        target.includes('moc') ||
        target.includes('map of content') ||
        LINK_PATTERNS.MOC.test(conn.targetTitle)

      const isToProject =
        this.projectPatterns.some((p) => p.test(conn.targetTitle)) ||
        target.includes('project/') ||
        LINK_PATTERNS.PROJECT.test(conn.targetTitle)

      let direction: 'upward' | 'sideways' | 'downward' = 'sideways'
      if (isToMOC || isToProject) {
        direction = 'upward'
      } else if (conn.originalType === 'example_of') {
        direction = 'downward'
      }

      return {
        targetTitle: conn.targetTitle,
        originalType: conn.originalType,
        direction,
        isToMOC,
        isToProject,
      }
    })
  }

  /**
   * Score the Originality component (0-1 points)
   */
  private scoreOriginality(note: QualityExtractedNote, expectation?: QualityExpectation): OriginalityComponentScore {
    const content = `${note.title} ${note.content}`

    // Count synthesis indicators
    const synthesisMatches = countPatternMatches(content, SYNTHESIS_PATTERNS.ORIGINAL_INSIGHT)

    // Check for Wikipedia-style facts
    const wikiFactMatches = countPatternMatches(content, SYNTHESIS_PATTERNS.WIKIPEDIA_FACT)
    const isWikipediaFact = wikiFactMatches > 0 && synthesisMatches < 2

    // Calculate synthesis ratio
    const synthesisRatio = calculateSynthesisRatio(content)

    // Determine if it has original insight
    const hasOriginalInsight = synthesisMatches >= 2 || synthesisRatio > 0.7

    // Score: original insight and not wiki fact = 1, otherwise 0
    const score = hasOriginalInsight && !isWikipediaFact ? 1 : 0

    let reasoningProvided: string
    if (isWikipediaFact) {
      reasoningProvided = 'Contains primarily factual/encyclopedic content'
    } else if (hasOriginalInsight) {
      reasoningProvided = 'Contains original interpretation and synthesis'
    } else {
      reasoningProvided = 'Mostly factual, lacks personal synthesis'
    }

    return {
      score,
      synthesisRatio,
      hasOriginalInsight,
      isWikipediaFact,
      reasoningProvided,
    }
  }

  // ==========================================================================
  // Batch Evaluation
  // ==========================================================================

  /**
   * Evaluate multiple notes and return aggregate metrics
   */
  evaluateNotes(
    notes: QualityExtractedNote[],
    expectations?: QualityExpectation[]
  ): {
    results: NVQEvaluationResult[]
    metrics: NoteQualityMetrics
  } {
    const results: NVQEvaluationResult[] = notes.map((note, index) => {
      const expectation = expectations?.[index]
      const nvqScore = this.evaluateNote(note, expectation)

      return {
        noteTitle: note.title,
        noteContent: note.content,
        nvqScore,
        matchedExpectation: expectation || null,
        issues: this.identifyIssues(nvqScore),
      }
    })

    const metrics = this.calculateAggregateMetrics(results)

    return { results, metrics }
  }

  private identifyIssues(score: NVQScore): string[] {
    const issues: string[] = []

    if (score.breakdown.why.score === 0) {
      issues.push('Missing purpose statement ("I am keeping this because...")')
    } else if (!score.breakdown.why.linksToPersonalGoal) {
      issues.push('Purpose statement does not link to a personal goal')
    }

    if (score.breakdown.metadata.fieldsPresent < 2) {
      issues.push('Missing metadata fields (Status, Type, Stakeholder)')
    }

    if (score.breakdown.taxonomy.topicTags > score.breakdown.taxonomy.functionalTags) {
      issues.push('Too many topic tags, not enough functional tags')
    }

    if (score.breakdown.taxonomy.exceedsLimit) {
      issues.push('Exceeds 5 tag limit - note may need to be split')
    }

    if (!score.breakdown.connectivity.meetsMinimum) {
      if (!score.breakdown.connectivity.hasUpwardLink) {
        issues.push('Missing upward link to MOC or Project')
      }
      if (!score.breakdown.connectivity.hasSidewaysLink) {
        issues.push('Missing sideways link to related concept')
      }
    }

    if (score.breakdown.originality.isWikipediaFact) {
      issues.push('Content is too factual - add personal interpretation')
    }

    return issues
  }

  // ==========================================================================
  // Aggregate Metrics Calculation
  // ==========================================================================

  private calculateAggregateMetrics(results: NVQEvaluationResult[]): NoteQualityMetrics {
    if (results.length === 0) {
      return this.emptyMetrics()
    }

    const scores = results.map((r) => r.nvqScore.total)
    const sortedScores = [...scores].sort((a, b) => a - b)

    // Calculate distributions
    const whyDist: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 }
    const metaDist: Record<number, number> = { 0: 0, 1: 0, 2: 0 }
    const taxDist: Record<number, number> = { 0: 0, 1: 0, 2: 0 }
    const connDist: Record<number, number> = { 0: 0, 1: 0, 2: 0 }
    const origDist: Record<number, number> = { 0: 0, 1: 0 }

    let whyFailures = 0
    let metaFailures = 0
    let taxFailures = 0
    let connFailures = 0
    let origFailures = 0

    let withPurpose = 0
    let withMetadata = 0
    let withFunctionalTags = 0
    let withTwoLinks = 0
    let withSynthesis = 0

    const issueCounter = new Map<string, number>()

    for (const result of results) {
      const { breakdown } = result.nvqScore

      // Update distributions
      whyDist[breakdown.why.score] = (whyDist[breakdown.why.score] || 0) + 1
      metaDist[breakdown.metadata.score] = (metaDist[breakdown.metadata.score] || 0) + 1
      taxDist[breakdown.taxonomy.score] = (taxDist[breakdown.taxonomy.score] || 0) + 1
      connDist[breakdown.connectivity.score] = (connDist[breakdown.connectivity.score] || 0) + 1
      origDist[breakdown.originality.score] = (origDist[breakdown.originality.score] || 0) + 1

      // Count failures
      if (breakdown.why.score === 0) whyFailures++
      if (breakdown.metadata.score === 0) metaFailures++
      if (breakdown.taxonomy.score === 0) taxFailures++
      if (breakdown.connectivity.score === 0) connFailures++
      if (breakdown.originality.score === 0) origFailures++

      // Count presence of key features
      if (breakdown.why.rawStatement) withPurpose++
      if (breakdown.metadata.fieldsPresent >= 3) withMetadata++
      if (breakdown.taxonomy.functionalTags > 0) withFunctionalTags++
      if (breakdown.connectivity.meetsMinimum) withTwoLinks++
      if (breakdown.originality.hasOriginalInsight) withSynthesis++

      // Count issues
      for (const issue of result.issues) {
        const key = `${result.nvqScore.failingComponents[0] || 'general'}:${issue}`
        issueCounter.set(key, (issueCounter.get(key) || 0) + 1)
      }
    }

    const n = results.length

    // Get top failures
    const topFailures = [...issueCounter.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, count]) => {
        const [component, issue] = key.split(':')
        return { component, issue, count }
      })

    return {
      meanNVQ: scores.reduce((a, b) => a + b, 0) / n,
      medianNVQ: sortedScores[Math.floor(n / 2)],
      minNVQ: sortedScores[0],
      maxNVQ: sortedScores[n - 1],
      passingRate: results.filter((r) => r.nvqScore.passing).length / n,

      whyFailureRate: whyFailures / n,
      metadataFailureRate: metaFailures / n,
      taxonomyFailureRate: taxFailures / n,
      connectivityFailureRate: connFailures / n,
      originalityFailureRate: origFailures / n,

      whyScoreDistribution: whyDist,
      metadataScoreDistribution: metaDist,
      taxonomyScoreDistribution: taxDist,
      connectivityScoreDistribution: connDist,
      originalityScoreDistribution: origDist,

      totalNotesEvaluated: n,
      notesWithPurpose: withPurpose,
      notesWithCompleteMetadata: withMetadata,
      notesWithFunctionalTags: withFunctionalTags,
      notesWithTwoLinks: withTwoLinks,
      notesThatAreSynthesis: withSynthesis,

      topFailures,
    }
  }

  private emptyMetrics(): NoteQualityMetrics {
    return {
      meanNVQ: 0,
      medianNVQ: 0,
      minNVQ: 0,
      maxNVQ: 0,
      passingRate: 0,
      whyFailureRate: 0,
      metadataFailureRate: 0,
      taxonomyFailureRate: 0,
      connectivityFailureRate: 0,
      originalityFailureRate: 0,
      whyScoreDistribution: { 0: 0, 1: 0, 2: 0, 3: 0 },
      metadataScoreDistribution: { 0: 0, 1: 0, 2: 0 },
      taxonomyScoreDistribution: { 0: 0, 1: 0, 2: 0 },
      connectivityScoreDistribution: { 0: 0, 1: 0, 2: 0 },
      originalityScoreDistribution: { 0: 0, 1: 0 },
      totalNotesEvaluated: 0,
      notesWithPurpose: 0,
      notesWithCompleteMetadata: 0,
      notesWithFunctionalTags: 0,
      notesWithTwoLinks: 0,
      notesThatAreSynthesis: 0,
      topFailures: [],
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createNVQEvaluator(config: NVQEvaluatorConfig): NVQEvaluator {
  return new NVQEvaluator(config)
}
