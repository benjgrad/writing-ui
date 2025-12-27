import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAIProvider } from '@/lib/ai'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { text, documentId } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const provider = getAIProvider()
    const extractedNotes = await provider.extractNotes(text)

    // Store extracted notes in database
    const createdNotes: Array<{ id: string; title: string }> = []

    for (const note of extractedNotes) {
      // Create the atomic note
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: noteData, error: noteError } = await (supabase as any)
        .from('atomic_notes')
        .insert({
          user_id: user.id,
          source_document_id: documentId || null,
          title: note.title,
          content: note.content,
          note_type: 'permanent',
          ai_generated: true
        })
        .select('id')
        .single()

      if (noteError || !noteData) continue

      createdNotes.push({ id: noteData.id, title: note.title })

      // Create tags
      for (const tagName of note.tags) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: tagData } = await (supabase as any)
          .from('tags')
          .upsert({
            user_id: user.id,
            name: tagName.toLowerCase()
          }, {
            onConflict: 'user_id,name'
          })
          .select('id')
          .single()

        if (tagData) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any).from('note_tags').insert({
            note_id: noteData.id,
            tag_id: tagData.id
          })
        }
      }
    }

    // Create connections between notes
    for (const note of extractedNotes) {
      const sourceNote = createdNotes.find(n => n.title === note.title)
      if (!sourceNote) continue

      for (const connection of note.connections) {
        const targetNote = createdNotes.find(n => n.title === connection.targetTitle)
        if (!targetNote) continue

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('note_connections').insert({
          user_id: user.id,
          source_note_id: sourceNote.id,
          target_note_id: targetNote.id,
          connection_type: connection.type,
          strength: connection.strength,
          ai_generated: true
        })
      }
    }

    return NextResponse.json({
      success: true,
      notesCreated: createdNotes.length,
      notes: createdNotes
    })
  } catch (error) {
    console.error('Error extracting notes:', error)
    return NextResponse.json(
      { error: 'Failed to extract notes' },
      { status: 500 }
    )
  }
}
