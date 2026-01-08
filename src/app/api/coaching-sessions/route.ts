import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CoachingSession, CoachingMessage } from '@/types/goal'

// GET /api/coaching-sessions - Fetch all coaching sessions for current user
// Optional query params: ?goal_id=xxx to filter by goal
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const goalId = searchParams.get('goal_id')

    // Build query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('coaching_sessions')
      .select(`
        *,
        coaching_messages (*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (goalId) {
      query = query.eq('goal_id', goalId)
    }

    const { data: sessions, error } = await query

    if (error) throw error

    // Sort messages by created_at within each session
    const processedSessions = (sessions || []).map((session: CoachingSession & { coaching_messages: CoachingMessage[] }) => ({
      ...session,
      messages: (session.coaching_messages || []).sort(
        (a: CoachingMessage, b: CoachingMessage) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    }))

    return NextResponse.json({ sessions: processedSessions })
  } catch (error) {
    console.error('Error fetching coaching sessions:', error)
    return NextResponse.json({ error: 'Failed to fetch coaching sessions' }, { status: 500 })
  }
}

// POST /api/coaching-sessions - Create a new coaching session
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { goal_id, stage = 'welcome' } = body

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: session, error } = await (supabase as any)
      .from('coaching_sessions')
      .insert({
        user_id: user.id,
        goal_id: goal_id || null,
        stage,
        is_active: true
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ session })
  } catch (error) {
    console.error('Error creating coaching session:', error)
    return NextResponse.json({ error: 'Failed to create coaching session' }, { status: 500 })
  }
}
