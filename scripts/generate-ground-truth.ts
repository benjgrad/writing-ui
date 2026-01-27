/**
 * Ground Truth Generation Script
 *
 * Runs the NVQ-integrated extraction pipeline on real documents
 * to generate ground truth data for testing.
 *
 * Process:
 * 1. Load real document scenarios from exported data
 * 2. Run NEW NVQ-aware extraction on each document
 * 3. Score extracted notes with NVQ evaluator
 * 4. Output results for manual review
 * 5. Save as ground truth after validation
 *
 * Usage:
 *   npx tsx scripts/generate-ground-truth.ts                    # Run all
 *   npx tsx scripts/generate-ground-truth.ts --limit 5          # Run first 5
 *   npx tsx scripts/generate-ground-truth.ts --type reflective  # Run by type
 *   npx tsx scripts/generate-ground-truth.ts --save             # Save results
 *   npx tsx scripts/generate-ground-truth.ts --dry-run          # Preview only
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import * as fs from 'fs'
import * as path from 'path'

// Load .env.local
config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!

// ============================================================================
// Types (inline to avoid import issues in scripts)
// ============================================================================

type NoteStatus = 'Seed' | 'Sapling' | 'Evergreen'
type NoteType = 'Logic' | 'Technical' | 'Reflection'
type Stakeholder = 'Self' | 'Future Users' | 'AI Agent'

interface ExtractedNote {
  title: string
  purposeStatement: string | null
  content: string
  status: NoteStatus | null
  noteType: NoteType | null
  stakeholder: Stakeholder | null
  project: string | null
  tags: string[]
  connections: Array<{
    targetTitle: string
    type: string
    strength: number
  }>
  consolidate_with: string | null
  merged_content: string | null
}

interface NVQBreakdown {
  why: number
  metadata: number
  taxonomy: number
  connectivity: number
  originality: number
}

interface NVQScore {
  total: number
  breakdown: NVQBreakdown
  passing: boolean
}

interface GroundTruthNote {
  title: string
  content: string
  purposeStatement: string | null
  status: NoteStatus | null
  noteType: NoteType | null
  stakeholder: Stakeholder | null
  project: string | null
  tags: string[]
  connections: Array<{
    targetTitle: string
    type: string
    strength: number
  }>
  nvqScore: NVQScore
  manualReview?: {
    isCorrect: boolean
    adjustedScore?: number
    notes?: string
  }
}

interface GroundTruthEntry {
  documentId: string
  documentTitle: string
  documentContent: string
  sourceType: string
  extractedAt: string
  notes: GroundTruthNote[]
  aggregateNVQ: {
    mean: number
    passingRate: number
    count: number
  }
}

interface GroundTruthDataset {
  generatedAt: string
  modelUsed: string
  totalDocuments: number
  totalNotes: number
  overallPassingRate: number
  entries: GroundTruthEntry[]
}

// ============================================================================
// NVQ Evaluator (simplified inline version)
// ============================================================================

const PURPOSE_PATTERNS = {
  firstPerson: /\b(I|my|me|we|our)\b/i,
  purpose: /keeping this because|reason for this|purpose is|why this matters/i,
  actionable: /\b(implement|apply|use|try|test|build|create|improve|practice|avoid|remember|ensure)\b/i,
}

const FUNCTIONAL_TAG_PREFIXES = ['task/', 'skill/', 'insight/', 'project/', 'evolution/', 'decision/']

function evaluateNote(note: ExtractedNote): NVQScore {
  const combined = `${note.purposeStatement || ''} ${note.content}`.toLowerCase()

  // Why component (0-3)
  let whyScore = 0
  if (PURPOSE_PATTERNS.firstPerson.test(combined)) whyScore++
  if (PURPOSE_PATTERNS.purpose.test(combined) || note.purposeStatement) whyScore++
  if (PURPOSE_PATTERNS.actionable.test(combined)) whyScore++

  // Metadata component (0-2)
  let metadataFields = 0
  if (note.status) metadataFields++
  if (note.noteType) metadataFields++
  if (note.stakeholder) metadataFields++
  if (note.project) metadataFields++
  const metadataScore = metadataFields >= 3 ? 2 : metadataFields >= 2 ? 1 : 0

  // Taxonomy component (0-2)
  const functionalTags = note.tags.filter((t) =>
    FUNCTIONAL_TAG_PREFIXES.some((p) => t.toLowerCase().replace('#', '').startsWith(p))
  )
  const topicTags = note.tags.filter(
    (t) => !FUNCTIONAL_TAG_PREFIXES.some((p) => t.toLowerCase().replace('#', '').startsWith(p))
  )
  let taxonomyScore = 0
  if (functionalTags.length > 0 && topicTags.length === 0) {
    taxonomyScore = 2
  } else if (functionalTags.length > 0) {
    taxonomyScore = 1
  }
  if (note.tags.length > 5) taxonomyScore = Math.max(0, taxonomyScore - 1)

  // Connectivity component (0-2)
  const upwardLinks = note.connections.filter(
    (c) => c.type === 'upward' || c.targetTitle.toLowerCase().includes('moc/') || c.targetTitle.toLowerCase().includes('project/')
  )
  const sidewaysLinks = note.connections.filter(
    (c) => c.type === 'sideways' || c.type === 'related' || c.type === 'extends' || c.type === 'supports'
  )
  let connectivityScore = 0
  if (upwardLinks.length > 0 && sidewaysLinks.length > 0) {
    connectivityScore = 2
  } else if (upwardLinks.length > 0 || sidewaysLinks.length > 0) {
    connectivityScore = 1
  }

  // Originality component (0-1)
  const synthesisIndicators = /\b(I realized|I learned|this means|my takeaway|in my experience|for me)\b/i
  const originalityScore = synthesisIndicators.test(combined) ? 1 : 0

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
    passing: total >= 7,
  }
}

// ============================================================================
// NVQ-Aware Extraction Prompt (simplified)
// ============================================================================

function buildExtractionPrompt(context: { mocs: string[]; projects: string[]; goals: Array<{ title: string; whyRoot: string }> }): string {
  let contextSection = ''

  if (context.goals.length > 0) {
    contextSection += `\n## USER'S GOALS (link to these in purpose statements)\n`
    contextSection += context.goals.map((g) => `- "${g.title}": ${g.whyRoot || 'No why-root defined'}`).join('\n')
  }

  if (context.mocs.length > 0) {
    contextSection += `\n\n## AVAILABLE MOCs (use for UPWARD links)\n`
    contextSection += context.mocs.map((m) => `- [[MOC/${m}]]`).join('\n')
  }

  if (context.projects.length > 0) {
    contextSection += `\n\n## AVAILABLE PROJECTS (use for UPWARD links)\n`
    contextSection += context.projects.map((p) => `- [[Project/${p}]]`).join('\n')
  }

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
- stakeholder: "Self", "Future Users", or "AI Agent"
- project: Link to a project if relevant (format: "[[Project/Name]]")

### 3. FUNCTIONAL TAGS (REQUIRED - use instead of topic tags)
Use action-based tags with prefixes, NOT generic topic words:
- "#task/research", "#task/implement", "#task/review", "#decision/technical"
- "#skill/typescript", "#skill/accessibility", "#skill/ux"
- "#insight/core", "#insight/stale", "#insight/emerging"
- "#project/writing-ui", "#project/[name]"

FORBIDDEN: Single-word topic tags like #accessibility, #react, #testing, #api, #design

### 4. TWO-LINK MINIMUM (REQUIRED)
Every note MUST have at least:
- One UPWARD link: to a MOC or Project (e.g., "[[MOC/Accessibility]]", "[[Project/Writing UI]]")
- One SIDEWAYS link: to a related concept (e.g., "[[Progressive Enhancement]]", "[[ARIA Labels]]")

### 5. ORIGINAL SYNTHESIS (REQUIRED)
Notes MUST contain personal interpretation, not just facts:
- Include phrases like "I realized...", "This means for me...", "My takeaway..."
- Connect to your specific context/project
- AVOID Wikipedia-style generic definitions
${contextSection}

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
      "project": "[[Project/Name]]" or null,
      "tags": ["#task/implement", "#skill/accessibility", "#project/writing-ui"],
      "connections": [
        { "targetTitle": "[[MOC/Accessibility]]", "type": "upward", "strength": 0.9 },
        { "targetTitle": "Related Concept Name", "type": "sideways", "strength": 0.8 }
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
4. TWO LINKS MINIMUM: At least one upward link AND one sideways link per note.

If the text doesn't contain extractable atomic ideas that can meet these standards, return: {"notes": []}`
}

// ============================================================================
// Main Extraction Logic
// ============================================================================

async function extractWithNVQ(
  anthropic: Anthropic,
  content: string,
  context: { mocs: string[]; projects: string[]; goals: Array<{ title: string; whyRoot: string }> }
): Promise<GroundTruthNote[]> {
  const systemPrompt = buildExtractionPrompt(context)

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: 'user', content }],
  })

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    return []
  }

  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return []
  }

  try {
    const parsed = JSON.parse(jsonMatch[0])
    const extractedNotes: ExtractedNote[] = parsed.notes || []

    return extractedNotes.map((note) => {
      const nvqScore = evaluateNote(note)
      return {
        title: note.title,
        content: note.content,
        purposeStatement: note.purposeStatement,
        status: note.status,
        noteType: note.noteType,
        stakeholder: note.stakeholder,
        project: note.project,
        tags: note.tags,
        connections: note.connections,
        nvqScore,
      }
    })
  } catch {
    return []
  }
}

// ============================================================================
// Data Loading
// ============================================================================

interface ExportedDocument {
  id: string
  title: string
  content: string
  wordCount: number
}

interface ExportedCoachingSession {
  id: string
  goalTitle: string | null
  messages: Array<{ role: string; content: string }>
}

interface ExportedUserData {
  documents: ExportedDocument[]
  coachingSessions: ExportedCoachingSession[]
}

function loadExportedData(): ExportedUserData | null {
  const dataPath = path.join(__dirname, '../tests/extraction-accuracy/fixtures/real-user-data.json')
  if (!fs.existsSync(dataPath)) {
    console.error(`Error: ${dataPath} not found. Run export-user-data.ts first.`)
    return null
  }

  return JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
}

// ============================================================================
// Main Script
// ============================================================================

async function main() {
  // Parse CLI arguments
  const args = process.argv.slice(2)
  const limitIndex = args.indexOf('--limit')
  const limit = limitIndex >= 0 ? parseInt(args[limitIndex + 1], 10) : Infinity
  const typeIndex = args.indexOf('--type')
  const filterType = typeIndex >= 0 ? args[typeIndex + 1] : null
  const shouldSave = args.includes('--save')
  const dryRun = args.includes('--dry-run')
  const verbose = args.includes('--verbose')

  console.log('===== Ground Truth Generation =====\n')
  console.log(`Options:`)
  console.log(`  Limit: ${limit === Infinity ? 'none' : limit}`)
  console.log(`  Filter type: ${filterType || 'all'}`)
  console.log(`  Save results: ${shouldSave}`)
  console.log(`  Dry run: ${dryRun}`)
  console.log('')

  // Load exported data
  const data = loadExportedData()
  if (!data) {
    process.exit(1)
  }

  console.log(`Loaded ${data.documents.length} documents, ${data.coachingSessions.length} coaching sessions\n`)

  if (dryRun) {
    console.log('[DRY RUN] Would process these items:')
    data.documents.slice(0, Math.min(5, limit)).forEach((d) => {
      console.log(`  - Document: ${d.title} (${d.wordCount} words)`)
    })
    data.coachingSessions.slice(0, Math.min(3, limit)).forEach((s) => {
      console.log(`  - Coaching: ${s.goalTitle || 'Unlinked'} (${s.messages.length} messages)`)
    })
    console.log('\nRun without --dry-run to extract notes.')
    return
  }

  // Initialize clients
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

  // Default context (could be enriched by fetching from DB)
  const context = {
    mocs: ['Personal Knowledge Management', 'Software Development', 'Writing'],
    projects: ['Writing UI'],
    goals: [
      { title: 'Build accessible writing app', whyRoot: 'Democratize quality journaling' },
      { title: 'Improve note extraction quality', whyRoot: 'Enable better knowledge synthesis' },
    ],
  }

  const groundTruth: GroundTruthEntry[] = []
  let totalNotes = 0
  let totalPassing = 0

  // Process documents
  const docsToProcess = filterType && filterType !== 'document' ? [] : data.documents.slice(0, limit)

  for (let i = 0; i < docsToProcess.length; i++) {
    const doc = docsToProcess[i]
    console.log(`[${i + 1}/${docsToProcess.length}] Processing document: ${doc.title}`)

    try {
      const notes = await extractWithNVQ(anthropic, doc.content, context)

      const passingNotes = notes.filter((n) => n.nvqScore.passing).length
      const meanNVQ = notes.length > 0 ? notes.reduce((sum, n) => sum + n.nvqScore.total, 0) / notes.length : 0

      console.log(`    Extracted ${notes.length} notes (${passingNotes} passing, mean NVQ: ${meanNVQ.toFixed(1)})`)

      if (verbose && notes.length > 0) {
        notes.forEach((n) => {
          console.log(`      - "${n.title}" (NVQ: ${n.nvqScore.total}/10 ${n.nvqScore.passing ? '✓' : '✗'})`)
        })
      }

      groundTruth.push({
        documentId: doc.id,
        documentTitle: doc.title,
        documentContent: doc.content,
        sourceType: 'document',
        extractedAt: new Date().toISOString(),
        notes,
        aggregateNVQ: {
          mean: meanNVQ,
          passingRate: notes.length > 0 ? passingNotes / notes.length : 0,
          count: notes.length,
        },
      })

      totalNotes += notes.length
      totalPassing += passingNotes
    } catch (error) {
      console.error(`    Error: ${error}`)
    }

    // Rate limiting
    await new Promise((r) => setTimeout(r, 1000))
  }

  // Process coaching sessions
  const sessionsToProcess =
    filterType && filterType !== 'coaching'
      ? []
      : data.coachingSessions.filter((s) => s.messages.length >= 2).slice(0, Math.max(0, limit - docsToProcess.length))

  for (let i = 0; i < sessionsToProcess.length; i++) {
    const session = sessionsToProcess[i]
    const title = session.goalTitle || 'Unlinked Session'
    console.log(`[${docsToProcess.length + i + 1}/${docsToProcess.length + sessionsToProcess.length}] Processing coaching: ${title}`)

    try {
      const transcript = session.messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')

      const notes = await extractWithNVQ(anthropic, transcript, context)

      const passingNotes = notes.filter((n) => n.nvqScore.passing).length
      const meanNVQ = notes.length > 0 ? notes.reduce((sum, n) => sum + n.nvqScore.total, 0) / notes.length : 0

      console.log(`    Extracted ${notes.length} notes (${passingNotes} passing, mean NVQ: ${meanNVQ.toFixed(1)})`)

      if (verbose && notes.length > 0) {
        notes.forEach((n) => {
          console.log(`      - "${n.title}" (NVQ: ${n.nvqScore.total}/10 ${n.nvqScore.passing ? '✓' : '✗'})`)
        })
      }

      groundTruth.push({
        documentId: session.id,
        documentTitle: title,
        documentContent: transcript,
        sourceType: 'coaching',
        extractedAt: new Date().toISOString(),
        notes,
        aggregateNVQ: {
          mean: meanNVQ,
          passingRate: notes.length > 0 ? passingNotes / notes.length : 0,
          count: notes.length,
        },
      })

      totalNotes += notes.length
      totalPassing += passingNotes
    } catch (error) {
      console.error(`    Error: ${error}`)
    }

    // Rate limiting
    await new Promise((r) => setTimeout(r, 1000))
  }

  // Build dataset
  const dataset: GroundTruthDataset = {
    generatedAt: new Date().toISOString(),
    modelUsed: 'claude-sonnet-4-20250514',
    totalDocuments: groundTruth.length,
    totalNotes,
    overallPassingRate: totalNotes > 0 ? totalPassing / totalNotes : 0,
    entries: groundTruth,
  }

  // Summary
  console.log('\n===== Summary =====')
  console.log(`Documents processed: ${groundTruth.length}`)
  console.log(`Total notes extracted: ${totalNotes}`)
  console.log(`Notes passing (NVQ >= 7): ${totalPassing} (${((totalPassing / totalNotes) * 100).toFixed(1)}%)`)

  // Component analysis
  const allNotes = groundTruth.flatMap((e) => e.notes)
  if (allNotes.length > 0) {
    const avgBreakdown = {
      why: allNotes.reduce((s, n) => s + n.nvqScore.breakdown.why, 0) / allNotes.length,
      metadata: allNotes.reduce((s, n) => s + n.nvqScore.breakdown.metadata, 0) / allNotes.length,
      taxonomy: allNotes.reduce((s, n) => s + n.nvqScore.breakdown.taxonomy, 0) / allNotes.length,
      connectivity: allNotes.reduce((s, n) => s + n.nvqScore.breakdown.connectivity, 0) / allNotes.length,
      originality: allNotes.reduce((s, n) => s + n.nvqScore.breakdown.originality, 0) / allNotes.length,
    }

    console.log('\nAverage component scores:')
    console.log(`  Why: ${avgBreakdown.why.toFixed(2)}/3`)
    console.log(`  Metadata: ${avgBreakdown.metadata.toFixed(2)}/2`)
    console.log(`  Taxonomy: ${avgBreakdown.taxonomy.toFixed(2)}/2`)
    console.log(`  Connectivity: ${avgBreakdown.connectivity.toFixed(2)}/2`)
    console.log(`  Originality: ${avgBreakdown.originality.toFixed(2)}/1`)
  }

  // Save if requested
  if (shouldSave) {
    const outputPath = path.join(__dirname, '../tests/extraction-accuracy/fixtures/ground-truth-dataset.json')
    fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2))
    console.log(`\nSaved to: ${outputPath}`)
  } else {
    console.log('\nRun with --save to persist results.')
  }

  // Show sample for manual review
  if (allNotes.length > 0) {
    console.log('\n===== Sample Notes for Review =====')
    const samples = allNotes.slice(0, 3)
    samples.forEach((note, i) => {
      console.log(`\n--- Note ${i + 1}: "${note.title}" ---`)
      console.log(`NVQ: ${note.nvqScore.total}/10 (${note.nvqScore.passing ? 'PASSING' : 'FAILING'})`)
      console.log(`Breakdown: why=${note.nvqScore.breakdown.why}/3, meta=${note.nvqScore.breakdown.metadata}/2, tax=${note.nvqScore.breakdown.taxonomy}/2, conn=${note.nvqScore.breakdown.connectivity}/2, orig=${note.nvqScore.breakdown.originality}/1`)
      console.log(`Purpose: ${note.purposeStatement || '(none)'}`)
      console.log(`Status: ${note.status}, Type: ${note.noteType}, Stakeholder: ${note.stakeholder}`)
      console.log(`Tags: ${note.tags.join(', ')}`)
      console.log(`Connections: ${note.connections.map((c) => `${c.targetTitle} (${c.type})`).join(', ') || '(none)'}`)
      console.log(`Content: ${note.content.slice(0, 150)}...`)
    })
  }

  console.log('\nDone!')
}

main().catch(console.error)
