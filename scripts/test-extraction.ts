/**
 * Test script to run knowledge-aware extraction locally
 * Usage: npx tsx scripts/test-extraction.ts
 *
 * This version queries existing notes for context before extraction,
 * enabling cross-document connections and note consolidation.
 */

import { config } from 'dotenv'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

// Load .env.local
config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!

const TARGET_EMAIL = 'ben@grady.cloud'

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

/**
 * Extract keywords from text for searching related notes
 */
function extractKeywords(text: string, limit = 10): string[] {
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w))

  // Count frequency
  const freq = new Map<string, number>()
  words.forEach(w => freq.set(w, (freq.get(w) || 0) + 1))

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word)
}

/**
 * Fetch existing notes that may be related to the new content
 */
async function getRelatedNotes(
  supabase: SupabaseClient,
  userId: string,
  content: string,
  limit = 15
): Promise<Array<{ id: string; title: string; content: string }>> {
  const keywords = extractKeywords(content, 8)

  if (keywords.length === 0) {
    return []
  }

  try {
    // Fetch all user's notes and filter in-memory by keyword presence
    // This is simpler and more reliable than full-text search which may not be indexed
    const { data: allNotes, error } = await supabase
      .from('atomic_notes')
      .select('id, title, content')
      .eq('user_id', userId)

    if (error || !allNotes) {
      return []
    }

    // Score notes by keyword match count
    const scoredNotes = allNotes.map(note => {
      const titleLower = note.title.toLowerCase()
      const contentLower = note.content.toLowerCase()
      let score = 0

      for (const kw of keywords) {
        if (titleLower.includes(kw)) score += 2 // Title matches worth more
        if (contentLower.includes(kw)) score += 1
      }

      return { ...note, score }
    })

    // Return notes with at least one keyword match, sorted by score
    return scoredNotes
      .filter(n => n.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ id, title, content }) => ({ id, title, content }))
  } catch {
    return []
  }
}

/**
 * Fetch commonly used tags for the user
 */
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

    return (data || []).map(t => t.name)
  } catch {
    return []
  }
}

/**
 * Build the knowledge-aware extraction prompt
 */
function buildExtractionPrompt(
  relatedNotes: Array<{ id: string; title: string; content: string }>,
  commonTags: string[]
): string {
  let prompt = `You are an expert at extracting atomic notes in the Zettelkasten method. Given a piece of writing, extract discrete, atomic ideas that stand on their own.

`

  // Add existing notes context if available
  if (relatedNotes.length > 0) {
    prompt += `EXISTING RELATED NOTES (reference these for connections and consolidation):
${relatedNotes.map(n => `- "${n.title}": ${n.content}`).join('\n')}

`
  }

  // Add common tags if available
  if (commonTags.length > 0) {
    prompt += `EXISTING TAGS (prefer these when applicable):
${commonTags.join(', ')}

`
  }

  prompt += `INSTRUCTIONS:
1. For each atomic idea in the new content:
   - Check if substantially similar to an existing note above
   - If similar: set "consolidate_with" to the existing note's title AND provide "merged_content" that synthesizes both insights
   - If new but related: create connections to existing notes (use their exact titles)
   - If truly new: create fresh note

2. Connection types: related, supports, contradicts, extends, example_of

3. Cross-document connections are valuable - link to existing notes freely when relevant

For each atomic note:
- Give it a clear, descriptive title (max 10 words)
- Write a concise explanation of the idea (1-3 sentences)
- Assign relevant tags (2-5 tags)
- Identify connections to other notes (both new and existing)

Respond with valid JSON in this exact format:
{
  "notes": [
    {
      "title": "Note title here",
      "content": "The atomic idea explained clearly.",
      "consolidate_with": null,
      "merged_content": null,
      "tags": ["tag1", "tag2"],
      "connections": [
        {
          "targetTitle": "Title of connected note (can be existing or new)",
          "type": "related",
          "strength": 0.8
        }
      ]
    }
  ]
}

When consolidating:
- Set "consolidate_with" to the exact title of the existing note to merge into
- Set "merged_content" to an enriched version combining old + new insights (richer than either alone)

Focus on:
- Extracting truly atomic ideas (one concept per note)
- Making notes that are useful independently
- Identifying meaningful relationships (especially to existing notes!)
- Quality over quantity

If the text doesn't contain extractable atomic ideas, return: {"notes": []}`

  return prompt
}

interface ExtractedNote {
  title: string
  content: string
  consolidate_with: string | null
  merged_content: string | null
  tags: string[]
  connections: Array<{
    targetTitle: string
    type: string
    strength: number
  }>
}

interface ExistingNote {
  id: string
  title: string
  content: string
}

interface Document {
  id: string
  title: string
  content: string
  word_count: number
}

async function main() {
  console.log('🔍 Starting knowledge-aware extraction test...\n')

  // Initialize clients
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

  // Sign in as the target user to access their data
  console.log(`📧 Signing in as: ${TARGET_EMAIL}`)

  const USER_PASSWORD = process.env.TARGET_USER_PASSWORD

  if (!USER_PASSWORD) {
    console.error('❌ Please set TARGET_USER_PASSWORD environment variable')
    console.log('   Example: TARGET_USER_PASSWORD=yourpassword npx tsx scripts/test-extraction.ts')
    process.exit(1)
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TARGET_EMAIL,
    password: USER_PASSWORD
  })

  if (authError || !authData.user) {
    console.error('❌ Authentication failed:', authError?.message)
    process.exit(1)
  }

  const profile = { id: authData.user.id, email: authData.user.email }
  console.log(`✅ Authenticated as: ${profile.id}\n`)

  // Fetch common tags once (reused across all extractions)
  console.log('🏷️ Fetching common tags...')
  const commonTags = await getCommonTags(supabase, profile.id)
  console.log(`   Found ${commonTags.length} existing tags\n`)

  // Fetch documents
  console.log('📄 Fetching documents...')
  const { data: documents, error: docsError } = await supabase
    .from('documents')
    .select('id, title, content, word_count')
    .eq('user_id', profile.id)
    .gte('word_count', 50)

  if (docsError) {
    console.error('❌ Error fetching documents:', docsError.message)
  } else {
    console.log(`   Found ${documents?.length || 0} documents with 50+ words`)
  }

  // Fetch coaching sessions with messages
  console.log('💬 Fetching coaching sessions...')
  const { data: sessions, error: sessionsError } = await supabase
    .from('coaching_sessions')
    .select(`
      id,
      goal_id,
      coaching_messages (
        role,
        content,
        created_at
      )
    `)
    .eq('user_id', profile.id)

  if (sessionsError) {
    console.error('❌ Error fetching sessions:', sessionsError.message)
  } else {
    const validSessions = sessions?.filter(s => (s.coaching_messages as unknown[])?.length >= 4) || []
    console.log(`   Found ${validSessions.length} sessions with 4+ messages\n`)
  }

  // Prepare content for extraction
  const contentToExtract: Array<{ type: string; id: string; content: string }> = []

  // Add documents
  if (documents) {
    for (const doc of documents as Document[]) {
      if (doc.content && doc.content.trim().length > 0) {
        contentToExtract.push({
          type: 'document',
          id: doc.id,
          content: `Title: ${doc.title}\n\n${doc.content}`
        })
      }
    }
  }

  // Add coaching transcripts
  if (sessions) {
    for (const session of sessions) {
      const messages = session.coaching_messages as Array<{ role: string; content: string; created_at: string }>
      if (messages && messages.length >= 4) {
        const transcript = messages
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map(m => `${m.role}: ${m.content}`)
          .join('\n\n')

        contentToExtract.push({
          type: 'coaching_session',
          id: session.id,
          content: transcript
        })
      }
    }
  }

  console.log(`📝 Total content items to process: ${contentToExtract.length}\n`)

  if (contentToExtract.length === 0) {
    console.log('⚠️ No content found to extract. Exiting.')
    process.exit(0)
  }

  // Track all notes (existing + newly created) for cross-document connections
  let allKnownNotes: ExistingNote[] = []

  // Stats
  const stats = {
    notesCreated: 0,
    notesConsolidated: 0,
    crossDocConnections: 0,
    intraDocConnections: 0
  }

  const allCreatedNotes: Array<{ id: string; title: string; sourceType: string }> = []

  for (const item of contentToExtract) {
    console.log(`\n🔄 Processing ${item.type} (${item.id.slice(0, 8)}...)`)
    console.log(`   Content preview: ${item.content.slice(0, 100).replace(/\n/g, ' ')}...`)

    try {
      // Phase 1: Get related existing notes for context
      console.log('   📚 Fetching related notes for context...')
      const relatedNotes = await getRelatedNotes(supabase, profile.id, item.content)
      console.log(`      Found ${relatedNotes.length} potentially related notes`)

      // Merge with all known notes for connection resolution
      const contextNotes = [...relatedNotes]
      for (const known of allKnownNotes) {
        if (!contextNotes.find(n => n.id === known.id)) {
          contextNotes.push(known)
        }
      }

      // Phase 2: Build knowledge-aware prompt and extract
      const systemPrompt = buildExtractionPrompt(relatedNotes, commonTags)

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        system: systemPrompt,
        messages: [{ role: 'user', content: item.content }]
      })

      const textBlock = response.content.find(block => block.type === 'text')
      if (!textBlock || textBlock.type !== 'text') {
        console.log('   ⚠️ No text response from AI')
        continue
      }

      // Parse extracted notes
      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.log('   ⚠️ No valid JSON in response')
        continue
      }

      const parsed = JSON.parse(jsonMatch[0])
      const extractedNotes: ExtractedNote[] = parsed.notes || []

      console.log(`   ✅ Extracted ${extractedNotes.length} atomic notes`)

      if (extractedNotes.length === 0) {
        continue
      }

      // Phase 3: Process notes with consolidation logic
      const createdNotes: Array<{ id: string; title: string }> = []

      for (const note of extractedNotes) {
        // Check for consolidation
        if (note.consolidate_with && note.merged_content) {
          const existing = contextNotes.find(n =>
            n.title.toLowerCase() === note.consolidate_with!.toLowerCase()
          )

          if (existing) {
            console.log(`      🔄 Consolidating into: "${existing.title}"`)

            // Save to history before updating
            const { error: historyError } = await supabase
              .from('note_history')
              .insert({
                note_id: existing.id,
                title: existing.title,
                content: existing.content,
                changed_by: 'consolidation',
                source_id: item.id
              })

            if (historyError) {
              console.log(`         ⚠️ Error saving history: ${historyError.message}`)
            }

            // Update existing note with merged content
            const { error: updateError } = await supabase
              .from('atomic_notes')
              .update({
                content: note.merged_content,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id)

            if (updateError) {
              console.log(`         ❌ Error updating note: ${updateError.message}`)
            } else {
              console.log(`         ✅ Updated content with merged insights`)

              // Link new source to existing note
              await supabase.from('note_sources').insert({
                note_id: existing.id,
                source_type: item.type,
                source_id: item.id
              })

              stats.notesConsolidated++

              // Update known content for future consolidations
              existing.content = note.merged_content
            }

            continue // Don't create duplicate
          }
        }

        // Create new atomic note
        const { data: noteData, error: noteError } = await supabase
          .from('atomic_notes')
          .insert({
            user_id: profile.id,
            source_document_id: item.type === 'document' ? item.id : null,
            title: note.title,
            content: note.content,
            note_type: 'permanent',
            ai_generated: true
          })
          .select('id')
          .single()

        if (noteError) {
          console.log(`      ❌ Error creating note "${note.title}": ${noteError.message}`)
          continue
        }

        createdNotes.push({ id: noteData.id, title: note.title })
        allCreatedNotes.push({ id: noteData.id, title: note.title, sourceType: item.type })
        allKnownNotes.push({ id: noteData.id, title: note.title, content: note.content })
        stats.notesCreated++
        console.log(`      📌 Created: "${note.title}"`)

        // Link note to source
        const { error: sourceError } = await supabase
          .from('note_sources')
          .insert({
            note_id: noteData.id,
            source_type: item.type,
            source_id: item.id
          })

        if (sourceError) {
          console.log(`         ⚠️ Error linking source: ${sourceError.message}`)
        }

        // Create tags
        for (const tagName of note.tags) {
          const { data: existingTag } = await supabase
            .from('tags')
            .select('id')
            .eq('user_id', profile.id)
            .eq('name', tagName.toLowerCase())
            .single()

          let tagId: string

          if (existingTag) {
            tagId = existingTag.id
          } else {
            const { data: newTag, error: tagError } = await supabase
              .from('tags')
              .insert({
                user_id: profile.id,
                name: tagName.toLowerCase()
              })
              .select('id')
              .single()

            if (tagError) {
              continue
            }
            tagId = newTag.id
          }

          await supabase.from('note_tags').insert({
            note_id: noteData.id,
            tag_id: tagId
          })
        }
        console.log(`         🏷️ Tags: ${note.tags.join(', ')}`)
      }

      // Phase 4: Create connections (including cross-document)
      for (const note of extractedNotes) {
        // Skip if this note was consolidated
        if (note.consolidate_with) continue

        const sourceNote = createdNotes.find(n => n.title === note.title)
        if (!sourceNote) continue

        for (const connection of note.connections) {
          // Try to find target in newly created notes
          let targetNote = createdNotes.find(n =>
            n.title.toLowerCase() === connection.targetTitle.toLowerCase()
          )

          // If not found, check existing notes (cross-document connection!)
          let isCrossDoc = false
          if (!targetNote) {
            const existingTarget = contextNotes.find(n =>
              n.title.toLowerCase() === connection.targetTitle.toLowerCase()
            )
            if (existingTarget) {
              targetNote = { id: existingTarget.id, title: existingTarget.title }
              isCrossDoc = true
            }
          }

          if (!targetNote) continue

          const { error: connError } = await supabase.from('note_connections').insert({
            user_id: profile.id,
            source_note_id: sourceNote.id,
            target_note_id: targetNote.id,
            connection_type: connection.type,
            strength: connection.strength,
            ai_generated: true
          })

          if (!connError) {
            if (isCrossDoc) {
              stats.crossDocConnections++
              console.log(`         🌐 Cross-doc: ${sourceNote.title} → ${targetNote.title} (${connection.type})`)
            } else {
              stats.intraDocConnections++
              console.log(`         🔗 ${sourceNote.title} → ${targetNote.title} (${connection.type})`)
            }
          }
        }
      }

    } catch (error) {
      console.error(`   ❌ Error processing:`, error)
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 KNOWLEDGE-AWARE EXTRACTION SUMMARY')
  console.log('='.repeat(60))
  console.log(`Notes created: ${stats.notesCreated}`)
  console.log(`Notes consolidated: ${stats.notesConsolidated}`)
  console.log(`Cross-document connections: ${stats.crossDocConnections}`)
  console.log(`Intra-document connections: ${stats.intraDocConnections}`)
  console.log(`\nFrom documents: ${allCreatedNotes.filter(n => n.sourceType === 'document').length}`)
  console.log(`From coaching: ${allCreatedNotes.filter(n => n.sourceType === 'coaching_session').length}`)

  if (stats.crossDocConnections > 0) {
    const crossDocRate = Math.round((stats.crossDocConnections / (stats.crossDocConnections + stats.intraDocConnections)) * 100)
    console.log(`\n🎯 Cross-document connection rate: ${crossDocRate}%`)
  }

  console.log('\nNew notes:')
  for (const note of allCreatedNotes) {
    console.log(`  • ${note.title}`)
  }
  console.log('\n✅ Done!')
}

main().catch(console.error)
