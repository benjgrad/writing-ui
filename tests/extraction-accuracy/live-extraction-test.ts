#!/usr/bin/env npx tsx
/**
 * Live Extraction Test
 *
 * Tests the actual extraction pipeline by:
 * 1. Authenticating as a target user
 * 2. Clearing their atomic notes
 * 3. Processing their EXISTING documents through the extraction queue
 * 4. Processing documents one at a time, some out of order, some multiple times
 *
 * Usage:
 *   npx tsx tests/extraction-accuracy/live-extraction-test.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const TARGET_EMAIL = 'ben@grady.cloud'
const TARGET_PASSWORD = process.env.TARGET_USER_PASSWORD!

if (!TARGET_PASSWORD) {
  console.error('ERROR: TARGET_USER_PASSWORD not set in .env.local')
  process.exit(1)
}

interface Document {
  id: string
  title: string
  content: string
  word_count: number
  created_at: string
}

/**
 * Wait for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Create authenticated Supabase client
 */
async function createAuthenticatedClient(): Promise<{ client: SupabaseClient; userId: string }> {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  console.log(`\nAuthenticating as ${TARGET_EMAIL}...`)
  const { data, error } = await client.auth.signInWithPassword({
    email: TARGET_EMAIL,
    password: TARGET_PASSWORD,
  })

  if (error) {
    throw new Error(`Authentication failed: ${error.message}`)
  }

  console.log(`  Authenticated as user: ${data.user.id}`)
  return { client, userId: data.user.id }
}

/**
 * Clear all atomic notes for the user
 */
async function clearAtomicNotes(userId: string): Promise<number> {
  // Use service role for deletion
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  console.log('\nClearing atomic notes...')

  // First get all note IDs for this user
  const { data: userNotes } = await adminClient
    .from('atomic_notes')
    .select('id')
    .eq('user_id', userId)

  const noteIds = (userNotes || []).map(n => n.id)
  console.log(`  Found ${noteIds.length} notes to delete`)

  if (noteIds.length > 0) {
    // Delete note_tags relationships
    const { error: tagError } = await adminClient
      .from('note_tags')
      .delete()
      .in('note_id', noteIds)
    if (tagError) console.log(`  note_tags delete: ${tagError.message}`)

    // Delete note_connections
    const { error: connError } = await adminClient
      .from('note_connections')
      .delete()
      .eq('user_id', userId)
    if (connError) console.log(`  note_connections delete: ${connError.message}`)

    // Delete note_sources
    const { error: srcError } = await adminClient
      .from('note_sources')
      .delete()
      .in('note_id', noteIds)
    if (srcError) console.log(`  note_sources delete: ${srcError.message}`)

    // Delete note_history
    const { error: histError } = await adminClient
      .from('note_history')
      .delete()
      .in('note_id', noteIds)
    if (histError) console.log(`  note_history delete: ${histError.message}`)

    // Delete atomic notes
    const { error: noteError } = await adminClient
      .from('atomic_notes')
      .delete()
      .eq('user_id', userId)

    if (noteError) {
      throw new Error(`Failed to delete notes: ${noteError.message}`)
    }
  }

  // Clear extraction queue
  const { error: queueError } = await adminClient
    .from('extraction_queue')
    .delete()
    .eq('user_id', userId)
  if (queueError) console.log(`  extraction_queue delete: ${queueError.message}`)

  console.log(`  Deleted ${noteIds.length} atomic notes`)
  return noteIds.length
}

/**
 * Get all documents for the user
 */
async function getDocuments(client: SupabaseClient, userId: string): Promise<Document[]> {
  const { data, error } = await client
    .from('documents')
    .select('id, title, content, word_count, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to get documents: ${error.message}`)
  }

  return data || []
}

/**
 * Queue a document for extraction
 */
async function queueDocumentForExtraction(
  userId: string,
  doc: Document
): Promise<void> {
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Calculate content hash
  const encoder = new TextEncoder()
  const data = encoder.encode(doc.content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  const { error } = await adminClient
    .from('extraction_queue')
    .insert({
      user_id: userId,
      source_type: 'document',
      source_id: doc.id,
      content_snapshot: doc.content,
      content_hash: contentHash,
      status: 'pending',
      attempts: 0,
      max_attempts: 3,
    })

  if (error) {
    // Might be duplicate - that's okay
    if (error.code === '23505') {
      console.log(`    (Already queued or duplicate content)`)
    } else {
      console.log(`    Queue error: ${error.message}`)
    }
  }
}

/**
 * Trigger extraction processing
 */
async function triggerExtraction(): Promise<{ notesCreated: number; message: string }> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/process-extraction`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
  })

  const result = await response.json()
  return {
    notesCreated: result.notes_created || 0,
    message: result.message || '',
  }
}

/**
 * Wait for extraction to complete
 */
async function waitForExtraction(client: SupabaseClient, userId: string, maxWait = 60000): Promise<void> {
  const startTime = Date.now()

  while (Date.now() - startTime < maxWait) {
    const { data: pending } = await client
      .from('extraction_queue')
      .select('id, status')
      .eq('user_id', userId)
      .in('status', ['pending', 'processing'])

    if (!pending || pending.length === 0) {
      return
    }

    console.log(`    Waiting for ${pending.length} extraction(s)...`)
    await sleep(3000)
    await triggerExtraction()
  }

  console.warn('    Extraction wait timeout')
}

/**
 * Get current atomic notes count
 */
async function getNotesCount(client: SupabaseClient, userId: string): Promise<number> {
  const { count } = await client
    .from('atomic_notes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  return count || 0
}

/**
 * Get current atomic notes
 */
async function getAtomicNotes(client: SupabaseClient, userId: string): Promise<Array<{
  id: string
  title: string
  content: string
  created_at: string
}>> {
  const { data, error } = await client
    .from('atomic_notes')
    .select('id, title, content, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to get notes: ${error.message}`)
  }

  return data || []
}

/**
 * Get extraction queue status
 */
async function getQueueStatus(client: SupabaseClient, userId: string): Promise<{
  pending: number
  processing: number
  completed: number
  failed: number
  skipped: number
}> {
  const { data } = await client
    .from('extraction_queue')
    .select('status')
    .eq('user_id', userId)

  const counts = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    skipped: 0,
  }

  for (const item of data || []) {
    if (item.status in counts) {
      counts[item.status as keyof typeof counts]++
    }
  }

  return counts
}

/**
 * Shuffle array (Fisher-Yates)
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Main test function
 */
async function main(): Promise<void> {
  console.log('=' .repeat(70))
  console.log('LIVE EXTRACTION TEST - Processing Actual User Documents')
  console.log('=' .repeat(70))

  // Authenticate
  const { client, userId } = await createAuthenticatedClient()

  // Get all documents
  const documents = await getDocuments(client, userId)
  console.log(`\nFound ${documents.length} documents to process`)

  if (documents.length === 0) {
    console.log('No documents found for this user.')
    return
  }

  // Show document list
  console.log('\nDocuments:')
  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i]
    console.log(`  ${i + 1}. "${doc.title}" (${doc.word_count} words)`)
  }

  // Clear existing notes
  await clearAtomicNotes(userId)

  // Verify cleared
  const notesCount = await getNotesCount(client, userId)
  console.log(`\nVerified: ${notesCount} notes remaining after clear`)

  // Process documents one at a time
  console.log('\n' + '='.repeat(70))
  console.log('PHASE 1: Process documents ONE AT A TIME (in creation order)')
  console.log('='.repeat(70))

  // Process first half in order
  const halfPoint = Math.ceil(documents.length / 2)
  const firstHalf = documents.slice(0, halfPoint)

  for (let i = 0; i < firstHalf.length; i++) {
    const doc = firstHalf[i]
    console.log(`\n[${i + 1}/${firstHalf.length}] Processing: "${doc.title}"`)
    console.log(`    Words: ${doc.word_count}, Created: ${new Date(doc.created_at).toLocaleDateString()}`)

    const beforeCount = await getNotesCount(client, userId)

    await queueDocumentForExtraction(userId, doc)
    await sleep(500)
    await triggerExtraction()
    await waitForExtraction(client, userId)

    const afterCount = await getNotesCount(client, userId)
    console.log(`    Notes: ${beforeCount} -> ${afterCount} (+${afterCount - beforeCount})`)
  }

  // Process second half OUT OF ORDER (shuffled)
  console.log('\n' + '='.repeat(70))
  console.log('PHASE 2: Process remaining documents OUT OF ORDER (shuffled)')
  console.log('='.repeat(70))

  const secondHalf = shuffleArray(documents.slice(halfPoint))

  for (let i = 0; i < secondHalf.length; i++) {
    const doc = secondHalf[i]
    console.log(`\n[${i + 1}/${secondHalf.length}] Processing (shuffled): "${doc.title}"`)
    console.log(`    Words: ${doc.word_count}, Created: ${new Date(doc.created_at).toLocaleDateString()}`)

    const beforeCount = await getNotesCount(client, userId)

    await queueDocumentForExtraction(userId, doc)
    await sleep(500)
    await triggerExtraction()
    await waitForExtraction(client, userId)

    const afterCount = await getNotesCount(client, userId)
    console.log(`    Notes: ${beforeCount} -> ${afterCount} (+${afterCount - beforeCount})`)
  }

  // Re-process some documents (should be deduplicated)
  console.log('\n' + '='.repeat(70))
  console.log('PHASE 3: Re-process RANDOM documents (should be deduplicated)')
  console.log('='.repeat(70))

  const reprocessCount = Math.min(5, Math.ceil(documents.length / 3))
  const docsToReprocess = shuffleArray(documents).slice(0, reprocessCount)

  for (let i = 0; i < docsToReprocess.length; i++) {
    const doc = docsToReprocess[i]
    console.log(`\n[${i + 1}/${reprocessCount}] Re-processing: "${doc.title}"`)

    const beforeCount = await getNotesCount(client, userId)

    await queueDocumentForExtraction(userId, doc)
    await sleep(500)
    await triggerExtraction()
    await waitForExtraction(client, userId)

    const afterCount = await getNotesCount(client, userId)
    const diff = afterCount - beforeCount

    if (diff === 0) {
      console.log(`    SUCCESS: Deduplicated (${beforeCount} -> ${afterCount})`)
    } else {
      console.log(`    WARNING: Created ${diff} new notes (${beforeCount} -> ${afterCount})`)
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(70))
  console.log('FINAL RESULTS')
  console.log('='.repeat(70))

  const finalNotes = await getAtomicNotes(client, userId)
  const queueStatus = await getQueueStatus(client, userId)

  console.log(`\nDocuments processed: ${documents.length}`)
  console.log(`Total atomic notes created: ${finalNotes.length}`)
  console.log(`Average notes per document: ${(finalNotes.length / documents.length).toFixed(1)}`)

  console.log(`\nExtraction queue status:`)
  console.log(`  - Completed: ${queueStatus.completed}`)
  console.log(`  - Skipped: ${queueStatus.skipped}`)
  console.log(`  - Failed: ${queueStatus.failed}`)
  console.log(`  - Pending: ${queueStatus.pending}`)

  console.log(`\nSample of created notes (first 20):`)
  for (let i = 0; i < Math.min(20, finalNotes.length); i++) {
    const note = finalNotes[i]
    console.log(`  ${i + 1}. ${note.title}`)
  }

  if (finalNotes.length > 20) {
    console.log(`  ... and ${finalNotes.length - 20} more`)
  }

  // Sign out
  await client.auth.signOut()
  console.log('\n' + '='.repeat(70))
  console.log('Test complete!')
  console.log('='.repeat(70))
}

main().catch(error => {
  console.error('Test failed:', error)
  process.exit(1)
})
