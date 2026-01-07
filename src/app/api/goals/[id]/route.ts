import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/goals/[id] - Fetch a single goal with micro-wins
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: goal, error } = await (supabase as any)
      .from('goals')
      .select(`
        *,
        micro_wins (*)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) throw error

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    return NextResponse.json({ goal })
  } catch (error) {
    console.error('Error fetching goal:', error)
    return NextResponse.json({ error: 'Failed to fetch goal' }, { status: 500 })
  }
}

// PUT /api/goals/[id] - Update a goal
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const updates = await request.json()

    // Validate momentum if provided
    if (updates.momentum !== undefined) {
      if (typeof updates.momentum !== 'number' || updates.momentum < 1 || updates.momentum > 5) {
        return NextResponse.json(
          { error: 'Momentum must be a number between 1 and 5' },
          { status: 400 }
        )
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: goal, error } = await (supabase as any)
      .from('goals')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      // Check for Rule of Three violation
      if (error.message?.includes('more than 3 active goals')) {
        return NextResponse.json(
          { error: 'You already have 3 active goals. Move one to the Parking Lot first.' },
          { status: 400 }
        )
      }
      throw error
    }

    return NextResponse.json({ goal })
  } catch (error) {
    console.error('Error updating goal:', error)
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 })
  }
}

// DELETE /api/goals/[id] - Archive a goal
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Archive instead of hard delete
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('goals')
      .update({ status: 'archived' })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error archiving goal:', error)
    return NextResponse.json({ error: 'Failed to archive goal' }, { status: 500 })
  }
}
