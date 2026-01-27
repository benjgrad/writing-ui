/**
 * NVQ-Aware Extraction Prompts
 *
 * Extraction prompts that enforce Note Vitality Quotient (NVQ) quality standards.
 * Notes must score >= 7/10 on the NVQ scorecard to pass.
 */

import type { NoteStatus, NoteType, Stakeholder } from '@/lib/nvq'

// ============================================================================
// Types
// ============================================================================

export interface NVQExtractionContext {
  /** Related existing notes for consolidation and sideways links */
  relatedNotes: Array<{ id: string; title: string; content: string }>
  /** User's existing tag vocabulary */
  commonTags: string[]
  /** User's active goals for purpose statement linking */
  userGoals: Array<{ title: string; whyRoot: string }>
  /** Available MOCs (Maps of Content) for upward links */
  availableMOCs: string[]
  /** Available projects for upward links */
  availableProjects: string[]
}

export interface NVQExtractedNoteSchema {
  title: string
  purposeStatement: string
  content: string
  status: NoteStatus
  noteType: NoteType
  stakeholder: Stakeholder
  projectLink: string | null
  tags: string[]
  connections: Array<{
    targetTitle: string
    type: 'upward' | 'sideways' | 'related' | 'supports' | 'contradicts' | 'extends' | 'example_of'
    strength: number
  }>
  consolidate_with: string | null
  merged_content: string | null
}

// ============================================================================
// Main NVQ Extraction Prompt Builder
// ============================================================================

/**
 * Build an NVQ-aware extraction prompt with context
 */
export function buildNVQExtractionPrompt(context: NVQExtractionContext): string {
  return `You are an expert Zettelkasten note extractor. Extract atomic notes that meet STRICT quality standards (NVQ >= 7/10).

## QUALITY REQUIREMENTS (EVERY note MUST have ALL of these)

### 1. PURPOSE STATEMENT (REQUIRED - 3 points possible)
Start each note explaining WHY you're keeping it:
- MUST be first-person: "I am keeping this because..."
- MUST link to a user goal when relevant
- MUST explain how the note is actionable/useful

### 2. METADATA FIELDS (REQUIRED - need at least 3 of 4)
- status: "Seed" (raw info), "Sapling" (synthesized), or "Evergreen" (fundamental truth)
- noteType: "Logic" (why/reasoning), "Technical" (how-to), or "Reflection" (self-observation)
- stakeholder: Who benefits from this note? Common: "Self", "Future Users", "AI Agent", but can be ANY specific person, team, or group mentioned in context (e.g., "Design Team", "John", "Product")
- projectLink: Link to a project if relevant (format: "[[Project/Name]]")

### 3. FUNCTIONAL TAGS (REQUIRED - use instead of topic tags)
Use action-based tags with prefixes, NOT generic topic words:
- "#task/research", "#task/implement", "#task/review", "#decision/technical"
- "#skill/typescript", "#skill/accessibility", "#skill/ux"
- "#insight/core", "#insight/stale", "#insight/emerging"
- "#project/writing-ui", "#project/[name]"

FORBIDDEN: Single-word topic tags like #accessibility, #react, #testing, #api, #design

### 4. MEANINGFUL CONNECTIONS (REQUIRED - at least 2)
Every note MUST have at least 2 connections with SPECIFIC relationship types:

**Upward links** (to MOCs or Projects):
- "upward": hierarchical parent (e.g., "[[MOC/Accessibility]]")

**Sideways links** (to related concepts - USE SPECIFIC TYPES):
- "supports": this note provides evidence/reasoning FOR the target
- "contradicts": this note provides evidence/reasoning AGAINST the target (VALUABLE - use when ideas conflict!)
- "extends": this note builds upon or elaborates the target
- "example_of": this note is a concrete instance of the target concept
- "sideways": loosely related (USE SPARINGLY - prefer specific types above)

IMPORTANT: "contradicts" connections are HIGHLY VALUABLE for critical thinking. When an idea challenges, questions, or provides counter-evidence to another concept, USE "contradicts".

### 5. ORIGINAL SYNTHESIS (REQUIRED)
Notes MUST contain personal interpretation, not just facts:
- Include phrases like "I realized...", "This means for me...", "My takeaway..."
- Connect to your specific context/project
- AVOID Wikipedia-style generic definitions

${buildContextSection(context)}

## OUTPUT FORMAT

Respond with valid JSON:
{
  "notes": [
    {
      "title": "Clear, descriptive title (max 10 words)",
      "purposeStatement": "I am keeping this because [specific reason linked to goal]...",
      "content": "The atomic idea with original synthesis. I realized that... This means for my project...",
      "status": "Seed" | "Sapling" | "Evergreen",
      "noteType": "Logic" | "Technical" | "Reflection",
      "stakeholder": "Self" | "Future Users" | "AI Agent",
      "projectLink": "[[Project/Name]]" or null,
      "tags": ["#task/implement", "#skill/accessibility", "#project/writing-ui"],
      "connections": [
        { "targetTitle": "[[MOC/Accessibility]]", "type": "upward", "strength": 0.9 },
        { "targetTitle": "Progressive Enhancement", "type": "supports", "strength": 0.85 },
        { "targetTitle": "Move Fast and Break Things", "type": "contradicts", "strength": 0.8 }
      ],
      "consolidate_with": null,
      "merged_content": null
    }
  ]
}

## CRITICAL RULES

1. QUALITY OVER QUANTITY: If an idea doesn't warrant a quality note, DO NOT extract it.
2. NO EMPTY FIELDS: Every note must have purposeStatement, status, noteType, stakeholder, and at least 2 tags.
3. NO TOPIC TAGS: Tags must have prefixes (#task/, #skill/, #insight/, #project/).
4. MEANINGFUL CONNECTIONS: At least 2 connections. Use specific types (supports, contradicts, extends, example_of) over generic "sideways" or "related".
5. CONTRADICTIONS ARE GOLD: When ideas conflict with existing concepts, USE "contradicts" - these connections spark critical thinking!
6. CONSOLIDATION: If a note substantially overlaps with an existing note, set "consolidate_with" to that note's title.

If the text doesn't contain extractable atomic ideas that can meet these standards, return: {"notes": []}`
}

// ============================================================================
// Context Section Builder
// ============================================================================

function buildContextSection(context: NVQExtractionContext): string {
  const sections: string[] = []

  if (context.userGoals.length > 0) {
    sections.push(`
## USER'S GOALS (link to these in purpose statements)
${context.userGoals.map((g) => `- "${g.title}": ${g.whyRoot || 'No why-root defined'}`).join('\n')}`)
  }

  if (context.availableMOCs.length > 0) {
    sections.push(`
## AVAILABLE MOCs (use for UPWARD links)
${context.availableMOCs.map((m) => `- [[MOC/${m}]]`).join('\n')}`)
  }

  if (context.availableProjects.length > 0) {
    sections.push(`
## AVAILABLE PROJECTS (use for UPWARD links)
${context.availableProjects.map((p) => `- [[Project/${p}]]`).join('\n')}`)
  }

  if (context.relatedNotes.length > 0) {
    sections.push(`
## EXISTING NOTES (use for SIDEWAYS links, check for consolidation)
${context.relatedNotes
  .slice(0, 15)
  .map((n) => `- "${n.title}": ${n.content.slice(0, 100)}${n.content.length > 100 ? '...' : ''}`)
  .join('\n')}`)
  }

  if (context.commonTags.length > 0) {
    // Filter to show only functional tags
    const functionalTags = context.commonTags.filter((t) => t.includes('/'))
    if (functionalTags.length > 0) {
      sections.push(`
## EXISTING FUNCTIONAL TAGS (prefer these when applicable)
${functionalTags.slice(0, 20).join(', ')}`)
    }
  }

  return sections.join('\n')
}

// ============================================================================
// Simplified Prompt (without context)
// ============================================================================

/**
 * Simple NVQ extraction prompt without user context
 * Use when context is not available
 */
export const SIMPLE_NVQ_EXTRACTION_PROMPT = buildNVQExtractionPrompt({
  relatedNotes: [],
  commonTags: [],
  userGoals: [],
  availableMOCs: [],
  availableProjects: [],
})

// ============================================================================
// JSON Schema for Validation
// ============================================================================

export const NVQ_EXTRACTION_JSON_SCHEMA = {
  type: 'object',
  properties: {
    notes: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          'title',
          'purposeStatement',
          'content',
          'status',
          'noteType',
          'stakeholder',
          'tags',
          'connections',
        ],
        properties: {
          title: { type: 'string', maxLength: 100 },
          purposeStatement: { type: 'string', minLength: 20 },
          content: { type: 'string', minLength: 50 },
          status: { type: 'string', enum: ['Seed', 'Sapling', 'Evergreen'] },
          noteType: { type: 'string', enum: ['Logic', 'Technical', 'Reflection'] },
          stakeholder: { type: 'string', minLength: 1 },
          projectLink: { type: ['string', 'null'] },
          tags: {
            type: 'array',
            items: { type: 'string', pattern: '^#[a-z]+/' },
            minItems: 2,
            maxItems: 5,
          },
          connections: {
            type: 'array',
            items: {
              type: 'object',
              required: ['targetTitle', 'type', 'strength'],
              properties: {
                targetTitle: { type: 'string' },
                type: {
                  type: 'string',
                  enum: ['upward', 'sideways', 'related', 'supports', 'contradicts', 'extends', 'example_of'],
                },
                strength: { type: 'number', minimum: 0, maximum: 1 },
              },
            },
            minItems: 2,
          },
          consolidate_with: { type: ['string', 'null'] },
          merged_content: { type: ['string', 'null'] },
        },
      },
    },
  },
  required: ['notes'],
}
