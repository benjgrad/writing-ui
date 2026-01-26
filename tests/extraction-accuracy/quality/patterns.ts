/**
 * Regex Patterns for NVQ Evaluation
 *
 * Patterns for detecting quality components in extracted notes.
 */

// ============================================================================
// Purpose Statement Patterns
// ============================================================================

export const PURPOSE_PATTERNS = {
  /** Matches first-person purpose statements */
  FIRST_PERSON: /I am keeping this because|I need this|This helps me|I'm keeping this|I want to remember/i,

  /** Matches actionable/utility language */
  ACTIONABLE:
    /(will help|enables|allows|supports|crucial for|vital for|important for|essential for|necessary for|so that I can|in order to|helps me)/i,

  /** Matches goal-linking language */
  GOAL_LINK:
    /(my goal|my project|for the|toward|working on|building|creating|developing|implementing|to achieve|related to my)/i,

  /** Common purpose statement starters */
  PURPOSE_STARTERS: [
    /^I am keeping this because/i,
    /^Purpose:/i,
    /^Why:/i,
    /^I need this/i,
    /^This is important because/i,
  ],
} as const

// ============================================================================
// Metadata Patterns
// ============================================================================

export const METADATA_PATTERNS = {
  // Status patterns
  STATUS_SEED: /status:\s*seed|maturity:\s*seed|\bseed\b.*note/i,
  STATUS_SAPLING: /status:\s*sapling|maturity:\s*sapling|\bsapling\b.*note/i,
  STATUS_EVERGREEN: /status:\s*evergreen|maturity:\s*evergreen|\bevergreen\b.*note/i,

  // Type patterns
  TYPE_LOGIC: /type:\s*logic|note.?type:\s*logic|\bwhy\b.*type/i,
  TYPE_TECHNICAL: /type:\s*technical|note.?type:\s*technical|\bhow\b.*type/i,
  TYPE_REFLECTION: /type:\s*reflection|note.?type:\s*reflection|\bself.?observation/i,

  // Stakeholder patterns
  STAKEHOLDER_SELF: /stakeholder:\s*self|audience:\s*self|for:\s*myself/i,
  STAKEHOLDER_USERS: /stakeholder:\s*(future\s*)?users|audience:\s*users|for:\s*users/i,
  STAKEHOLDER_AI: /stakeholder:\s*ai(\s*agent)?|audience:\s*ai|for:\s*ai/i,

  // Project link patterns
  PROJECT_WIKILINK: /\[\[Project[/:]([^\]]+)\]\]/i,
  PROJECT_INLINE: /project:\s*([^\n,]+)/i,
  PROJECT_REFERENCE: /for (the |my )?([A-Z][a-zA-Z\s]+) project/i,
} as const

// ============================================================================
// Tag Patterns
// ============================================================================

export const TAG_PATTERNS = {
  /** Action tags: #task/*, #decision/* */
  ACTION: /^(task|decision)\//,

  /** Skill tags: #skill/* */
  SKILL: /^skill\//,

  /** Evolution tags: #insight/* */
  EVOLUTION: /^insight\//,

  /** Project-specific tags: #UI/*, #Project/* */
  PROJECT: /^(ui|project)\//i,

  /** Generic hashtag pattern */
  HASHTAG: /#([a-zA-Z][a-zA-Z0-9-_/]*)/g,

  /** Common topic tags that should be avoided */
  TOPIC_TAGS: new Set([
    'accessibility',
    'ai',
    'api',
    'architecture',
    'authentication',
    'backend',
    'bug',
    'code',
    'database',
    'design',
    'development',
    'documentation',
    'feature',
    'frontend',
    'idea',
    'improvement',
    'infrastructure',
    'integration',
    'javascript',
    'journaling',
    'learning',
    'meeting',
    'note',
    'performance',
    'planning',
    'productivity',
    'programming',
    'react',
    'reference',
    'research',
    'security',
    'speech',
    'testing',
    'typescript',
    'ui',
    'ux',
    'writing',
  ]),
} as const

// ============================================================================
// Link Patterns
// ============================================================================

export const LINK_PATTERNS = {
  /** Wikilink pattern [[Title]] */
  WIKILINK: /\[\[([^\]]+)\]\]/g,

  /** MOC (Map of Content) links */
  MOC: /\[\[(MOC|Map of Content)[/:]?([^\]]*)\]\]/i,

  /** Project links */
  PROJECT: /\[\[Project[/:]([^\]]+)\]\]/i,

  /** Logic/concept links */
  LOGIC: /\[\[(Logic|Concept)[/:]([^\]]+)\]\]/i,

  /** Entity links */
  ENTITY: /\[\[(Entity|Tool|API)[/:]([^\]]+)\]\]/i,

  /** Note reference links */
  NOTE: /\[\[Note[/:]([^\]]+)\]\]/i,

  /** Reference links (external) */
  REFERENCE: /\[\[(Reference|Source)[/:]([^\]]+)\]\]/i,
} as const

// ============================================================================
// Originality/Synthesis Patterns
// ============================================================================

export const SYNTHESIS_PATTERNS = {
  /** Indicators of original thinking */
  ORIGINAL_INSIGHT: [
    /I (think|believe|realized|discovered|noticed|found|learned)/i,
    /my (interpretation|understanding|take|view|insight|conclusion)/i,
    /this (suggests|implies|means|tells me|indicates|reveals)/i,
    /the key (insight|takeaway|lesson|point) is/i,
    /for (my|our) (use case|project|context|situation)/i,
    /(decision|lesson learned|takeaway|conclusion):/i,
    /I (decided|chose|concluded|determined)/i,
    /what this means for/i,
    /in my experience/i,
    /I've (noticed|observed|seen)/i,
  ],

  /** Indicators of Wikipedia-style facts (should fail) */
  WIKIPEDIA_FACT: [
    /according to (wikipedia|the documentation|the official)/i,
    /is defined as/i,
    /was (invented|created|founded|developed) in \d{4}/i,
    /\bis a\b.*\bthat\b/i, // "X is a Y that does Z" pattern
    /^(The|A|An) [A-Z][a-z]+ is/i, // Definition pattern
    /officially (released|announced|launched)/i,
  ],

  /** Quotation patterns (high quote ratio = low originality) */
  QUOTATION: [
    /"[^"]{20,}"/g, // Quoted text longer than 20 chars
    />[^\n]{20,}/g, // Blockquotes
    /```[\s\S]*?```/g, // Code blocks (count separately)
  ],
} as const

// ============================================================================
// Content Quality Patterns
// ============================================================================

export const CONTENT_PATTERNS = {
  /** Minimum content length for a quality note */
  MIN_CONTENT_LENGTH: 50,

  /** Maximum content length (notes should be atomic) */
  MAX_CONTENT_LENGTH: 1000,

  /** Pattern for detecting multiple distinct ideas (note should be split) */
  MULTIPLE_IDEAS: /\n\n(?=[A-Z])|(?:First|Second|Third|Additionally|Furthermore|Moreover),/g,

  /** Pattern for incomplete notes */
  INCOMPLETE: /(TODO|FIXME|TBD|WIP|to be continued|more later)/i,
} as const

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract all matches for a pattern from text
 */
export function extractMatches(text: string, pattern: RegExp): string[] {
  const matches: string[] = []
  const regex = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g')
  let match
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1] || match[0])
  }
  return matches
}

/**
 * Count how many patterns match the text
 */
export function countPatternMatches(text: string, patterns: RegExp[]): number {
  return patterns.filter((p) => p.test(text)).length
}

/**
 * Check if a tag is a topic tag (not functional)
 */
export function isTopicTag(tag: string): boolean {
  const normalized = tag.toLowerCase().replace(/^#/, '').replace(/[-_]/g, '')
  return TAG_PATTERNS.TOPIC_TAGS.has(normalized)
}

/**
 * Classify a tag by category
 */
export function classifyTag(tag: string): {
  category: 'action' | 'skill' | 'evolution' | 'project' | null
  action: string | null
  isTopicTag: boolean
} {
  const normalized = tag.toLowerCase().replace(/^#/, '')

  if (TAG_PATTERNS.ACTION.test(normalized)) {
    const parts = normalized.split('/')
    return { category: 'action', action: parts[1] || null, isTopicTag: false }
  }

  if (TAG_PATTERNS.SKILL.test(normalized)) {
    return { category: 'skill', action: normalized.replace(/^skill\//, ''), isTopicTag: false }
  }

  if (TAG_PATTERNS.EVOLUTION.test(normalized)) {
    return { category: 'evolution', action: normalized.replace(/^insight\//, ''), isTopicTag: false }
  }

  if (TAG_PATTERNS.PROJECT.test(normalized)) {
    const parts = normalized.split('/')
    return { category: 'project', action: parts[1] || null, isTopicTag: false }
  }

  return { category: null, action: null, isTopicTag: isTopicTag(tag) || !normalized.includes('/') }
}

/**
 * Extract project name from various formats
 */
export function extractProjectName(text: string): string | null {
  // Try wikilink format first
  const wikiMatch = text.match(METADATA_PATTERNS.PROJECT_WIKILINK)
  if (wikiMatch) return wikiMatch[1].trim()

  // Try inline format
  const inlineMatch = text.match(METADATA_PATTERNS.PROJECT_INLINE)
  if (inlineMatch) return inlineMatch[1].trim()

  // Try reference format
  const refMatch = text.match(METADATA_PATTERNS.PROJECT_REFERENCE)
  if (refMatch) return refMatch[2].trim()

  return null
}

/**
 * Extract all wikilinks from text
 */
export function extractWikilinks(text: string): string[] {
  return extractMatches(text, LINK_PATTERNS.WIKILINK)
}

/**
 * Calculate synthesis ratio based on original vs quoted content
 */
export function calculateSynthesisRatio(text: string): number {
  const totalLength = text.length
  if (totalLength === 0) return 0

  // Remove quoted content to get original content length
  let quotedLength = 0
  for (const pattern of SYNTHESIS_PATTERNS.QUOTATION) {
    const matches = text.match(pattern) || []
    quotedLength += matches.reduce((sum, m) => sum + m.length, 0)
  }

  const originalLength = totalLength - quotedLength
  return originalLength / totalLength
}
