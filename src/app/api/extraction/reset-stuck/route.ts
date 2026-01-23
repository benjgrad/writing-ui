import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Reset jobs stuck in 'processing' for more than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: resetJobs, error: resetError } = await (supabase as any)
      .from('extraction_queue')
      .update({
        status: 'pending',
        started_at: null,
      })
      .eq('user_id', user.id)
      .eq('status', 'processing')
      .lt('started_at', fiveMinutesAgo)
      .select('id')

    if (resetError) {
      return NextResponse.json({ error: resetError.message }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Reset complete',
      jobsReset: resetJobs?.length || 0,
    })
  } catch (error) {
    console.error('Reset stuck jobs error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
