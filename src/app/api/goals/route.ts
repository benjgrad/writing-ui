import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Goal, MicroWin } from '@/types/goal'

// GET /api/goals - Fetch all goals for the current user
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch goals with their current micro-win
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: goals, error } = await (supabase as any)
      .from('goals')
      .select(`
        *,
        micro_wins (*)
      `)
      .eq('user_id', user.id)
      .in('status', ['active', 'parked'])
      .order('status', { ascending: true })
      .order('position', { ascending: true })

    if (error) throw error

    // Process goals to add current_micro_win
    const processedGoals = (goals || []).map((goal: Goal & { micro_wins: MicroWin[] }) => ({
      ...goal,
      current_micro_win: goal.micro_wins?.find((mw: MicroWin) => mw.is_current) || null,
      micro_wins: goal.micro_wins?.sort((a: MicroWin, b: MicroWin) => a.position - b.position) || []
    }))

    return NextResponse.json({ goals: processedGoals })
  } catch (error) {
    console.error('Error fetching goals:', error)
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 })
  }
}

// POST /api/goals - Create a new goal
export async function POST(request: Request) {
  console.log('[/api/goals POST] Creating goal...')
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.log('[/api/goals POST] No user, returning 401')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, why_root, status = 'active' } = body
    console.log('[/api/goals POST] Request body:', { title, why_root, status })

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Get current count of goals with same status for position
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (supabase as any)
      .from('goals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', status)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: goal, error } = await (supabase as any)
      .from('goals')
      .insert({
        user_id: user.id,
        title: title.trim(),
        why_root: why_root?.trim() || null,
        status,
        position: count || 0
      })
      .select()
      .single()

    if (error) {
      console.error('[/api/goals POST] Supabase error:', error)
      // Check for Rule of Three violation
      if (error.message?.includes('more than 3 active goals')) {
        return NextResponse.json(
          { error: 'You already have 3 active goals. Move one to the Parking Lot first.' },
          { status: 400 }
        )
      }
      throw error
    }

    console.log('[/api/goals POST] Goal created successfully:', goal)
    return NextResponse.json({ goal })
  } catch (error) {
    console.error('Error creating goal:', error)
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 })
  }
}
