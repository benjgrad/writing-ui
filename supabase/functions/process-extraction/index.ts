// Deno runtime Edge Function for Supabase
// Processes extraction queue items and creates atomic notes
// NVQ-integrated version: enforces quality standards with scoring and refinement

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

// ============================================================================
// Types
// ============================================================================

type NoteStatus = 'Seed' | 'Sapling' | 'Evergreen'
type NoteType = 'Logic' | 'Technical' | 'Reflection'
// Stakeholder is flexible - can be any person/group name
type Stakeholder = string

interface ExtractedNote {
  title: string
  purposeStatement: string | null
  content: string
  status: NoteStatus | null
  noteType: NoteType | null
  stakeholder: Stakeholder | null
  projectLink: string | null
  consolidate_with: string | null
  merged_content: string | null
  tags: string[]
  connections: Array<{
    targetTitle: string
    type: string
    strength: number
  }>
}

interface NVQScore {
  total: number
  breakdown: {
    why: number
    metadata: number
    taxonomy: number
    connectivity: number
    originality: number
  }
  passing: boolean
  failingComponents: string[]
  issues: string[]
}

interface ExistingNote {
  id: string
  title: string
  content: string
}

interface UserGoal {
  id: string
  title: string
  why_root: string | null
}

interface QueueItem {
  id: string
  user_id: string
  source_type: string
  source_id: string
  content_snapshot: string
  attempts: number
  max_attempts: number
}

interface ExtractionContext {
  relatedNotes: ExistingNote[]
  commonTags: string[]
  userGoals: UserGoal[]
  availableMOCs: string[]
  availableProjects: string[]
}

// ============================================================================
// NVQ Evaluator (Embedded - can't import from src/lib in edge function)
// ============================================================================

const PASSING_THRESHOLD = 7

// Stop words for keyword extraction
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
  'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
  'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
  'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here',
  'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or',
  'because', 'until', 'while', 'about', 'against', 'this', 'that', 'these',
  'those', 'what', 'which', 'who', 'whom', 'its', 'itself', 'they', 'them',
  'their', 'theirs', 'themselves', 'you', 'your', 'yours', 'yourself', 'yourselves',
  'really', 'think', 'feel', 'like', 'want', 'going', 'know', 'make', 'getting'
])

// Topic tags to avoid
const TOPIC_TAGS = new Set([
  'accessibility', 'ai', 'api', 'architecture', 'authentication', 'backend',
  'bug', 'code', 'database', 'design', 'development', 'documentation',
  'feature', 'frontend', 'idea', 'improvement', 'infrastructure', 'integration',
  'javascript', 'journaling', 'learning', 'meeting', 'note', 'performance',
  'planning', 'productivity', 'programming', 'react', 'reference', 'research',
  'security', 'speech', 'testing', 'typescript', 'ui', 'ux', 'writing'
])

/**
 * Evaluate a note against NVQ criteria
 */
function evaluateNVQ(
  note: ExtractedNote,
  context: { mocs: string[]; projects: string[]; goals: UserGoal[] }
): NVQScore {
  const issues: string[] = []
  const failingComponents: string[] = []

  // 1. Score WHY component (0-3)
  let whyScore = 0
  const purposeContent = `${note.title} ${note.content} ${note.purposeStatement || ''}`

  // First person check
  const firstPersonPattern = /I am keeping this because|I need this|This helps me|I'm keeping this|I want to remember/i
  if (firstPersonPattern.test(note.purposeStatement || '') || firstPersonPattern.test(note.content)) {
    whyScore += 1
  } else {
    issues.push('Missing first-person purpose statement')
  }

  // Goal link check
  const linksToGoal = context.goals.some(g =>
    purposeContent.toLowerCase().includes(g.title.toLowerCase()) ||
    (g.why_root && purposeContent.toLowerCase().includes(g.why_root.toLowerCase()))
  )
  if (linksToGoal) {
    whyScore += 1
  } else {
    issues.push('Purpose statement does not link to a personal goal')
  }

  // Actionable check
  const actionablePattern = /(will help|enables|allows|supports|crucial for|vital for|important for|essential for|necessary for|so that I can|in order to|helps me)/i
  if (actionablePattern.test(note.purposeStatement || '') || actionablePattern.test(note.content)) {
    whyScore += 1
  } else {
    issues.push('Purpose statement is not actionable')
  }

  if (whyScore === 0) failingComponents.push('why')

  // 2. Score METADATA component (0-2)
  let metadataFieldsPresent = 0
  if (note.status && ['Seed', 'Sapling', 'Evergreen'].includes(note.status)) metadataFieldsPresent++
  if (note.noteType && ['Logic', 'Technical', 'Reflection'].includes(note.noteType)) metadataFieldsPresent++
  if (note.stakeholder && note.stakeholder.trim().length > 0) metadataFieldsPresent++
  if (note.projectLink) metadataFieldsPresent++

  let metadataScore = 0
  if (metadataFieldsPresent >= 3) metadataScore = 2
  else if (metadataFieldsPresent >= 2) metadataScore = 1
  else issues.push('Missing metadata fields (Status, Type, Stakeholder)')

  if (metadataScore === 0) failingComponents.push('metadata')

  // 3. Score TAXONOMY component (0-2)
  const functionalTags = note.tags.filter(t => {
    const normalized = t.toLowerCase().replace(/^#/, '')
    return normalized.includes('/')
  })
  const topicTags = note.tags.filter(t => {
    const normalized = t.toLowerCase().replace(/^#/, '').replace(/[-_]/g, '')
    return TOPIC_TAGS.has(normalized) || !t.includes('/')
  })

  let taxonomyScore = 0
  if (functionalTags.length > 0 && topicTags.length === 0) {
    taxonomyScore = 2
  } else if (functionalTags.length > 0) {
    taxonomyScore = 1
  } else {
    issues.push('Too many topic tags, not enough functional tags')
  }

  if (note.tags.length > 5) {
    taxonomyScore = Math.max(0, taxonomyScore - 1)
    issues.push('Exceeds 5 tag limit - note may need to be split')
  }

  if (taxonomyScore === 0) failingComponents.push('taxonomy')

  // 4. Score CONNECTIVITY component (0-2)
  const hasUpwardLink = note.connections.some(c => {
    const target = c.targetTitle.toLowerCase()
    return (
      target.includes('moc') ||
      target.includes('project/') ||
      context.mocs.some(m => target.includes(m.toLowerCase())) ||
      context.projects.some(p => target.includes(p.toLowerCase()))
    )
  })

  const hasSidewaysLink = note.connections.some(c => {
    const target = c.targetTitle.toLowerCase()
    return (
      !target.includes('moc') &&
      !target.includes('project/') &&
      c.type !== 'example_of'
    )
  })

  let connectivityScore = 0
  if (hasUpwardLink && hasSidewaysLink) {
    connectivityScore = 2
  } else if (hasUpwardLink || hasSidewaysLink) {
    connectivityScore = 1
    if (!hasUpwardLink) issues.push('Missing upward link to MOC or Project')
    if (!hasSidewaysLink) issues.push('Missing sideways link to related concept')
  } else {
    issues.push('Missing upward link to MOC or Project')
    issues.push('Missing sideways link to related concept')
  }

  if (connectivityScore === 0) failingComponents.push('connectivity')

  // 5. Score ORIGINALITY component (0-1)
  const content = `${note.title} ${note.content}`

  const synthesisPatterns = [
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
  ]

  const wikiPatterns = [
    /according to (wikipedia|the documentation|the official)/i,
    /is defined as/i,
    /was (invented|created|founded|developed) in \d{4}/i,
    /\bis a\b.*\bthat\b/i,
    /^(The|A|An) [A-Z][a-z]+ is/i,
    /officially (released|announced|launched)/i,
  ]

  const synthesisMatches = synthesisPatterns.filter(p => p.test(content)).length
  const wikiMatches = wikiPatterns.filter(p => p.test(content)).length
  const isWikipediaFact = wikiMatches > 0 && synthesisMatches < 2
  const hasOriginalInsight = synthesisMatches >= 2

  let originalityScore = 0
  if (hasOriginalInsight && !isWikipediaFact) {
    originalityScore = 1
  } else {
    issues.push('Content is too factual - add personal interpretation')
  }

  if (originalityScore === 0) failingComponents.push('originality')

  const total = whyScore + metadataScore + taxonomyScore + connectivityScore + originalityScore

  return {
    total,
    breakdown: {
      why: whyScore,
      metadata: metadataScore,
      taxonomy: taxonomyScore,
      connectivity: connectivityScore,
      originality: originalityScore,
    },
    passing: total >= PASSING_THRESHOLD,
    failingComponents,
    issues,
  }
}

// ============================================================================
// Context Fetching
// ============================================================================

function extractKeywords(text: string, limit = 10): string[] {
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w))

  const freq = new Map<string, number>()
  words.forEach(w => freq.set(w, (freq.get(w) || 0) + 1))

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word)
}

async function getRelatedNotes(
  supabase: SupabaseClient,
  userId: string,
  content: string,
  limit = 15
): Promise<ExistingNote[]> {
  const keywords = extractKeywords(content, 8)
  if (keywords.length === 0) return []

  try {
    const { data: allNotes, error } = await supabase
      .from('atomic_notes')
      .select('id, title, content')
      .eq('user_id', userId)

    if (error || !allNotes) return []

    const scoredNotes = allNotes.map((note: ExistingNote) => {
      const titleLower = note.title.toLowerCase()
      const contentLower = note.content.toLowerCase()
      let score = 0

      for (const kw of keywords) {
        if (titleLower.includes(kw)) score += 2
        if (contentLower.includes(kw)) score += 1
      }

      return { ...note, score }
    })

    return scoredNotes
      .filter((n: { score: number }) => n.score > 0)
      .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
      .slice(0, limit)
      .map(({ id, title, content }: ExistingNote & { score: number }) => ({ id, title, content }))
  } catch {
    return []
  }
}

async function getCommonTags(
  supabase: SupabaseClient,
  userId: string,
  limit = 20
): Promise<string[]> {
  try {
    const { data } = await supabase
      .from('tags')
      .select('name')
      .eq('user_id', userId)
      .limit(limit)

    return (data || []).map((t: { name: string }) => t.name)
  } catch {
    return []
  }
}

async function getUserGoals(
  supabase: SupabaseClient,
  userId: string
): Promise<UserGoal[]> {
  try {
    const { data } = await supabase
      .from('goals')
      .select('id, title, why_root')
      .eq('user_id', userId)
      .eq('status', 'active')

    return (data || []) as UserGoal[]
  } catch {
    return []
  }
}

async function getAvailableMOCs(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  try {
    const { data } = await supabase
      .from('atomic_notes')
      .select('title')
      .eq('user_id', userId)
      .ilike('title', 'MOC/%')

    return (data || []).map((n: { title: string }) => n.title.replace(/^MOC\//i, ''))
  } catch {
    return []
  }
}

async function getAvailableProjects(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  try {
    const { data } = await supabase
      .from('atomic_notes')
      .select('title')
      .eq('user_id', userId)
      .ilike('title', 'Project/%')

    return (data || []).map((n: { title: string }) => n.title.replace(/^Project\//i, ''))
  } catch {
    return []
  }
}

async function fetchExtractionContext(
  supabase: SupabaseClient,
  userId: string,
  content: string
): Promise<ExtractionContext> {
  const [relatedNotes, commonTags, userGoals, availableMOCs, availableProjects] = await Promise.all([
    getRelatedNotes(supabase, userId, content),
    getCommonTags(supabase, userId),
    getUserGoals(supabase, userId),
    getAvailableMOCs(supabase, userId),
    getAvailableProjects(supabase, userId),
  ])

  return { relatedNotes, commonTags, userGoals, availableMOCs, availableProjects }
}

// ============================================================================
// NVQ-Aware Extraction Prompt
// ============================================================================

function buildNVQExtractionPrompt(context: ExtractionContext): string {
  let prompt = `You are an expert Zettelkasten note extractor. Extract atomic notes that meet STRICT quality standards (NVQ >= 7/10).

## QUALITY REQUIREMENTS (EVERY note MUST have ALL of these)

### 1. PURPOSE STATEMENT (REQUIRED)
Start each note explaining WHY you're keeping it:
- MUST be first-person: "I am keeping this because..."
- MUST link to a user goal when relevant
- MUST explain how the note is actionable/useful

### 2. METADATA FIELDS (REQUIRED - need at least 3 of 4)
- status: "Seed" (raw info), "Sapling" (synthesized), or "Evergreen" (fundamental truth)
- noteType: "Logic" (why/reasoning), "Technical" (how-to), or "Reflection" (self-observation)
- stakeholder: Who benefits? Common: "Self", "Future Users", "AI Agent", or ANY specific person/team/group
- projectLink: Link to a project if relevant (format: "[[Project/Name]]")

### 3. FUNCTIONAL TAGS (REQUIRED - use instead of topic tags)
Use action-based tags with prefixes:
- "#task/research", "#task/implement", "#decision/technical"
- "#skill/typescript", "#skill/accessibility"
- "#insight/core", "#insight/stale"
- "#project/writing-ui"

FORBIDDEN: Single-word topic tags like #accessibility, #react, #testing

### 4. MEANINGFUL CONNECTIONS (REQUIRED - at least 2)
Every note MUST have at least 2 connections with SPECIFIC relationship types:

**Upward links** (to MOCs or Projects):
- "upward": hierarchical parent (e.g., "[[MOC/Accessibility]]")

**Sideways links** (to related concepts - USE SPECIFIC TYPES):
- "supports": this note provides evidence/reasoning FOR the target
- "contradicts": this note provides evidence/reasoning AGAINST the target (VALUABLE!)
- "extends": this note builds upon or elaborates the target
- "example_of": this note is a concrete instance of the target concept
- "sideways": loosely related (USE SPARINGLY)

IMPORTANT: "contradicts" connections are HIGHLY VALUABLE. When an idea challenges or provides counter-evidence, USE "contradicts".

### 5. ORIGINAL SYNTHESIS (REQUIRED)
Notes MUST contain personal interpretation:
- Include "I realized...", "This means for me...", "My takeaway..."
- AVOID Wikipedia-style generic definitions

`

  // Add context
  if (context.userGoals.length > 0) {
    prompt += `## USER'S GOALS (link in purpose statements)
${context.userGoals.map(g => `- "${g.title}": ${g.why_root || 'No why-root'}`).join('\n')}

`
  }

  if (context.availableMOCs.length > 0) {
    prompt += `## AVAILABLE MOCs (for UPWARD links)
${context.availableMOCs.map(m => `- [[MOC/${m}]]`).join('\n')}

`
  }

  if (context.availableProjects.length > 0) {
    prompt += `## AVAILABLE PROJECTS (for UPWARD links)
${context.availableProjects.map(p => `- [[Project/${p}]]`).join('\n')}

`
  }

  if (context.relatedNotes.length > 0) {
    prompt += `## EXISTING NOTES (for SIDEWAYS links, consolidation)
${context.relatedNotes.slice(0, 15).map(n => `- "${n.title}": ${n.content.slice(0, 100)}...`).join('\n')}

`
  }

  const functionalTags = context.commonTags.filter(t => t.includes('/'))
  if (functionalTags.length > 0) {
    prompt += `## EXISTING FUNCTIONAL TAGS
${functionalTags.slice(0, 20).join(', ')}

`
  }

  prompt += `## OUTPUT FORMAT

Respond with valid JSON:
{
  "notes": [
    {
      "title": "Clear, descriptive title (max 10 words)",
      "purposeStatement": "I am keeping this because [specific reason]...",
      "content": "The atomic idea with original synthesis...",
      "status": "Seed" | "Sapling" | "Evergreen",
      "noteType": "Logic" | "Technical" | "Reflection",
      "stakeholder": "Self" | "Future Users" | "AI Agent",
      "projectLink": "[[Project/Name]]" or null,
      "tags": ["#task/implement", "#skill/accessibility"],
      "connections": [
        { "targetTitle": "[[MOC/Accessibility]]", "type": "upward", "strength": 0.9 },
        { "targetTitle": "Progressive Enhancement", "type": "supports", "strength": 0.85 },
        { "targetTitle": "Move Fast Philosophy", "type": "contradicts", "strength": 0.8 }
      ],
      "consolidate_with": null,
      "merged_content": null
    }
  ]
}

CRITICAL RULES:
1. Quality over quantity - if an idea doesn't warrant a quality note, DO NOT extract it.
2. Use SPECIFIC connection types (supports, contradicts, extends, example_of) over generic "sideways" or "related".
3. "contradicts" connections are GOLD - when ideas conflict, use them to spark critical thinking!

If the text doesn't contain extractable ideas, return: {"notes": []}`

  return prompt
}

// ============================================================================
// Refinement Prompt
// ============================================================================

function buildRefinementPrompt(
  note: ExtractedNote,
  nvqScore: NVQScore,
  context: ExtractionContext
): string {
  return `This note scored ${nvqScore.total}/10 on NVQ and needs improvement to reach 7/10.

## ORIGINAL NOTE
Title: ${note.title}
Purpose: ${note.purposeStatement || 'MISSING'}
Content: ${note.content}
Status: ${note.status || 'MISSING'}
Type: ${note.noteType || 'MISSING'}
Stakeholder: ${note.stakeholder || 'MISSING'}
Project: ${note.projectLink || 'None'}
Tags: ${note.tags.join(', ') || 'MISSING'}
Connections: ${note.connections.map(c => `${c.targetTitle} (${c.type})`).join(', ') || 'NONE'}

## ISSUES TO FIX
${nvqScore.issues.map(i => `- ${i}`).join('\n')}

## AVAILABLE CONTEXT
Goals: ${context.userGoals.map(g => g.title).join(', ') || 'None'}
MOCs: ${context.availableMOCs.join(', ') || 'None'}
Projects: ${context.availableProjects.join(', ') || 'None'}
Related Notes: ${context.relatedNotes.slice(0, 5).map(n => n.title).join(', ') || 'None'}

## TASK
Improve this note to score >= 7/10 while preserving the core idea.

Return the IMPROVED note in the same JSON format:
{
  "title": "...",
  "purposeStatement": "I am keeping this because...",
  "content": "...",
  "status": "Seed" | "Sapling" | "Evergreen",
  "noteType": "Logic" | "Technical" | "Reflection",
  "stakeholder": "Self" | "Future Users" | "AI Agent",
  "projectLink": "[[Project/...]]" | null,
  "tags": ["#task/...", "#skill/..."],
  "connections": [
    { "targetTitle": "[[MOC/...]]", "type": "upward", "strength": 0.9 },
    { "targetTitle": "Supporting Concept", "type": "supports", "strength": 0.85 },
    { "targetTitle": "Conflicting Idea", "type": "contradicts", "strength": 0.8 }
  ]
}

CONNECTION TYPES: Use "supports", "contradicts", "extends", "example_of" instead of generic "sideways" or "related".`
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (_req: Request) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Claim a pending job
    const { data: jobs, error: claimError } = await supabase.rpc('claim_extraction_job')

    if (claimError) {
      console.error('Error claiming job:', claimError)
      return new Response(JSON.stringify({ error: claimError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending jobs' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const item = jobs[0] as QueueItem

    try {
      console.log(`Processing ${item.source_type} for user ${item.user_id}`)

      // Fetch full context for NVQ-aware extraction
      const context = await fetchExtractionContext(supabase, item.user_id, item.content_snapshot)
      console.log(`Context: ${context.relatedNotes.length} notes, ${context.userGoals.length} goals, ${context.availableMOCs.length} MOCs`)

      // Build NVQ-aware prompt
      const systemPrompt = buildNVQExtractionPrompt(context)

      // Call Anthropic API
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicApiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          system: systemPrompt,
          messages: [{ role: 'user', content: item.content_snapshot }]
        })
      })

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`)
      }

      const apiResponse = await response.json()
      const textBlock = apiResponse.content?.find((block: { type: string }) => block.type === 'text')
      if (!textBlock) throw new Error('No text response from AI')

      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No valid JSON in response')

      const parsed = JSON.parse(jsonMatch[0])
      let extractedNotes: ExtractedNote[] = parsed.notes || []

      if (extractedNotes.length === 0) {
        await supabase
          .from('extraction_queue')
          .update({ status: 'skipped', notes_created: 0, completed_at: new Date().toISOString() })
          .eq('id', item.id)

        return new Response(JSON.stringify({ message: 'No extractable content', notes_created: 0 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // NVQ Scoring and Refinement Loop
      const MAX_REFINEMENT_ATTEMPTS = 2
      let refinementAttempts = 0
      let notesRefined = 0
      const nvqContext = {
        mocs: context.availableMOCs,
        projects: context.availableProjects,
        goals: context.userGoals
      }

      // Score and potentially refine each note
      const scoredNotes: Array<{ note: ExtractedNote; nvqScore: NVQScore }> = []

      for (const note of extractedNotes) {
        let currentNote = note
        let nvqScore = evaluateNVQ(currentNote, nvqContext)

        // Refinement loop for failing notes
        let attempts = 0
        while (!nvqScore.passing && attempts < MAX_REFINEMENT_ATTEMPTS) {
          console.log(`Note "${currentNote.title}" scored ${nvqScore.total}/10, refining...`)

          const refinementPrompt = buildRefinementPrompt(currentNote, nvqScore, context)

          const refineResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': anthropicApiKey,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 2000,
              messages: [{ role: 'user', content: refinementPrompt }]
            })
          })

          if (refineResponse.ok) {
            const refineApiResponse = await refineResponse.json()
            const refineTextBlock = refineApiResponse.content?.find((block: { type: string }) => block.type === 'text')
            if (refineTextBlock) {
              const refineJsonMatch = refineTextBlock.text.match(/\{[\s\S]*\}/)
              if (refineJsonMatch) {
                try {
                  const refinedNote = JSON.parse(refineJsonMatch[0]) as ExtractedNote
                  currentNote = { ...currentNote, ...refinedNote }
                  nvqScore = evaluateNVQ(currentNote, nvqContext)
                  notesRefined++
                } catch {
                  // JSON parse failed, keep current note
                }
              }
            }
          }

          attempts++
          refinementAttempts++
        }

        scoredNotes.push({ note: currentNote, nvqScore })
      }

      // Store notes with NVQ data
      const createdNotes: Array<{ id: string; title: string; nvqScore: number }> = []
      const contextNotes: ExistingNote[] = [...context.relatedNotes]
      let notesConsolidated = 0

      for (const { note, nvqScore } of scoredNotes) {
        // Handle consolidation
        if (note.consolidate_with && note.merged_content) {
          const existing = contextNotes.find(n =>
            n.title.toLowerCase() === note.consolidate_with!.toLowerCase()
          )

          if (existing) {
            console.log(`Consolidating into: "${existing.title}"`)

            await supabase.from('note_history').insert({
              note_id: existing.id,
              title: existing.title,
              content: existing.content,
              changed_by: 'consolidation',
              source_id: item.source_id
            })

            const { error: updateError } = await supabase
              .from('atomic_notes')
              .update({
                content: note.merged_content,
                nvq_score: nvqScore.total,
                nvq_breakdown: nvqScore.breakdown,
                nvq_evaluated_at: new Date().toISOString(),
                quality_status: nvqScore.passing ? 'passing' : 'needs_review',
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id)

            if (!updateError) {
              await supabase.from('note_sources').insert({
                note_id: existing.id,
                source_type: item.source_type,
                source_id: item.source_id
              })
              notesConsolidated++
              existing.content = note.merged_content
            }
            continue
          }
        }

        // Create new note with NVQ data
        const { data: noteData, error: noteError } = await supabase
          .from('atomic_notes')
          .insert({
            user_id: item.user_id,
            source_document_id: item.source_type === 'document' ? item.source_id : null,
            title: note.title,
            content: note.content,
            note_type: 'permanent',
            ai_generated: true,
            // NVQ fields
            nvq_score: nvqScore.total,
            nvq_breakdown: nvqScore.breakdown,
            nvq_evaluated_at: new Date().toISOString(),
            quality_status: nvqScore.passing ? 'passing' : 'needs_review',
            purpose_statement: note.purposeStatement,
            note_status: note.status,
            note_content_type: note.noteType,
            stakeholder: note.stakeholder,
            project_link: note.projectLink
          })
          .select('id')
          .single()

        if (noteError || !noteData) {
          console.error('Error creating note:', noteError)
          continue
        }

        createdNotes.push({ id: noteData.id, title: note.title, nvqScore: nvqScore.total })
        contextNotes.push({ id: noteData.id, title: note.title, content: note.content })

        // Link to source
        await supabase.from('note_sources').insert({
          note_id: noteData.id,
          source_type: item.source_type,
          source_id: item.source_id
        })

        // Create tags
        for (const tagName of note.tags) {
          const normalizedTag = tagName.toLowerCase().replace(/^#/, '')

          const { data: existingTag } = await supabase
            .from('tags')
            .select('id')
            .eq('user_id', item.user_id)
            .eq('name', normalizedTag)
            .single()

          let tagId: string

          if (existingTag) {
            tagId = existingTag.id
          } else {
            const { data: newTag, error: tagError } = await supabase
              .from('tags')
              .insert({ user_id: item.user_id, name: normalizedTag })
              .select('id')
              .single()

            if (tagError) continue
            tagId = newTag.id
          }

          await supabase.from('note_tags').insert({
            note_id: noteData.id,
            tag_id: tagId
          })
        }

        // Create connections
        for (const connection of note.connections) {
          let targetNote = createdNotes.find(n =>
            n.title.toLowerCase() === connection.targetTitle.toLowerCase().replace(/^\[\[|\]\]$/g, '')
          )

          if (!targetNote) {
            const existingTarget = contextNotes.find(n =>
              n.title.toLowerCase() === connection.targetTitle.toLowerCase().replace(/^\[\[|\]\]$/g, '')
            )
            if (existingTarget) {
              targetNote = { id: existingTarget.id, title: existingTarget.title, nvqScore: 0 }
            }
          }

          if (!targetNote) continue

          await supabase.from('note_connections').insert({
            user_id: item.user_id,
            source_note_id: noteData.id,
            target_note_id: targetNote.id,
            connection_type: connection.type,
            strength: connection.strength,
            ai_generated: true
          })
        }
      }

      // Calculate NVQ metrics
      const nvqScores = scoredNotes.map(s => s.nvqScore.total)
      const nvqMetrics = {
        mean_nvq: nvqScores.reduce((a, b) => a + b, 0) / nvqScores.length,
        passing_rate: scoredNotes.filter(s => s.nvqScore.passing).length / scoredNotes.length,
        notes_passing: scoredNotes.filter(s => s.nvqScore.passing).length,
        notes_failed: scoredNotes.filter(s => !s.nvqScore.passing).length
      }

      console.log(`Created ${createdNotes.length} notes (${nvqMetrics.notes_passing} passing), consolidated ${notesConsolidated}, refined ${notesRefined}`)

      // Update queue item with NVQ metrics
      await supabase
        .from('extraction_queue')
        .update({
          status: 'completed',
          notes_created: createdNotes.length,
          nvq_metrics: nvqMetrics,
          refinement_attempts: refinementAttempts,
          notes_refined: notesRefined,
          completed_at: new Date().toISOString()
        })
        .eq('id', item.id)

      return new Response(JSON.stringify({
        message: 'NVQ extraction completed',
        notes_created: createdNotes.length,
        nvq_metrics: nvqMetrics,
        notes: createdNotes
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })

    } catch (extractionError) {
      const newAttempts = item.attempts
      const status = newAttempts >= item.max_attempts ? 'failed' : 'pending'

      await supabase
        .from('extraction_queue')
        .update({
          status,
          error_message: extractionError instanceof Error ? extractionError.message : 'Unknown error',
          started_at: null
        })
        .eq('id', item.id)

      console.error('Extraction error:', extractionError)

      return new Response(JSON.stringify({
        error: extractionError instanceof Error ? extractionError.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
