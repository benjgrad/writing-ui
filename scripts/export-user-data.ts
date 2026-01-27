/**
 * Export User Data for NVQ Pipeline Testing
 *
 * Exports raw documents and coaching sessions from a user account
 * to create test fixtures for the NVQ-integrated extraction pipeline.
 *
 * Usage:
 *   npx tsx scripts/export-user-data.ts
 *   npx tsx scripts/export-user-data.ts --anonymize
 *   npx tsx scripts/export-user-data.ts --output ./my-fixtures.json
 *
 * The exported data is used as INPUT for extraction testing,
 * NOT as quality examples (existing notes may not meet NVQ standards).
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load .env.local
config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const TARGET_EMAIL = 'ben@grady.cloud'

// Default output path
const DEFAULT_OUTPUT = 'tests/extraction-accuracy/fixtures/real-user-data.json'

// ============================================================================
// Types
// ============================================================================

interface ExportedDocument {
  id: string
  title: string
  content: string
  wordCount: number
  createdAt: string
  updatedAt: string
}

interface ExportedCoachingMessage {
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

interface ExportedCoachingSession {
  id: string
  goalTitle: string | null
  messages: ExportedCoachingMessage[]
  createdAt: string
}

interface ExportedUserData {
  exportedAt: string
  userId: string
  anonymized: boolean
  stats: {
    documentCount: number
    totalDocumentWords: number
    coachingSessionCount: number
    totalCoachingMessages: number
  }
  documents: ExportedDocument[]
  coachingSessions: ExportedCoachingSession[]
}

// ============================================================================
// Anonymization
// ============================================================================

/**
 * Simple anonymization patterns
 * Replace personal identifiers while preserving structure
 */
const ANONYMIZATION_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  // Email addresses
  { pattern: /\b[\w.-]+@[\w.-]+\.\w+\b/gi, replacement: '[EMAIL]' },
  // Phone numbers (various formats)
  { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, replacement: '[PHONE]' },
  // URLs (keep structure, anonymize domain)
  { pattern: /https?:\/\/[^\s]+/gi, replacement: '[URL]' },
  // Names that look like "FirstName LastName" - be conservative
  { pattern: /\b(Ben|Benjamin)\s+(Grady)\b/gi, replacement: '[USER_NAME]' },
  // Specific project names can be kept or anonymized
  // { pattern: /writing-ui/gi, replacement: '[PROJECT]' },
]

function anonymizeText(text: string): string {
  let result = text
  for (const { pattern, replacement } of ANONYMIZATION_PATTERNS) {
    result = result.replace(pattern, replacement)
  }
  return result
}

function anonymizeDocument(doc: ExportedDocument): ExportedDocument {
  return {
    ...doc,
    title: anonymizeText(doc.title),
    content: anonymizeText(doc.content),
  }
}

function anonymizeSession(session: ExportedCoachingSession): ExportedCoachingSession {
  return {
    ...session,
    goalTitle: session.goalTitle ? anonymizeText(session.goalTitle) : null,
    messages: session.messages.map((msg) => ({
      ...msg,
      content: anonymizeText(msg.content),
    })),
  }
}

// ============================================================================
// Main Export Logic
// ============================================================================

async function main() {
  // Parse CLI arguments
  const args = process.argv.slice(2)
  const shouldAnonymize = args.includes('--anonymize')
  const outputIndex = args.indexOf('--output')
  const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : DEFAULT_OUTPUT

  console.log('📦 NVQ Pipeline Data Export\n')
  console.log(`   Target user: ${TARGET_EMAIL}`)
  console.log(`   Anonymize: ${shouldAnonymize}`)
  console.log(`   Output: ${outputPath}\n`)

  // Initialize Supabase client with service role
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Authenticate as target user
  const USER_PASSWORD = process.env.TARGET_USER_PASSWORD

  if (!USER_PASSWORD) {
    console.error('❌ Please set TARGET_USER_PASSWORD in .env.local')
    process.exit(1)
  }

  console.log('🔐 Authenticating...')
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TARGET_EMAIL,
    password: USER_PASSWORD,
  })

  if (authError || !authData.user) {
    console.error('❌ Authentication failed:', authError?.message)
    process.exit(1)
  }

  const userId = authData.user.id
  console.log(`✅ Authenticated (${userId.slice(0, 8)}...)\n`)

  // -------------------------------------------------------------------------
  // Export Documents
  // -------------------------------------------------------------------------

  console.log('📄 Fetching documents...')

  const { data: documents, error: docsError } = await supabase
    .from('documents')
    .select('id, title, content, word_count, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (docsError) {
    console.error('❌ Error fetching documents:', docsError.message)
    process.exit(1)
  }

  const exportedDocuments: ExportedDocument[] = (documents || [])
    .filter((doc) => doc.content && doc.content.trim().length > 0)
    .map((doc) => ({
      id: doc.id,
      title: doc.title || 'Untitled',
      content: doc.content,
      wordCount: doc.word_count || 0,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
    }))

  const totalDocWords = exportedDocuments.reduce((sum, d) => sum + d.wordCount, 0)
  console.log(`   Found ${exportedDocuments.length} documents (${totalDocWords.toLocaleString()} words total)`)

  // -------------------------------------------------------------------------
  // Export Coaching Sessions
  // -------------------------------------------------------------------------

  console.log('💬 Fetching coaching sessions...')

  const { data: sessions, error: sessionsError } = await supabase
    .from('coaching_sessions')
    .select(
      `
      id,
      created_at,
      goal_id,
      goals (
        title
      ),
      coaching_messages (
        role,
        content,
        created_at
      )
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (sessionsError) {
    console.error('❌ Error fetching sessions:', sessionsError.message)
    process.exit(1)
  }

  interface SessionRow {
    id: string
    created_at: string
    goal_id: string | null
    goals: { title: string } | null
    coaching_messages: Array<{ role: string; content: string; created_at: string }>
  }

  const exportedSessions: ExportedCoachingSession[] = ((sessions || []) as SessionRow[])
    .filter((s) => s.coaching_messages && s.coaching_messages.length > 0)
    .map((session) => ({
      id: session.id,
      goalTitle: session.goals?.title || null,
      createdAt: session.created_at,
      messages: session.coaching_messages
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          createdAt: msg.created_at,
        })),
    }))

  const totalMessages = exportedSessions.reduce((sum, s) => sum + s.messages.length, 0)
  console.log(`   Found ${exportedSessions.length} sessions (${totalMessages} messages total)\n`)

  // -------------------------------------------------------------------------
  // Apply Anonymization if requested
  // -------------------------------------------------------------------------

  let finalDocuments = exportedDocuments
  let finalSessions = exportedSessions

  if (shouldAnonymize) {
    console.log('🔒 Applying anonymization...')
    finalDocuments = exportedDocuments.map(anonymizeDocument)
    finalSessions = exportedSessions.map(anonymizeSession)
    console.log('   Done\n')
  }

  // -------------------------------------------------------------------------
  // Build Export Object
  // -------------------------------------------------------------------------

  const exportData: ExportedUserData = {
    exportedAt: new Date().toISOString(),
    userId: shouldAnonymize ? '[ANONYMIZED]' : userId,
    anonymized: shouldAnonymize,
    stats: {
      documentCount: finalDocuments.length,
      totalDocumentWords: totalDocWords,
      coachingSessionCount: finalSessions.length,
      totalCoachingMessages: totalMessages,
    },
    documents: finalDocuments,
    coachingSessions: finalSessions,
  }

  // -------------------------------------------------------------------------
  // Write to File
  // -------------------------------------------------------------------------

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2))

  console.log('✅ Export complete!\n')
  console.log('📊 Summary:')
  console.log(`   Documents: ${exportData.stats.documentCount}`)
  console.log(`   Document words: ${exportData.stats.totalDocumentWords.toLocaleString()}`)
  console.log(`   Coaching sessions: ${exportData.stats.coachingSessionCount}`)
  console.log(`   Coaching messages: ${exportData.stats.totalCoachingMessages}`)
  console.log(`\n📁 Output: ${outputPath}`)

  // Show sample content
  if (finalDocuments.length > 0) {
    console.log('\n📝 Sample document:')
    const sample = finalDocuments[0]
    console.log(`   Title: ${sample.title}`)
    console.log(`   Words: ${sample.wordCount}`)
    console.log(`   Preview: ${sample.content.slice(0, 100).replace(/\n/g, ' ')}...`)
  }

  if (finalSessions.length > 0) {
    console.log('\n💬 Sample session:')
    const sample = finalSessions[0]
    console.log(`   Goal: ${sample.goalTitle || '(no goal)'}`)
    console.log(`   Messages: ${sample.messages.length}`)
    if (sample.messages[0]) {
      console.log(`   First message: ${sample.messages[0].content.slice(0, 80).replace(/\n/g, ' ')}...`)
    }
  }

  console.log('\n✨ Use this data as INPUT for NVQ extraction testing.')
  console.log('   Remember: existing extracted notes may not meet NVQ quality standards.')
}

main().catch((error) => {
  console.error('❌ Export failed:', error)
  process.exit(1)
})
