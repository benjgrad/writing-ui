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

    // Check if there are pending jobs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: pendingJobs, error: queueError } = await (supabase as any)
      .from('extraction_queue')
      .select('id, status')
      .eq('user_id', user.id)
      .in('status', ['pending', 'processing'])
      .limit(1)

    if (queueError) {
      return NextResponse.json({ error: queueError.message }, { status: 500 })
    }

    if (!pendingJobs || pendingJobs.length === 0) {
      return NextResponse.json({ message: 'No pending jobs' })
    }

    // Invoke the Supabase Edge Function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Service role key not configured' },
        { status: 500 }
      )
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/process-extraction`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: `Edge function error: ${errorText}` },
        { status: response.status }
      )
    }

    const result = await response.json()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Extraction process error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
