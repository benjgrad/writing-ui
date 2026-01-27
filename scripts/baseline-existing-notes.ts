/**
 * Baseline Existing Notes Script
 *
 * Evaluates all existing atomic notes in the database using the NVQ scorer
 * to establish a quality baseline BEFORE the NVQ pipeline was implemented.
 *
 * Usage:
 *   npx tsx scripts/baseline-existing-notes.ts
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const TARGET_EMAIL = 'ben@grady.cloud'

// ============================================================================
// NVQ Evaluator (same as production)
// ============================================================================

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

const PURPOSE_PATTERNS = {
  firstPerson: /\b(I|my|me|we|our)\b/i,
  purpose: /keeping this because|reason for this|purpose is|why this matters/i,
  actionable: /\b(implement|apply|use|try|test|build|create|improve|practice|avoid|remember|ensure)\b/i,
}

const FUNCTIONAL_TAG_PREFIXES = ['task/', 'skill/', 'insight/', 'project/', 'evolution/', 'decision/']

function evaluateExistingNote(note: {
  title: string
  content: string
  purpose_statement: string | null
  note_status: string | null
  note_content_type: string | null
  stakeholder: string | null
  project_link: string | null
  tags: string[]
  connections: Array<{ target_title: string; connection_type: string }>
}): NVQScore {
  const combined = `${note.purpose_statement || ''} ${note.content}`.toLowerCase()

  // Why component (0-3)
  let whyScore = 0
  if (PURPOSE_PATTERNS.firstPerson.test(combined)) whyScore++
  if (PURPOSE_PATTERNS.purpose.test(combined) || note.purpose_statement) whyScore++
  if (PURPOSE_PATTERNS.actionable.test(combined)) whyScore++

  // Metadata component (0-2)
  let metadataFields = 0
  if (note.note_status) metadataFields++
  if (note.note_content_type) metadataFields++
  if (note.stakeholder) metadataFields++
  if (note.project_link) metadataFields++
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
    (c) =>
      c.connection_type === 'upward' ||
      c.target_title.toLowerCase().includes('moc/') ||
      c.target_title.toLowerCase().includes('project/')
  )
  const sidewaysLinks = note.connections.filter(
    (c) =>
      c.connection_type === 'sideways' ||
      c.connection_type === 'related' ||
      c.connection_type === 'extends' ||
      c.connection_type === 'supports'
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
// Main
// ============================================================================

async function main() {
  console.log('===== Existing Notes NVQ Baseline =====\n')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Auth
  const USER_PASSWORD = process.env.TARGET_USER_PASSWORD
  if (!USER_PASSWORD) {
    console.error('Set TARGET_USER_PASSWORD in .env.local')
    process.exit(1)
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TARGET_EMAIL,
    password: USER_PASSWORD,
  })

  if (authError || !authData.user) {
    console.error('Auth failed:', authError?.message)
    process.exit(1)
  }

  const userId = authData.user.id
  console.log(`User: ${TARGET_EMAIL} (${userId.slice(0, 8)}...)\n`)

  // Fetch all atomic notes (only columns that exist pre-migration)
  console.log('Fetching atomic notes...')
  const { data: notes, error: notesError } = await supabase
    .from('atomic_notes')
    .select(
      `
      id,
      title,
      content,
      ai_generated,
      created_at
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (notesError) {
    console.error('Error fetching notes:', notesError.message)
    process.exit(1)
  }

  console.log(`Found ${notes?.length || 0} atomic notes\n`)

  if (!notes || notes.length === 0) {
    console.log('No notes to evaluate.')
    return
  }

  // Fetch tags for each note
  const noteIds = notes.map((n) => n.id)
  const { data: noteTags } = await supabase
    .from('note_tags')
    .select('note_id, tags(name)')
    .in('note_id', noteIds)

  const tagsByNote: Record<string, string[]> = {}
  for (const nt of noteTags || []) {
    const noteId = nt.note_id
    const tagRecord = nt.tags as { name: string } | { name: string }[] | null
    const tagName = Array.isArray(tagRecord) ? tagRecord[0]?.name : tagRecord?.name
    if (tagName) {
      tagsByNote[noteId] = tagsByNote[noteId] || []
      tagsByNote[noteId].push(tagName)
    }
  }

  // Fetch connections for each note
  const { data: connections } = await supabase
    .from('note_connections')
    .select('source_note_id, target_note_id, connection_type')
    .in('source_note_id', noteIds)

  // Build target title lookup
  const targetIds = [...new Set((connections || []).map((c) => c.target_note_id))]
  const { data: targetNotes } = await supabase.from('atomic_notes').select('id, title').in('id', targetIds)

  const titleById: Record<string, string> = {}
  for (const tn of targetNotes || []) {
    titleById[tn.id] = tn.title
  }

  const connectionsByNote: Record<string, Array<{ target_title: string; connection_type: string }>> = {}
  for (const c of connections || []) {
    const noteId = c.source_note_id
    connectionsByNote[noteId] = connectionsByNote[noteId] || []
    connectionsByNote[noteId].push({
      target_title: titleById[c.target_note_id] || '',
      connection_type: c.connection_type,
    })
  }

  // Evaluate each note (pre-migration notes lack NVQ fields)
  const scores: NVQScore[] = []
  const noteDetails: Array<{ title: string; nvq: NVQScore; aiGenerated: boolean }> = []

  for (const note of notes) {
    const nvq = evaluateExistingNote({
      title: note.title,
      content: note.content,
      purpose_statement: null, // Pre-migration: doesn't exist
      note_status: null, // Pre-migration: doesn't exist
      note_content_type: null, // Pre-migration: doesn't exist
      stakeholder: null, // Pre-migration: doesn't exist
      project_link: null, // Pre-migration: doesn't exist
      tags: tagsByNote[note.id] || [],
      connections: connectionsByNote[note.id] || [],
    })
    scores.push(nvq)
    noteDetails.push({ title: note.title, nvq, aiGenerated: note.ai_generated })
  }

  // Calculate aggregate metrics
  const totalNotes = scores.length
  const passingNotes = scores.filter((s) => s.passing).length
  const meanNVQ = scores.reduce((sum, s) => sum + s.total, 0) / totalNotes
  const passingRate = passingNotes / totalNotes

  const avgBreakdown = {
    why: scores.reduce((s, n) => s + n.breakdown.why, 0) / totalNotes,
    metadata: scores.reduce((s, n) => s + n.breakdown.metadata, 0) / totalNotes,
    taxonomy: scores.reduce((s, n) => s + n.breakdown.taxonomy, 0) / totalNotes,
    connectivity: scores.reduce((s, n) => s + n.breakdown.connectivity, 0) / totalNotes,
    originality: scores.reduce((s, n) => s + n.breakdown.originality, 0) / totalNotes,
  }

  // Score distribution
  const distribution: Record<number, number> = {}
  for (let i = 0; i <= 10; i++) distribution[i] = 0
  scores.forEach((s) => {
    distribution[s.total] = (distribution[s.total] || 0) + 1
  })

  // AI-generated vs manual
  const aiNotes = noteDetails.filter((n) => n.aiGenerated)
  const manualNotes = noteDetails.filter((n) => !n.aiGenerated)

  const aiMeanNVQ = aiNotes.length > 0 ? aiNotes.reduce((s, n) => s + n.nvq.total, 0) / aiNotes.length : 0
  const manualMeanNVQ = manualNotes.length > 0 ? manualNotes.reduce((s, n) => s + n.nvq.total, 0) / manualNotes.length : 0

  // Print results
  console.log('=' .repeat(60))
  console.log('EXISTING NOTES BASELINE')
  console.log('=' .repeat(60))
  console.log('')
  console.log(`Total notes:        ${totalNotes}`)
  console.log(`Mean NVQ:           ${meanNVQ.toFixed(2)}/10`)
  console.log(`Passing (>=7):      ${passingNotes} (${(passingRate * 100).toFixed(1)}%)`)
  console.log('')
  console.log('Component breakdown (avg):')
  console.log(`  Why (0-3):        ${avgBreakdown.why.toFixed(2)}`)
  console.log(`  Metadata (0-2):   ${avgBreakdown.metadata.toFixed(2)}`)
  console.log(`  Taxonomy (0-2):   ${avgBreakdown.taxonomy.toFixed(2)}`)
  console.log(`  Connectivity (0-2): ${avgBreakdown.connectivity.toFixed(2)}`)
  console.log(`  Originality (0-1): ${avgBreakdown.originality.toFixed(2)}`)
  console.log('')
  console.log('Score distribution:')
  for (let i = 0; i <= 10; i++) {
    const count = distribution[i] || 0
    const bar = '█'.repeat(Math.min(count, 50))
    console.log(`  ${i.toString().padStart(2)}/10: ${bar} ${count}`)
  }
  console.log('')
  console.log('By source:')
  console.log(`  AI-generated:     ${aiNotes.length} notes, mean NVQ ${aiMeanNVQ.toFixed(2)}`)
  console.log(`  Manual:           ${manualNotes.length} notes, mean NVQ ${manualMeanNVQ.toFixed(2)}`)
  console.log('')

  // Show lowest scoring notes
  const sorted = [...noteDetails].sort((a, b) => a.nvq.total - b.nvq.total)
  console.log('Lowest scoring notes (candidates for improvement):')
  sorted.slice(0, 5).forEach((n, i) => {
    const b = n.nvq.breakdown
    console.log(`  ${i + 1}. "${n.title.slice(0, 40)}..." - ${n.nvq.total}/10`)
    console.log(`     why=${b.why} meta=${b.metadata} tax=${b.taxonomy} conn=${b.connectivity} orig=${b.originality}`)
  })

  console.log('')
  console.log('Highest scoring notes:')
  sorted.slice(-3).reverse().forEach((n, i) => {
    const b = n.nvq.breakdown
    console.log(`  ${i + 1}. "${n.title.slice(0, 40)}..." - ${n.nvq.total}/10`)
    console.log(`     why=${b.why} meta=${b.metadata} tax=${b.taxonomy} conn=${b.connectivity} orig=${b.originality}`)
  })

  console.log('\nDone!')
}

main().catch(console.error)
