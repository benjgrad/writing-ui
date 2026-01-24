import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Queue a document for extraction and optionally trigger processing
 *
 * POST /api/extraction/queue
 * Body: { documentId: string, triggerProcessing?: boolean }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { documentId, triggerProcessing = true } = body

    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 })
    }

    // Get the document
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: doc, error: docError } = await (supabase as any)
      .from('documents')
      .select('id, user_id, content, word_count')
      .eq('id', documentId)
      .single()

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Verify ownership
    if (doc.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check minimum word count
    if (doc.word_count < 50) {
      return NextResponse.json({
        message: 'Document too short for extraction',
        queued: false
      })
    }

    // Check if there's already a pending/processing job for this document
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingJobs } = await (supabase as any)
      .from('extraction_queue')
      .select('id, status, created_at')
      .eq('source_type', 'document')
      .eq('source_id', documentId)
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false })
      .limit(1)

    if (existingJobs && existingJobs.length > 0) {
      // Already has a pending job, no need to queue again
      return NextResponse.json({
        message: 'Document already queued for extraction',
        queued: false,
        existingJobId: existingJobs[0].id
      })
    }

    // The database trigger will handle queueing on document save
    // But we can also manually trigger processing here

    if (triggerProcessing) {
      // Trigger the edge function to process the queue
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (serviceRoleKey) {
        // Fire and forget - don't wait for completion
        fetch(`${supabaseUrl}/functions/v1/process-extraction`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
          },
        }).catch(err => {
          console.error('Failed to trigger extraction:', err)
        })
      }
    }

    return NextResponse.json({
      message: 'Extraction triggered',
      queued: true
    })
  } catch (error) {
    console.error('Extraction queue error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
