// Deno runtime Edge Function for Supabase
// Processes extraction queue items and creates atomic notes
// Knowledge-aware version: queries existing notes for context before extraction

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

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
    const { data: allNotes, error } = await supabase
      .from('atomic_notes')
      .select('id, title, content')
      .eq('user_id', userId)

    if (error || !allNotes) {
      return []
    }

    // Score notes by keyword match count
    const scoredNotes = allNotes.map((note: { id: string; title: string; content: string }) => {
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
      .filter((n: { score: number }) => n.score > 0)
      .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
      .slice(0, limit)
      .map(({ id, title, content }: { id: string; title: string; content: string; score: number }) => ({ id, title, content }))
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

    return (data || []).map((t: { name: string }) => t.name)
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

interface QueueItem {
  id: string
  user_id: string
  source_type: string
  source_id: string
  content_snapshot: string
  attempts: number
  max_attempts: number
}

serve(async (req: Request) => {
  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Claim a pending job atomically
    const { data: jobs, error: claimError } = await supabase
      .rpc('claim_extraction_job')

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
      // Phase 1: Fetch context for knowledge-aware extraction
      console.log(`Processing ${item.source_type} for user ${item.user_id}`)

      const relatedNotes = await getRelatedNotes(supabase, item.user_id, item.content_snapshot)
      console.log(`Found ${relatedNotes.length} related notes for context`)

      const commonTags = await getCommonTags(supabase, item.user_id)
      console.log(`Found ${commonTags.length} common tags`)

      // Build knowledge-aware prompt
      const systemPrompt = buildExtractionPrompt(relatedNotes, commonTags)

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
          max_tokens: 3000,
          system: systemPrompt,
          messages: [
            { role: 'user', content: item.content_snapshot }
          ]
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Anthropic API error: ${response.status} - ${errorText}`)
      }

      const apiResponse = await response.json()

      // Extract text from response
      const textBlock = apiResponse.content?.find((block: { type: string }) => block.type === 'text')
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text response from AI')
      }

      // Parse extracted notes
      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No valid JSON in response')
      }

      const parsed = JSON.parse(jsonMatch[0])
      const extractedNotes: ExtractedNote[] = parsed.notes || []

      if (extractedNotes.length === 0) {
        // Mark as skipped - content wasn't extractable
        await supabase
          .from('extraction_queue')
          .update({
            status: 'skipped',
            notes_created: 0,
            completed_at: new Date().toISOString()
          })
          .eq('id', item.id)

        return new Response(JSON.stringify({
          message: 'No extractable content',
          notes_created: 0
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // Build context notes map for consolidation and cross-doc connections
      const contextNotes: ExistingNote[] = [...relatedNotes]

      // Store extracted notes with consolidation handling
      const createdNotes: Array<{ id: string; title: string }> = []
      let notesConsolidated = 0

      for (const note of extractedNotes) {
        // Check for consolidation
        if (note.consolidate_with && note.merged_content) {
          const existing = contextNotes.find(n =>
            n.title.toLowerCase() === note.consolidate_with!.toLowerCase()
          )

          if (existing) {
            console.log(`Consolidating into: "${existing.title}"`)

            // Save to history before updating (silently handle if table doesn't exist)
            await supabase
              .from('note_history')
              .insert({
                note_id: existing.id,
                title: existing.title,
                content: existing.content,
                changed_by: 'consolidation',
                source_id: item.source_id
              })

            // Update existing note with merged content
            const { error: updateError } = await supabase
              .from('atomic_notes')
              .update({
                content: note.merged_content,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id)

            if (!updateError) {
              // Link new source to existing note
              await supabase.from('note_sources').insert({
                note_id: existing.id,
                source_type: item.source_type,
                source_id: item.source_id
              })

              notesConsolidated++

              // Update context for future consolidations
              existing.content = note.merged_content
            }

            continue // Don't create duplicate
          }
        }

        // Create atomic note
        const { data: noteData, error: noteError } = await supabase
          .from('atomic_notes')
          .insert({
            user_id: item.user_id,
            source_document_id: item.source_type === 'document' ? item.source_id : null,
            title: note.title,
            content: note.content,
            note_type: 'permanent',
            ai_generated: true
          })
          .select('id')
          .single()

        if (noteError || !noteData) {
          console.error('Error creating note:', noteError)
          continue
        }

        createdNotes.push({ id: noteData.id, title: note.title })
        contextNotes.push({ id: noteData.id, title: note.title, content: note.content })

        // Link note to source
        await supabase
          .from('note_sources')
          .insert({
            note_id: noteData.id,
            source_type: item.source_type,
            source_id: item.source_id
          })

        // Create tags
        for (const tagName of note.tags) {
          // Check if tag exists
          const { data: existingTag } = await supabase
            .from('tags')
            .select('id')
            .eq('user_id', item.user_id)
            .eq('name', tagName.toLowerCase())
            .single()

          let tagId: string

          if (existingTag) {
            tagId = existingTag.id
          } else {
            const { data: newTag, error: tagError } = await supabase
              .from('tags')
              .insert({
                user_id: item.user_id,
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
      }

      // Create connections between notes (including cross-document)
      let crossDocConnections = 0
      let intraDocConnections = 0

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
            user_id: item.user_id,
            source_note_id: sourceNote.id,
            target_note_id: targetNote.id,
            connection_type: connection.type,
            strength: connection.strength,
            ai_generated: true
          })

          if (!connError) {
            if (isCrossDoc) {
              crossDocConnections++
            } else {
              intraDocConnections++
            }
          }
        }
      }

      console.log(`Created ${createdNotes.length} notes, consolidated ${notesConsolidated}, cross-doc connections: ${crossDocConnections}, intra-doc: ${intraDocConnections}`)

      // Mark queue item as completed
      await supabase
        .from('extraction_queue')
        .update({
          status: 'completed',
          notes_created: createdNotes.length,
          completed_at: new Date().toISOString()
        })
        .eq('id', item.id)

      return new Response(JSON.stringify({
        message: 'Extraction completed',
        notes_created: createdNotes.length,
        notes: createdNotes
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })

    } catch (extractionError) {
      // Update attempts and potentially mark as failed
      const newAttempts = item.attempts
      const status = newAttempts >= item.max_attempts ? 'failed' : 'pending'

      await supabase
        .from('extraction_queue')
        .update({
          status,
          error_message: extractionError instanceof Error ? extractionError.message : 'Unknown error',
          started_at: null // Reset so it can be claimed again if pending
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
