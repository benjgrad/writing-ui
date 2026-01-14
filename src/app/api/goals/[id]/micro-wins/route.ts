import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/goals/[id]/micro-wins - Fetch micro-wins for a goal
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: goalId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify goal belongs to user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: goal } = await (supabase as any)
      .from('goals')
      .select('id')
      .eq('id', goalId)
      .eq('user_id', user.id)
      .single()

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: microWins, error } = await (supabase as any)
      .from('micro_wins')
      .select('*')
      .eq('goal_id', goalId)
      .order('position', { ascending: true })

    if (error) throw error

    return NextResponse.json({ micro_wins: microWins || [] })
  } catch (error) {
    console.error('Error fetching micro-wins:', error)
    return NextResponse.json({ error: 'Failed to fetch micro-wins' }, { status: 500 })
  }
}

// POST /api/goals/[id]/micro-wins - Create a new micro-win
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: goalId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { description, is_current = false } = await request.json()

    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    // Verify goal belongs to user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: goal } = await (supabase as any)
      .from('goals')
      .select('id')
      .eq('id', goalId)
      .eq('user_id', user.id)
      .single()

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Get count for position
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (supabase as any)
      .from('micro_wins')
      .select('*', { count: 'exact', head: true })
      .eq('goal_id', goalId)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: microWin, error } = await (supabase as any)
      .from('micro_wins')
      .insert({
        goal_id: goalId,
        description: description.trim(),
        is_current,
        position: count || 0
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ micro_win: microWin })
  } catch (error) {
    console.error('Error creating micro-win:', error)
    return NextResponse.json({ error: 'Failed to create micro-win' }, { status: 500 })
  }
}

// PUT /api/goals/[id]/micro-wins - Update a micro-win (complete it, set as current, etc.)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: goalId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { micro_win_id, ...updates } = await request.json()

    if (!micro_win_id) {
      return NextResponse.json({ error: 'micro_win_id is required' }, { status: 400 })
    }

    // Verify goal belongs to user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: goal } = await (supabase as any)
      .from('goals')
      .select('id')
      .eq('id', goalId)
      .eq('user_id', user.id)
      .single()

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // If completing the micro-win, set completed_at
    if (updates.completed_at === true) {
      updates.completed_at = new Date().toISOString()
      updates.is_current = false
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: microWin, error } = await (supabase as any)
      .from('micro_wins')
      .update(updates)
      .eq('id', micro_win_id)
      .eq('goal_id', goalId)
      .select()
      .single()

    if (error) throw error

    // If this was marked complete and there's a next micro-win, make it current
    if (updates.completed_at && microWin) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: nextWin } = await (supabase as any)
        .from('micro_wins')
        .select('*')
        .eq('goal_id', goalId)
        .is('completed_at', null)
        .order('position', { ascending: true })
        .limit(1)
        .single()

      if (nextWin) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('micro_wins')
          .update({ is_current: true })
          .eq('id', nextWin.id)
      }
    }

    return NextResponse.json({ micro_win: microWin })
  } catch (error) {
    console.error('Error updating micro-win:', error)
    return NextResponse.json({ error: 'Failed to update micro-win' }, { status: 500 })
  }
}

// DELETE /api/goals/[id]/micro-wins - Delete a micro-win
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: goalId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { micro_win_id } = await request.json()

    if (!micro_win_id) {
      return NextResponse.json({ error: 'micro_win_id is required' }, { status: 400 })
    }

    // Verify goal belongs to user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: goal } = await (supabase as any)
      .from('goals')
      .select('id')
      .eq('id', goalId)
      .eq('user_id', user.id)
      .single()

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Get the micro-win to check if it's current
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: microWin } = await (supabase as any)
      .from('micro_wins')
      .select('*')
      .eq('id', micro_win_id)
      .eq('goal_id', goalId)
      .single()

    if (!microWin) {
      return NextResponse.json({ error: 'Micro-win not found' }, { status: 404 })
    }

    const wasCurrent = microWin.is_current

    // Delete the micro-win
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('micro_wins')
      .delete()
      .eq('id', micro_win_id)
      .eq('goal_id', goalId)

    if (error) throw error

    // If the deleted micro-win was current, make the next incomplete one current
    if (wasCurrent) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: nextWin } = await (supabase as any)
        .from('micro_wins')
        .select('*')
        .eq('goal_id', goalId)
        .is('completed_at', null)
        .order('position', { ascending: true })
        .limit(1)
        .single()

      if (nextWin) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('micro_wins')
          .update({ is_current: true })
          .eq('id', nextWin.id)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting micro-win:', error)
    return NextResponse.json({ error: 'Failed to delete micro-win' }, { status: 500 })
  }
}

// PATCH /api/goals/[id]/micro-wins - Reorder micro-wins
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: goalId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { ordered_ids } = await request.json()

    if (!ordered_ids || !Array.isArray(ordered_ids)) {
      return NextResponse.json({ error: 'ordered_ids array is required' }, { status: 400 })
    }

    // Verify goal belongs to user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: goal } = await (supabase as any)
      .from('goals')
      .select('id')
      .eq('id', goalId)
      .eq('user_id', user.id)
      .single()

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Update positions for each micro-win
    for (let i = 0; i < ordered_ids.length; i++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('micro_wins')
        .update({ position: i })
        .eq('id', ordered_ids[i])
        .eq('goal_id', goalId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reordering micro-wins:', error)
    return NextResponse.json({ error: 'Failed to reorder micro-wins' }, { status: 500 })
  }
}
