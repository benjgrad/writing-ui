/**
 * Test NVQ Extraction Pipeline
 *
 * Verifies the deployed NVQ-integrated extraction works correctly.
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const TARGET_EMAIL = 'ben@grady.cloud'

async function main() {
  // Use service role with auth bypass
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  })

  // Get user ID from auth table
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TARGET_EMAIL,
    password: process.env.TARGET_USER_PASSWORD!,
  })

  if (authError || !authData.user) {
    console.error('Auth failed:', authError?.message)
    process.exit(1)
  }

  const userId = authData.user.id

  // Create admin client that bypasses RLS
  const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  console.log('Testing NVQ extraction pipeline...')
  console.log('User:', userId.slice(0, 8) + '...')

  // First, clear any existing extraction queue entries for this user
  console.log('Clearing existing extraction queue...')
  await adminSupabase.from('extraction_queue').delete().eq('user_id', userId)

  // Get a document to test (use admin client to bypass RLS)
  const { data: docs } = await adminSupabase
    .from('documents')
    .select('id, title, content')
    .eq('user_id', userId)
    .gte('word_count', 100)
    .order('created_at', { ascending: false })
    .limit(1)

  if (!docs || docs.length === 0) {
    console.error('No documents found')
    process.exit(1)
  }

  const doc = docs[0]
  console.log('Document:', doc.title)
  console.log('Content preview:', doc.content.slice(0, 100) + '...')

  // Queue extraction (use admin client to bypass RLS)
  console.log('\nQueueing extraction...')
  const contentHash = createHash('sha256').update(doc.content).digest('hex')
  const { data: queueData, error: queueError } = await adminSupabase
    .from('extraction_queue')
    .insert({
      user_id: userId,
      source_type: 'document',
      source_id: doc.id,
      content_snapshot: doc.content,
      content_hash: contentHash,
      status: 'pending',
    })
    .select()
    .single()

  if (queueError) {
    console.error('Queue error:', queueError.message)
    process.exit(1)
  }

  console.log('Queued extraction:', queueData.id)

  // Invoke the edge function
  console.log('Invoking edge function...')
  const { data: fnData, error: fnError } = await adminSupabase.functions.invoke('process-extraction', {
    body: { extraction_id: queueData.id },
  })

  if (fnError) {
    console.error('Function error:', fnError.message)
    // Check queue status
    const { data: queue } = await adminSupabase
      .from('extraction_queue')
      .select('status, error_message')
      .eq('id', queueData.id)
      .single()
    console.log('Queue status:', queue)
    process.exit(1)
  }

  console.log('\nExtraction result:')
  console.log(JSON.stringify(fnData, null, 2))

  // Check created notes
  const { data: notes } = await adminSupabase
    .from('atomic_notes')
    .select('id, title, nvq_score, quality_status, purpose_statement, note_status, note_content_type')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5)

  console.log('\nCreated notes:')
  for (const note of notes || []) {
    console.log('  -', note.title)
    console.log('    NVQ:', note.nvq_score + '/10', '(' + note.quality_status + ')')
    console.log('    Status:', note.note_status, '| Type:', note.note_content_type)
    console.log('    Purpose:', (note.purpose_statement || '').slice(0, 60) + '...')
  }

  console.log('\nDone!')
}

main().catch(console.error)
