import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAIProvider } from '@/lib/ai'
import { createNVQEvaluator, toStorableBreakdown, getQualityStatus } from '@/lib/nvq'
import type { NVQExtractedNote, NVQEvaluatorConfig } from '@/lib/nvq'
import { buildNVQExtractionPrompt, type NVQExtractionContext } from '@/lib/ai/prompts/nvq-extraction'
import { buildRefinementPrompt } from '@/lib/ai/prompts/nvq-refinement'

interface ExtractedNoteWithNVQ extends NVQExtractedNote {
  consolidate_with?: string | null
  merged_content?: string | null
}

/**
 * Fetch context for NVQ-aware extraction
 */
async function fetchExtractionContext(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  userId: string,
  content: string
): Promise<NVQExtractionContext> {
  // Fetch related notes by keyword matching
  const keywords = content
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 10)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [notesResult, tagsResult, goalsResult] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('atomic_notes').select('id, title, content').eq('user_id', userId),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('tags').select('name').eq('user_id', userId).limit(30),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('goals').select('id, title, why_root').eq('user_id', userId).eq('status', 'active'),
  ])

  const allNotes = (notesResult.data || []) as Array<{ id: string; title: string; content: string }>

  // Score and filter related notes
  const relatedNotes = allNotes
    .map((note) => {
      const titleLower = note.title.toLowerCase()
      const contentLower = note.content.toLowerCase()
      let score = 0
      for (const kw of keywords) {
        if (titleLower.includes(kw)) score += 2
        if (contentLower.includes(kw)) score += 1
      }
      return { ...note, score }
    })
    .filter((n) => n.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 15)
    .map(({ id, title, content }) => ({ id, title, content }))

  // Extract MOCs and Projects from note titles
  const availableMOCs = allNotes
    .filter((n) => n.title.toLowerCase().startsWith('moc/'))
    .map((n) => n.title.replace(/^moc\//i, ''))

  const availableProjects = allNotes
    .filter((n) => n.title.toLowerCase().startsWith('project/'))
    .map((n) => n.title.replace(/^project\//i, ''))

  return {
    relatedNotes,
    commonTags: (tagsResult.data || []).map((t: { name: string }) => t.name),
    userGoals: (goalsResult.data || []).map((g: { id: string; title: string; why_root: string | null }) => ({
      title: g.title,
      whyRoot: g.why_root || '',
    })),
    availableMOCs,
    availableProjects,
  }
}

const MAX_REFINEMENT_ATTEMPTS = 2

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { text, documentId, coachingSessionId } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    // Fetch context for NVQ-aware extraction
    const context = await fetchExtractionContext(supabase, user.id, text)

    // Build NVQ-aware prompt
    const systemPrompt = buildNVQExtractionPrompt(context)

    // Extract notes using AI provider with NVQ prompt
    const provider = getAIProvider()

    // Use extractNotesWithPrompt if available, otherwise fall back
    let extractedNotes: ExtractedNoteWithNVQ[]
    if ('extractNotesWithPrompt' in provider && typeof provider.extractNotesWithPrompt === 'function') {
      extractedNotes = await provider.extractNotesWithPrompt(text, systemPrompt)
    } else {
      // Fall back to basic extraction and add NVQ fields
      const basicNotes = await provider.extractNotes(text)
      extractedNotes = basicNotes.map((note) => ({
        ...note,
        purposeStatement: null,
        status: null,
        noteType: null,
        stakeholder: null,
        project: null,
      }))
    }

    if (extractedNotes.length === 0) {
      return NextResponse.json({
        success: true,
        notesCreated: 0,
        notes: [],
        nvqMetrics: null,
      })
    }

    // Set up NVQ evaluator
    const evaluatorConfig: NVQEvaluatorConfig = {
      mocs: context.availableMOCs,
      projects: context.availableProjects,
      goals: context.userGoals,
    }
    const evaluator = createNVQEvaluator(evaluatorConfig)

    // Score and potentially refine each note
    const scoredNotes: Array<{ note: ExtractedNoteWithNVQ; nvqScore: ReturnType<typeof evaluator.evaluateNote> }> = []
    let refinementAttempts = 0
    let notesRefined = 0

    for (const note of extractedNotes) {
      let currentNote = note
      let nvqScore = evaluator.evaluateNote(currentNote)
      const issues = evaluator.identifyIssues(nvqScore)

      // Refinement loop for failing notes
      let attempts = 0
      while (!nvqScore.passing && attempts < MAX_REFINEMENT_ATTEMPTS) {
        console.log(`Note "${currentNote.title}" scored ${nvqScore.total}/10, refining...`)

        const refinementPrompt = buildRefinementPrompt(
          currentNote,
          nvqScore,
          issues,
          {
            goals: context.userGoals,
            mocs: context.availableMOCs,
            projects: context.availableProjects,
            relatedNotes: context.relatedNotes,
          }
        )

        try {
          if ('chat' in provider && typeof provider.chat === 'function') {
            const refinedResponse = await provider.chat([{ role: 'user', content: refinementPrompt }])
            const jsonMatch = refinedResponse.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              const refinedNote = JSON.parse(jsonMatch[0]) as ExtractedNoteWithNVQ
              currentNote = { ...currentNote, ...refinedNote }
              nvqScore = evaluator.evaluateNote(currentNote)
              notesRefined++
            }
          }
        } catch {
          // Refinement failed, keep current note
        }

        attempts++
        refinementAttempts++
      }

      scoredNotes.push({ note: currentNote, nvqScore })
    }

    // Store extracted notes with NVQ data
    const createdNotes: Array<{ id: string; title: string; nvqScore: number }> = []

    for (const { note, nvqScore } of scoredNotes) {
      // Create the atomic note with NVQ fields
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: noteData, error: noteError } = await (supabase as any)
        .from('atomic_notes')
        .insert({
          user_id: user.id,
          source_document_id: documentId || null,
          title: note.title,
          content: note.content,
          note_type: 'permanent',
          ai_generated: true,
          // NVQ fields
          nvq_score: nvqScore.total,
          nvq_breakdown: toStorableBreakdown(nvqScore),
          nvq_evaluated_at: new Date().toISOString(),
          quality_status: getQualityStatus(nvqScore),
          purpose_statement: note.purposeStatement,
          note_status: note.status,
          note_content_type: note.noteType,
          stakeholder: note.stakeholder,
          project_link: note.project,
        })
        .select('id')
        .single()

      if (noteError || !noteData) continue

      createdNotes.push({ id: noteData.id, title: note.title, nvqScore: nvqScore.total })

      // Create note_sources entry
      if (documentId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('note_sources').insert({
          note_id: noteData.id,
          source_type: 'document',
          source_id: documentId,
        })
      }

      if (coachingSessionId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('note_sources').insert({
          note_id: noteData.id,
          source_type: 'coaching_session',
          source_id: coachingSessionId,
        })
      }

      // Create tags
      for (const tagName of note.tags) {
        const normalizedTag = tagName.toLowerCase().replace(/^#/, '')

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: tagData } = await (supabase as any)
          .from('tags')
          .upsert(
            {
              user_id: user.id,
              name: normalizedTag,
            },
            {
              onConflict: 'user_id,name',
            }
          )
          .select('id')
          .single()

        if (tagData) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any).from('note_tags').insert({
            note_id: noteData.id,
            tag_id: tagData.id,
          })
        }
      }
    }

    // Create connections between notes
    for (const { note } of scoredNotes) {
      const sourceNote = createdNotes.find((n) => n.title === note.title)
      if (!sourceNote) continue

      for (const connection of note.connections) {
        // Try to find in created notes
        let targetNote = createdNotes.find(
          (n) => n.title.toLowerCase() === connection.targetTitle.toLowerCase().replace(/^\[\[|\]\]$/g, '')
        )

        // Try to find in context notes
        if (!targetNote) {
          const contextTarget = context.relatedNotes.find(
            (n) => n.title.toLowerCase() === connection.targetTitle.toLowerCase().replace(/^\[\[|\]\]$/g, '')
          )
          if (contextTarget) {
            targetNote = { id: contextTarget.id, title: contextTarget.title, nvqScore: 0 }
          }
        }

        if (!targetNote) continue

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('note_connections').insert({
          user_id: user.id,
          source_note_id: sourceNote.id,
          target_note_id: targetNote.id,
          connection_type: connection.type,
          strength: connection.strength,
          ai_generated: true,
        })
      }
    }

    // Calculate NVQ metrics
    const nvqScores = scoredNotes.map((s) => s.nvqScore.total)
    const nvqMetrics = {
      meanNVQ: nvqScores.reduce((a, b) => a + b, 0) / nvqScores.length,
      passingRate: scoredNotes.filter((s) => s.nvqScore.passing).length / scoredNotes.length,
      notesPassing: scoredNotes.filter((s) => s.nvqScore.passing).length,
      notesFailed: scoredNotes.filter((s) => !s.nvqScore.passing).length,
      refinementAttempts,
      notesRefined,
    }

    return NextResponse.json({
      success: true,
      notesCreated: createdNotes.length,
      notes: createdNotes,
      nvqMetrics,
    })
  } catch (error) {
    console.error('Error extracting notes:', error)
    return NextResponse.json({ error: 'Failed to extract notes' }, { status: 500 })
  }
}
