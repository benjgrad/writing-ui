/**
 * Regenerate All Atomic Notes
 *
 * Processes all documents AND coaching transcripts through the NVQ extraction pipeline.
 *
 * Usage:
 *   npx tsx scripts/regenerate-all-notes.ts
 *   npx tsx scripts/regenerate-all-notes.ts --dry-run    # Preview only
 *   npx tsx scripts/regenerate-all-notes.ts --limit 5    # Process first 5
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const TARGET_EMAIL = 'ben@grady.cloud'

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const limitIdx = args.indexOf('--limit')
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : Infinity

  console.log('===== Regenerate All Atomic Notes =====\n')
  console.log(`Dry run: ${dryRun}`)
  console.log(`Limit: ${limit === Infinity ? 'none' : limit}\n`)

  // Create admin client (bypasses RLS)
  const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Create auth client just to get user ID
  const authClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  })

  // Auth to get user ID
  const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
    email: TARGET_EMAIL,
    password: process.env.TARGET_USER_PASSWORD!,
  })

  if (authError || !authData.user) {
    console.error('Auth failed:', authError?.message)
    process.exit(1)
  }

  const userId = authData.user.id
  console.log(`User: ${userId.slice(0, 8)}...\n`)

  // Get all documents with sufficient content
  console.log('Fetching documents...')
  const { data: docs, error: docsError } = await adminSupabase
    .from('documents')
    .select('id, title, content, word_count')
    .eq('user_id', userId)
    .gte('word_count', 50)
    .order('created_at', { ascending: false })

  if (docsError) {
    console.error('Error fetching documents:', docsError.message)
    process.exit(1)
  }

  console.log(`Found ${docs?.length || 0} documents`)

  // Get coaching sessions with messages
  console.log('Fetching coaching sessions...')
  const { data: sessions, error: sessionsError } = await adminSupabase
    .from('coaching_sessions')
    .select(
      `
      id,
      goal_id,
      goals (title),
      coaching_messages (role, content, created_at)
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (sessionsError) {
    console.error('Error fetching sessions:', sessionsError.message)
    process.exit(1)
  }

  // Filter sessions with at least 4 messages
  interface SessionRow {
    id: string
    goal_id: string | null
    goals: { title: string } | { title: string }[] | null
    coaching_messages: Array<{ role: string; content: string; created_at: string }>
  }

  const validSessions = ((sessions || []) as SessionRow[]).filter(
    (s) => s.coaching_messages && s.coaching_messages.length >= 4
  )

  console.log(`Found ${validSessions.length} coaching sessions with 4+ messages\n`)

  // Build combined list of content to process
  interface ContentItem {
    type: 'document' | 'coaching'
    id: string
    title: string
    content: string
  }

  const allContent: ContentItem[] = []

  // Add documents
  for (const doc of docs || []) {
    allContent.push({
      type: 'document',
      id: doc.id,
      title: doc.title,
      content: doc.content,
    })
  }

  // Add coaching transcripts
  for (const session of validSessions) {
    const transcript = session.coaching_messages
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n')

    const goalTitle = Array.isArray(session.goals)
      ? session.goals[0]?.title || 'Unlinked Session'
      : session.goals?.title || 'Unlinked Session'

    allContent.push({
      type: 'coaching',
      id: session.id,
      title: `Coaching: ${goalTitle}`,
      content: transcript,
    })
  }

  const itemsToProcess = allContent.slice(0, limit)
  console.log(`Total items to process: ${itemsToProcess.length}`)
  console.log(`  Documents: ${itemsToProcess.filter((i) => i.type === 'document').length}`)
  console.log(`  Coaching: ${itemsToProcess.filter((i) => i.type === 'coaching').length}\n`)

  if (dryRun) {
    console.log('Items that would be processed:')
    itemsToProcess.forEach((item, i) => {
      console.log(`  ${i + 1}. [${item.type}] ${item.title}`)
    })
    console.log('\nRun without --dry-run to process.')
    return
  }

  // Clear existing data
  console.log('Clearing existing extraction queue...')
  await adminSupabase.from('extraction_queue').delete().eq('user_id', userId)

  // Track results
  let totalNotes = 0
  let totalPassing = 0
  const errors: string[] = []

  // Process each item
  for (let i = 0; i < itemsToProcess.length; i++) {
    const item = itemsToProcess[i]
    console.log(`\n[${i + 1}/${itemsToProcess.length}] [${item.type}] ${item.title}`)

    try {
      // Queue extraction
      const contentHash = createHash('sha256').update(item.content).digest('hex')
      const { data: queueData, error: queueError } = await adminSupabase
        .from('extraction_queue')
        .insert({
          user_id: userId,
          source_type: item.type === 'document' ? 'document' : 'coaching_session',
          source_id: item.id,
          content_snapshot: item.content,
          content_hash: contentHash,
          status: 'pending',
        })
        .select()
        .single()

      if (queueError) {
        console.log(`    Error queueing: ${queueError.message}`)
        errors.push(`${item.title}: ${queueError.message}`)
        continue
      }

      // Invoke edge function
      console.log('    Extracting...')
      const { data: fnData, error: fnError } = await adminSupabase.functions.invoke('process-extraction', {
        body: { extraction_id: queueData.id },
      })

      if (fnError) {
        console.log(`    Function error: ${fnError.message}`)
        errors.push(`${item.title}: ${fnError.message}`)
        continue
      }

      const result = fnData as {
        notes_created: number
        nvq_metrics: { mean_nvq: number; passing_rate: number; notes_passing: number }
      }

      totalNotes += result.notes_created
      totalPassing += result.nvq_metrics?.notes_passing || 0

      console.log(
        `    Created ${result.notes_created} notes (mean NVQ: ${result.nvq_metrics?.mean_nvq?.toFixed(1) || 'N/A'}, ${((result.nvq_metrics?.passing_rate || 0) * 100).toFixed(0)}% passing)`
      )
    } catch (err) {
      console.log(`    Error: ${err}`)
      errors.push(`${item.title}: ${err}`)
    }

    // Rate limiting - wait between items
    if (i < itemsToProcess.length - 1) {
      await new Promise((r) => setTimeout(r, 2000))
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('SUMMARY')
  console.log('='.repeat(50))
  console.log(`Items processed: ${itemsToProcess.length}`)
  console.log(`Total notes created: ${totalNotes}`)
  console.log(`Notes passing (NVQ >= 7): ${totalPassing}`)
  console.log(`Overall passing rate: ${totalNotes > 0 ? ((totalPassing / totalNotes) * 100).toFixed(1) : 0}%`)

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`)
    errors.forEach((e) => console.log(`  - ${e}`))
  }

  // Show final note count
  const { data: finalNotes } = await adminSupabase
    .from('atomic_notes')
    .select('id, title, nvq_score, quality_status')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  console.log(`\nTotal notes in database: ${finalNotes?.length || 0}`)
  const passingNotes = finalNotes?.filter((n) => n.quality_status === 'passing').length || 0
  console.log(`Passing notes: ${passingNotes}`)

  // Show sample of created notes
  if (finalNotes && finalNotes.length > 0) {
    console.log('\nSample notes:')
    finalNotes.slice(0, 5).forEach((n) => {
      console.log(`  - ${n.title} (NVQ: ${n.nvq_score}/10)`)
    })
  }

  console.log('\nDone!')
}

main().catch(console.error)
