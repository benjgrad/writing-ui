import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get recent extraction queue items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: queueItems, error: queueError } = await (supabase as any)
      .from('extraction_queue')
      .select('id, source_type, source_id, status, notes_created, error_message, content_snapshot, created_at, completed_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (queueError) {
      return NextResponse.json({ error: queueError.message }, { status: 500 })
    }

    // Get recent documents to compare
    const { data: documents, error: docError } = await supabase
      .from('documents')
      .select('id, title, word_count, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(10)

    if (docError) {
      return NextResponse.json({ error: docError.message }, { status: 500 })
    }

    // Get atomic notes count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: notesCount } = await (supabase as any)
      .from('atomic_notes')
      .select('id', { count: 'exact', head: true })

    return NextResponse.json({
      queue: queueItems?.map((item: { id: string; source_type: string; source_id: string; status: string; notes_created: number | null; error_message: string | null; content_snapshot: string; created_at: string; completed_at: string | null }) => ({
        ...item,
        content_preview: item.content_snapshot?.slice(0, 200) + '...'
      })),
      documents: documents,
      totalAtomicNotes: notesCount
    })
  } catch (error) {
    console.error('Debug extraction error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
