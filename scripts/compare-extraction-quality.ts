/**
 * Pipeline Comparison Script
 *
 * Compares OLD extraction pipeline (without NVQ) vs NEW NVQ-integrated pipeline.
 * Uses real documents as input and scores both outputs with NVQ evaluator.
 *
 * Usage:
 *   npx tsx scripts/compare-extraction-quality.ts                # Compare all
 *   npx tsx scripts/compare-extraction-quality.ts --limit 5      # Compare first 5
 *   npx tsx scripts/compare-extraction-quality.ts --save         # Save report
 *   npx tsx scripts/compare-extraction-quality.ts --side-by-side # Show examples
 */

import { config } from 'dotenv'
import Anthropic from '@anthropic-ai/sdk'
import * as fs from 'fs'
import * as path from 'path'

// Load .env.local
config({ path: '.env.local' })

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!

// ============================================================================
// Types
// ============================================================================

type NoteStatus = 'Seed' | 'Sapling' | 'Evergreen'
type NoteType = 'Logic' | 'Technical' | 'Reflection'
type Stakeholder = 'Self' | 'Future Users' | 'AI Agent'

interface OldExtractedNote {
  title: string
  content: string
  tags: string[]
  connections: Array<{
    targetTitle: string
    type: string
    strength: number
  }>
}

interface NewExtractedNote {
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

interface ScoredNote {
  title: string
  content: string
  nvqScore: NVQScore
  pipeline: 'old' | 'new'
}

interface ComparisonResult {
  documentId: string
  documentTitle: string
  oldPipeline: {
    notes: ScoredNote[]
    count: number
    meanNVQ: number
    passingRate: number
    avgBreakdown: NVQBreakdown
  }
  newPipeline: {
    notes: ScoredNote[]
    count: number
    meanNVQ: number
    passingRate: number
    avgBreakdown: NVQBreakdown
  }
  improvement: {
    nvqDelta: number
    passingRateDelta: number
    componentDeltas: NVQBreakdown
  }
}

interface ComparisonReport {
  generatedAt: string
  documentsCompared: number
  summary: {
    old: {
      totalNotes: number
      meanNVQ: number
      passingRate: number
      avgBreakdown: NVQBreakdown
    }
    new: {
      totalNotes: number
      meanNVQ: number
      passingRate: number
      avgBreakdown: NVQBreakdown
    }
    improvement: {
      nvqDelta: number
      passingRateDelta: number
      componentDeltas: NVQBreakdown
    }
  }
  results: ComparisonResult[]
}

// ============================================================================
// NVQ Evaluator
// ============================================================================

const PURPOSE_PATTERNS = {
  firstPerson: /\b(I|my|me|we|our)\b/i,
  purpose: /keeping this because|reason for this|purpose is|why this matters/i,
  actionable: /\b(implement|apply|use|try|test|build|create|improve|practice|avoid|remember|ensure)\b/i,
}

const FUNCTIONAL_TAG_PREFIXES = ['task/', 'skill/', 'insight/', 'project/', 'evolution/', 'decision/']

function evaluateOldNote(note: OldExtractedNote): NVQScore {
  const combined = note.content.toLowerCase()

  // Why component (0-3) - old notes lack purpose statements
  let whyScore = 0
  if (PURPOSE_PATTERNS.firstPerson.test(combined)) whyScore++
  if (PURPOSE_PATTERNS.purpose.test(combined)) whyScore++
  if (PURPOSE_PATTERNS.actionable.test(combined)) whyScore++

  // Metadata component (0-2) - old notes lack metadata
  const metadataScore = 0 // No structured metadata in old pipeline

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

function evaluateNewNote(note: NewExtractedNote): NVQScore {
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
// OLD Pipeline Prompt (without NVQ requirements)
// ============================================================================

const OLD_EXTRACTION_PROMPT = `You are an expert at extracting atomic notes in the Zettelkasten method. Given a piece of writing, extract discrete, atomic ideas that stand on their own.

For each atomic note:
- Give it a clear, descriptive title (max 10 words)
- Write a concise explanation of the idea (1-3 sentences)
- Assign relevant tags (2-5 tags)
- Identify connections to other notes

Respond with valid JSON in this exact format:
{
  "notes": [
    {
      "title": "Note title here",
      "content": "The atomic idea explained clearly.",
      "tags": ["tag1", "tag2"],
      "connections": [
        {
          "targetTitle": "Title of connected note",
          "type": "related",
          "strength": 0.8
        }
      ]
    }
  ]
}

Focus on:
- Extracting truly atomic ideas (one concept per note)
- Making notes that are useful independently
- Quality over quantity

If the text doesn't contain extractable atomic ideas, return: {"notes": []}`

// ============================================================================
// NEW Pipeline Prompt (with NVQ requirements)
// ============================================================================

const NEW_EXTRACTION_PROMPT = `You are an expert Zettelkasten note extractor. Extract atomic notes that meet STRICT quality standards (NVQ >= 7/10).

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
- "#task/research", "#task/implement", "#task/review"
- "#skill/typescript", "#skill/accessibility"
- "#insight/core", "#insight/emerging"
- "#project/writing-ui"

FORBIDDEN: Single-word topic tags like #accessibility, #react, #testing

### 4. TWO-LINK MINIMUM (REQUIRED)
Every note MUST have at least:
- One UPWARD link: to a MOC or Project
- One SIDEWAYS link: to a related concept

### 5. ORIGINAL SYNTHESIS (REQUIRED)
Notes MUST contain personal interpretation, not just facts:
- Include phrases like "I realized...", "This means for me..."
- Connect to your specific context/project

## OUTPUT FORMAT

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
      "project": "[[Project/Name]]" or null,
      "tags": ["#task/implement", "#skill/accessibility"],
      "connections": [
        { "targetTitle": "[[MOC/Topic]]", "type": "upward", "strength": 0.9 },
        { "targetTitle": "Related Concept", "type": "sideways", "strength": 0.8 }
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

// ============================================================================
// Extraction Functions
// ============================================================================

async function extractOldPipeline(anthropic: Anthropic, content: string): Promise<OldExtractedNote[]> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    system: OLD_EXTRACTION_PROMPT,
    messages: [{ role: 'user', content }],
  })

  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') return []

  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return []

  try {
    const parsed = JSON.parse(jsonMatch[0])
    return parsed.notes || []
  } catch {
    return []
  }
}

async function extractNewPipeline(anthropic: Anthropic, content: string): Promise<NewExtractedNote[]> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: NEW_EXTRACTION_PROMPT,
    messages: [{ role: 'user', content }],
  })

  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') return []

  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return []

  try {
    const parsed = JSON.parse(jsonMatch[0])
    return parsed.notes || []
  } catch {
    return []
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function avgBreakdown(notes: ScoredNote[]): NVQBreakdown {
  if (notes.length === 0) {
    return { why: 0, metadata: 0, taxonomy: 0, connectivity: 0, originality: 0 }
  }
  return {
    why: notes.reduce((s, n) => s + n.nvqScore.breakdown.why, 0) / notes.length,
    metadata: notes.reduce((s, n) => s + n.nvqScore.breakdown.metadata, 0) / notes.length,
    taxonomy: notes.reduce((s, n) => s + n.nvqScore.breakdown.taxonomy, 0) / notes.length,
    connectivity: notes.reduce((s, n) => s + n.nvqScore.breakdown.connectivity, 0) / notes.length,
    originality: notes.reduce((s, n) => s + n.nvqScore.breakdown.originality, 0) / notes.length,
  }
}

function deltaBreakdown(newB: NVQBreakdown, oldB: NVQBreakdown): NVQBreakdown {
  return {
    why: newB.why - oldB.why,
    metadata: newB.metadata - oldB.metadata,
    taxonomy: newB.taxonomy - oldB.taxonomy,
    connectivity: newB.connectivity - oldB.connectivity,
    originality: newB.originality - oldB.originality,
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

interface ExportedUserData {
  documents: ExportedDocument[]
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
  const args = process.argv.slice(2)
  const limitIndex = args.indexOf('--limit')
  const limit = limitIndex >= 0 ? parseInt(args[limitIndex + 1], 10) : Infinity
  const shouldSave = args.includes('--save')
  const showSideBySide = args.includes('--side-by-side')

  console.log('===== NVQ Pipeline Comparison =====\n')
  console.log('Comparing OLD pipeline (basic extraction) vs NEW pipeline (NVQ-aware extraction)\n')

  // Load data
  const data = loadExportedData()
  if (!data) {
    process.exit(1)
  }

  // Initialize Anthropic
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

  const results: ComparisonResult[] = []
  const docsToProcess = data.documents.filter((d) => d.wordCount >= 50).slice(0, limit)

  console.log(`Processing ${docsToProcess.length} documents...\n`)

  for (let i = 0; i < docsToProcess.length; i++) {
    const doc = docsToProcess[i]
    console.log(`[${i + 1}/${docsToProcess.length}] ${doc.title}`)

    try {
      // Run both pipelines
      const [oldNotes, newNotes] = await Promise.all([
        extractOldPipeline(anthropic, doc.content),
        extractNewPipeline(anthropic, doc.content),
      ])

      // Score old notes
      const oldScored: ScoredNote[] = oldNotes.map((n) => ({
        title: n.title,
        content: n.content,
        nvqScore: evaluateOldNote(n),
        pipeline: 'old' as const,
      }))

      // Score new notes
      const newScored: ScoredNote[] = newNotes.map((n) => ({
        title: n.title,
        content: n.content,
        nvqScore: evaluateNewNote(n),
        pipeline: 'new' as const,
      }))

      // Calculate metrics
      const oldMean = oldScored.length > 0 ? oldScored.reduce((s, n) => s + n.nvqScore.total, 0) / oldScored.length : 0
      const newMean = newScored.length > 0 ? newScored.reduce((s, n) => s + n.nvqScore.total, 0) / newScored.length : 0

      const oldPassing = oldScored.filter((n) => n.nvqScore.passing).length
      const newPassing = newScored.filter((n) => n.nvqScore.passing).length

      const oldPassingRate = oldScored.length > 0 ? oldPassing / oldScored.length : 0
      const newPassingRate = newScored.length > 0 ? newPassing / newScored.length : 0

      const oldAvgBreakdown = avgBreakdown(oldScored)
      const newAvgBreakdown = avgBreakdown(newScored)

      const result: ComparisonResult = {
        documentId: doc.id,
        documentTitle: doc.title,
        oldPipeline: {
          notes: oldScored,
          count: oldScored.length,
          meanNVQ: oldMean,
          passingRate: oldPassingRate,
          avgBreakdown: oldAvgBreakdown,
        },
        newPipeline: {
          notes: newScored,
          count: newScored.length,
          meanNVQ: newMean,
          passingRate: newPassingRate,
          avgBreakdown: newAvgBreakdown,
        },
        improvement: {
          nvqDelta: newMean - oldMean,
          passingRateDelta: newPassingRate - oldPassingRate,
          componentDeltas: deltaBreakdown(newAvgBreakdown, oldAvgBreakdown),
        },
      }

      results.push(result)

      // Progress output
      const nvqImprovement = result.improvement.nvqDelta >= 0 ? `+${result.improvement.nvqDelta.toFixed(1)}` : result.improvement.nvqDelta.toFixed(1)
      console.log(`    OLD: ${oldScored.length} notes, mean NVQ ${oldMean.toFixed(1)}, ${(oldPassingRate * 100).toFixed(0)}% passing`)
      console.log(`    NEW: ${newScored.length} notes, mean NVQ ${newMean.toFixed(1)}, ${(newPassingRate * 100).toFixed(0)}% passing`)
      console.log(`    Delta: ${nvqImprovement} NVQ points\n`)
    } catch (error) {
      console.error(`    Error: ${error}\n`)
    }

    // Rate limiting
    await new Promise((r) => setTimeout(r, 2000))
  }

  // Calculate summary
  const allOldNotes = results.flatMap((r) => r.oldPipeline.notes)
  const allNewNotes = results.flatMap((r) => r.newPipeline.notes)

  const summary = {
    old: {
      totalNotes: allOldNotes.length,
      meanNVQ: allOldNotes.length > 0 ? allOldNotes.reduce((s, n) => s + n.nvqScore.total, 0) / allOldNotes.length : 0,
      passingRate: allOldNotes.length > 0 ? allOldNotes.filter((n) => n.nvqScore.passing).length / allOldNotes.length : 0,
      avgBreakdown: avgBreakdown(allOldNotes),
    },
    new: {
      totalNotes: allNewNotes.length,
      meanNVQ: allNewNotes.length > 0 ? allNewNotes.reduce((s, n) => s + n.nvqScore.total, 0) / allNewNotes.length : 0,
      passingRate: allNewNotes.length > 0 ? allNewNotes.filter((n) => n.nvqScore.passing).length / allNewNotes.length : 0,
      avgBreakdown: avgBreakdown(allNewNotes),
    },
    improvement: {
      nvqDelta: 0,
      passingRateDelta: 0,
      componentDeltas: { why: 0, metadata: 0, taxonomy: 0, connectivity: 0, originality: 0 },
    },
  }

  summary.improvement.nvqDelta = summary.new.meanNVQ - summary.old.meanNVQ
  summary.improvement.passingRateDelta = summary.new.passingRate - summary.old.passingRate
  summary.improvement.componentDeltas = deltaBreakdown(summary.new.avgBreakdown, summary.old.avgBreakdown)

  // Print summary
  console.log('=' .repeat(60))
  console.log('COMPARISON SUMMARY')
  console.log('=' .repeat(60))
  console.log('')
  console.log('                     OLD Pipeline    NEW Pipeline    Delta')
  console.log('-'.repeat(60))
  console.log(`Total notes          ${summary.old.totalNotes.toString().padStart(8)}        ${summary.new.totalNotes.toString().padStart(8)}        ${(summary.new.totalNotes - summary.old.totalNotes >= 0 ? '+' : '') + (summary.new.totalNotes - summary.old.totalNotes)}`)
  console.log(`Mean NVQ             ${summary.old.meanNVQ.toFixed(2).padStart(8)}        ${summary.new.meanNVQ.toFixed(2).padStart(8)}       ${(summary.improvement.nvqDelta >= 0 ? '+' : '') + summary.improvement.nvqDelta.toFixed(2)}`)
  console.log(`Passing rate         ${(summary.old.passingRate * 100).toFixed(1).padStart(7)}%       ${(summary.new.passingRate * 100).toFixed(1).padStart(7)}%      ${(summary.improvement.passingRateDelta >= 0 ? '+' : '') + (summary.improvement.passingRateDelta * 100).toFixed(1)}%`)
  console.log('')
  console.log('Component breakdown (avg):')
  console.log(`  Why (0-3)          ${summary.old.avgBreakdown.why.toFixed(2).padStart(8)}        ${summary.new.avgBreakdown.why.toFixed(2).padStart(8)}       ${(summary.improvement.componentDeltas.why >= 0 ? '+' : '') + summary.improvement.componentDeltas.why.toFixed(2)}`)
  console.log(`  Metadata (0-2)     ${summary.old.avgBreakdown.metadata.toFixed(2).padStart(8)}        ${summary.new.avgBreakdown.metadata.toFixed(2).padStart(8)}       ${(summary.improvement.componentDeltas.metadata >= 0 ? '+' : '') + summary.improvement.componentDeltas.metadata.toFixed(2)}`)
  console.log(`  Taxonomy (0-2)     ${summary.old.avgBreakdown.taxonomy.toFixed(2).padStart(8)}        ${summary.new.avgBreakdown.taxonomy.toFixed(2).padStart(8)}       ${(summary.improvement.componentDeltas.taxonomy >= 0 ? '+' : '') + summary.improvement.componentDeltas.taxonomy.toFixed(2)}`)
  console.log(`  Connectivity (0-2) ${summary.old.avgBreakdown.connectivity.toFixed(2).padStart(8)}        ${summary.new.avgBreakdown.connectivity.toFixed(2).padStart(8)}       ${(summary.improvement.componentDeltas.connectivity >= 0 ? '+' : '') + summary.improvement.componentDeltas.connectivity.toFixed(2)}`)
  console.log(`  Originality (0-1)  ${summary.old.avgBreakdown.originality.toFixed(2).padStart(8)}        ${summary.new.avgBreakdown.originality.toFixed(2).padStart(8)}       ${(summary.improvement.componentDeltas.originality >= 0 ? '+' : '') + summary.improvement.componentDeltas.originality.toFixed(2)}`)
  console.log('')

  // Side-by-side examples
  if (showSideBySide && results.length > 0) {
    console.log('=' .repeat(60))
    console.log('SIDE-BY-SIDE EXAMPLES')
    console.log('=' .repeat(60))

    // Find best improvement case
    const bestImprovement = results.reduce((best, r) =>
      r.improvement.nvqDelta > best.improvement.nvqDelta ? r : best
    )

    console.log(`\nDocument: "${bestImprovement.documentTitle}"`)
    console.log(`NVQ improvement: +${bestImprovement.improvement.nvqDelta.toFixed(1)}\n`)

    console.log('--- OLD Pipeline Note ---')
    if (bestImprovement.oldPipeline.notes[0]) {
      const n = bestImprovement.oldPipeline.notes[0]
      console.log(`Title: ${n.title}`)
      console.log(`NVQ: ${n.nvqScore.total}/10`)
      console.log(`Content: ${n.content.slice(0, 200)}...`)
    } else {
      console.log('(no notes extracted)')
    }

    console.log('\n--- NEW Pipeline Note ---')
    if (bestImprovement.newPipeline.notes[0]) {
      const n = bestImprovement.newPipeline.notes[0]
      console.log(`Title: ${n.title}`)
      console.log(`NVQ: ${n.nvqScore.total}/10`)
      console.log(`Content: ${n.content.slice(0, 200)}...`)
    } else {
      console.log('(no notes extracted)')
    }
    console.log('')
  }

  // Build report
  const report: ComparisonReport = {
    generatedAt: new Date().toISOString(),
    documentsCompared: results.length,
    summary,
    results,
  }

  // Save if requested
  if (shouldSave) {
    const outputPath = path.join(__dirname, '../tests/extraction-accuracy/fixtures/pipeline-comparison-report.json')
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2))
    console.log(`Report saved to: ${outputPath}`)
  }

  console.log('\nDone!')
}

main().catch(console.error)
