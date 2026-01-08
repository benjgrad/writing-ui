import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CoachingMessage } from '@/types/goal'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/coaching-sessions/[id] - Get a single session with messages
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: session, error } = await (supabase as any)
      .from('coaching_sessions')
      .select(`
        *,
        coaching_messages (*)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }
      throw error
    }

    // Sort messages by created_at
    const processedSession = {
      ...session,
      messages: (session.coaching_messages || []).sort(
        (a: CoachingMessage, b: CoachingMessage) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    }

    return NextResponse.json({ session: processedSession })
  } catch (error) {
    console.error('Error fetching coaching session:', error)
    return NextResponse.json({ error: 'Failed to fetch coaching session' }, { status: 500 })
  }
}

// PATCH /api/coaching-sessions/[id] - Update session (stage, goal_id, is_active)
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { stage, goal_id, is_active } = body

    const updates: Record<string, unknown> = {}
    if (stage !== undefined) updates.stage = stage
    if (goal_id !== undefined) updates.goal_id = goal_id
    if (is_active !== undefined) updates.is_active = is_active

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: session, error } = await (supabase as any)
      .from('coaching_sessions')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ session })
  } catch (error) {
    console.error('Error updating coaching session:', error)
    return NextResponse.json({ error: 'Failed to update coaching session' }, { status: 500 })
  }
}
