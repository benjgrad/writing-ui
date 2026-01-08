import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/coaching-sessions/[id]/messages - Add a message to the session
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: sessionId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify session belongs to user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: session, error: sessionError } = await (supabase as any)
      .from('coaching_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const body = await request.json()
    const { role, content } = body

    if (!role || !content) {
      return NextResponse.json({ error: 'Role and content are required' }, { status: 400 })
    }

    if (!['user', 'assistant'].includes(role)) {
      return NextResponse.json({ error: 'Role must be user or assistant' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: message, error } = await (supabase as any)
      .from('coaching_messages')
      .insert({
        session_id: sessionId,
        role,
        content
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ message })
  } catch (error) {
    console.error('Error adding coaching message:', error)
    return NextResponse.json({ error: 'Failed to add message' }, { status: 500 })
  }
}
