/**
 * NVQ Refinement Prompts
 *
 * Prompts for improving notes that fail NVQ quality checks.
 * Used in the extraction feedback loop when notes score < 7/10.
 */

import type { NVQScore, NVQExtractedNote } from '@/lib/nvq'

// ============================================================================
// Types
// ============================================================================

export interface RefinementContext {
  /** User's goals for purpose statement linking */
  goals: Array<{ title: string; whyRoot: string }>
  /** Available MOCs for upward links */
  mocs: string[]
  /** Available projects for upward links */
  projects: string[]
  /** Related notes for sideways links */
  relatedNotes: Array<{ title: string; content: string }>
}

// ============================================================================
// Refinement Prompt Builder
// ============================================================================

/**
 * Build a prompt to refine a note that failed NVQ checks
 */
export function buildRefinementPrompt(
  note: NVQExtractedNote,
  nvqScore: NVQScore,
  issues: string[],
  context: RefinementContext
): string {
  const issuesList = issues.map((i) => `- ${i}`).join('\n')
  const scoreBreakdown = formatScoreBreakdown(nvqScore)

  return `This note scored ${nvqScore.total}/10 on the NVQ (Note Vitality Quotient) and needs improvement to reach the 7/10 passing threshold.

## ORIGINAL NOTE

**Title:** ${note.title}

**Purpose Statement:** ${note.purposeStatement || 'MISSING - This is required!'}

**Content:** ${note.content}

**Status:** ${note.status || 'MISSING'}
**Type:** ${note.noteType || 'MISSING'}
**Stakeholder:** ${note.stakeholder || 'MISSING'}
**Project:** ${note.project || 'None specified'}

**Tags:** ${note.tags.length > 0 ? note.tags.join(', ') : 'MISSING'}

**Connections:** ${formatConnections(note.connections)}

## SCORE BREAKDOWN
${scoreBreakdown}

## ISSUES TO FIX
${issuesList}

## AVAILABLE CONTEXT FOR IMPROVEMENT
${buildContextSection(context)}

## YOUR TASK

Improve this note to score >= 7/10 while preserving the core idea. You MUST:

${generateFixInstructions(nvqScore)}

Return the IMPROVED note in this exact JSON format:
{
  "title": "...",
  "purposeStatement": "I am keeping this because...",
  "content": "...",
  "status": "Seed" | "Sapling" | "Evergreen",
  "noteType": "Logic" | "Technical" | "Reflection",
  "stakeholder": "Self" | "Future Users" | "AI Agent",
  "projectLink": "[[Project/...]]" | null,
  "tags": ["#task/...", "#skill/...", ...],
  "connections": [
    { "targetTitle": "[[MOC/...]]", "type": "upward", "strength": 0.9 },
    { "targetTitle": "Related Concept", "type": "sideways", "strength": 0.8 }
  ]
}

IMPORTANT:
- Do NOT change the core idea of the note
- Do NOT remove valuable content
- Focus ONLY on improving the failing components
- Ensure ALL required fields are present`
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatScoreBreakdown(score: NVQScore): string {
  const { breakdown } = score
  return `
| Component    | Score | Max | Status |
|--------------|-------|-----|--------|
| Why          | ${breakdown.why.score} | 3 | ${breakdown.why.score === 0 ? 'FAILING' : breakdown.why.score < 2 ? 'Needs work' : 'OK'} |
| Metadata     | ${breakdown.metadata.score} | 2 | ${breakdown.metadata.score === 0 ? 'FAILING' : 'OK'} |
| Taxonomy     | ${breakdown.taxonomy.score} | 2 | ${breakdown.taxonomy.score === 0 ? 'FAILING' : breakdown.taxonomy.score === 1 ? 'Needs work' : 'OK'} |
| Connectivity | ${breakdown.connectivity.score} | 2 | ${breakdown.connectivity.score === 0 ? 'FAILING' : breakdown.connectivity.score === 1 ? 'Needs work' : 'OK'} |
| Originality  | ${breakdown.originality.score} | 1 | ${breakdown.originality.score === 0 ? 'FAILING' : 'OK'} |
| **TOTAL**    | **${score.total}** | **10** | ${score.passing ? 'PASSING' : 'FAILING'} |`
}

function formatConnections(connections: NVQExtractedNote['connections']): string {
  if (connections.length === 0) return 'NONE - At least 2 required!'
  return connections.map((c) => `${c.targetTitle} (${c.type}, ${c.strength})`).join(', ')
}

function buildContextSection(context: RefinementContext): string {
  const sections: string[] = []

  if (context.goals.length > 0) {
    sections.push(`**User Goals (link in purpose statement):**
${context.goals.map((g) => `- "${g.title}": ${g.whyRoot}`).join('\n')}`)
  }

  if (context.mocs.length > 0) {
    sections.push(`**Available MOCs (for upward links):**
${context.mocs.map((m) => `- [[MOC/${m}]]`).join('\n')}`)
  }

  if (context.projects.length > 0) {
    sections.push(`**Available Projects (for upward links):**
${context.projects.map((p) => `- [[Project/${p}]]`).join('\n')}`)
  }

  if (context.relatedNotes.length > 0) {
    sections.push(`**Related Notes (for sideways links):**
${context.relatedNotes
      .slice(0, 10)
      .map((n) => `- "${n.title}"`)
      .join('\n')}`)
  }

  return sections.length > 0 ? sections.join('\n\n') : 'No additional context available.'
}

function generateFixInstructions(score: NVQScore): string {
  const instructions: string[] = []

  if (score.breakdown.why.score === 0) {
    instructions.push(`1. **Fix Purpose Statement (Why):**
   - Add a first-person statement: "I am keeping this because..."
   - Link it to one of the user's goals
   - Make it actionable (explain what you can DO with this knowledge)`)
  } else if (score.breakdown.why.score < 3) {
    if (!score.breakdown.why.hasFirstPerson) {
      instructions.push(`1. **Improve Purpose Statement:** Add first-person language ("I am keeping this because...")`)
    }
    if (!score.breakdown.why.linksToPersonalGoal) {
      instructions.push(`1. **Link to Goal:** Connect the purpose statement to a user goal`)
    }
    if (!score.breakdown.why.isActionable) {
      instructions.push(`1. **Make Actionable:** Explain how this knowledge can be applied`)
    }
  }

  if (score.breakdown.metadata.score === 0) {
    instructions.push(`2. **Add Missing Metadata:**
   - status: Choose "Seed", "Sapling", or "Evergreen"
   - noteType: Choose "Logic", "Technical", or "Reflection"
   - stakeholder: Choose "Self", "Future Users", or "AI Agent"
   - projectLink: Add if relevant`)
  } else if (score.breakdown.metadata.fieldsPresent < 3) {
    const missing: string[] = []
    if (!score.breakdown.metadata.hasStatus) missing.push('status')
    if (!score.breakdown.metadata.hasType) missing.push('noteType')
    if (!score.breakdown.metadata.hasStakeholder) missing.push('stakeholder')
    instructions.push(`2. **Add Missing Metadata Fields:** ${missing.join(', ')}`)
  }

  if (score.breakdown.taxonomy.score === 0) {
    instructions.push(`3. **Fix Tags:**
   - Replace topic tags with functional tags
   - Use prefixes: #task/, #skill/, #insight/, #project/
   - Examples: "#task/implement", "#skill/accessibility", "#insight/core"`)
  } else if (score.breakdown.taxonomy.topicTags > 0) {
    instructions.push(`3. **Convert Topic Tags:** Replace single-word tags with functional prefixed tags`)
  }

  if (score.breakdown.connectivity.score === 0) {
    instructions.push(`4. **Add Required Links:**
   - Add an UPWARD link to a MOC or Project (e.g., "[[MOC/Accessibility]]")
   - Add a SIDEWAYS link to a related concept`)
  } else if (!score.breakdown.connectivity.meetsMinimum) {
    if (!score.breakdown.connectivity.hasUpwardLink) {
      instructions.push(`4. **Add Upward Link:** Connect to a MOC or Project`)
    }
    if (!score.breakdown.connectivity.hasSidewaysLink) {
      instructions.push(`4. **Add Sideways Link:** Connect to a related concept`)
    }
  }

  if (score.breakdown.originality.score === 0) {
    instructions.push(`5. **Add Original Synthesis:**
   - Add personal interpretation: "I realized...", "This means for me..."
   - Remove or contextualize pure Wikipedia-style facts
   - Connect to your specific situation/project`)
  }

  return instructions.length > 0 ? instructions.join('\n\n') : 'Review all components and ensure quality standards are met.'
}

// ============================================================================
// Quick Fix Suggestions
// ============================================================================

/**
 * Generate quick fix suggestions for a failing note
 */
export function generateQuickFixSuggestions(score: NVQScore): string[] {
  const suggestions: string[] = []

  if (score.breakdown.why.score === 0) {
    suggestions.push('Add "I am keeping this because..." at the start of the purpose statement')
  }

  if (score.breakdown.metadata.fieldsPresent < 3) {
    suggestions.push('Add missing metadata: status, noteType, or stakeholder')
  }

  if (score.breakdown.taxonomy.topicTags > 0) {
    suggestions.push('Convert topic tags (#accessibility) to functional tags (#skill/accessibility)')
  }

  if (!score.breakdown.connectivity.meetsMinimum) {
    suggestions.push('Add both an upward link (to MOC/Project) and a sideways link (to related concept)')
  }

  if (score.breakdown.originality.isWikipediaFact) {
    suggestions.push('Add personal interpretation to factual content')
  }

  return suggestions
}
