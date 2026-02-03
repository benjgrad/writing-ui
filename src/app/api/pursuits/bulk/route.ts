import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface BulkSelection {
  title: string
  domain_scores: Record<string, number>
  is_predefined: boolean
}

// POST /api/pursuits/bulk - Create multiple pursuits from onboarding
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { selections } = body as { selections: BulkSelection[] }

    if (!Array.isArray(selections) || selections.length === 0) {
      return NextResponse.json({ error: 'At least one selection is required' }, { status: 400 })
    }

    // All pursuits start parked — coaching is the path to activation
    const pursuits = selections.map((selection, index) => ({
      user_id: user.id,
      title: selection.title.trim(),
      status: 'parked' as const,
      domain_scores: selection.domain_scores,
      completeness: { title: true, why: false, steps: false, notes: false },
      momentum: 3,
      position: index,
    }))

    // Insert pursuits
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: createdPursuits, error: pursuitError } = await (supabase as any)
      .from('goals')
      .insert(pursuits)
      .select()

    if (pursuitError) {
      console.error('Error creating pursuits:', pursuitError)
      throw pursuitError
    }

    // Store onboarding selections for reference
    const onboardingRecords = selections.map((selection, index) => ({
      user_id: user.id,
      label: selection.title.trim(),
      domain_scores: selection.domain_scores,
      is_predefined: selection.is_predefined,
      pursuit_id: createdPursuits?.[index]?.id ?? null,
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: selectionError } = await (supabase as any)
      .from('onboarding_selections')
      .insert(onboardingRecords)

    if (selectionError) {
      console.error('Error storing onboarding selections:', selectionError)
      // Non-fatal - pursuits were already created
    }

    return NextResponse.json({ pursuits: createdPursuits })
  } catch (error) {
    console.error('Error in bulk pursuit creation:', error)
    return NextResponse.json({ error: 'Failed to create pursuits' }, { status: 500 })
  }
}
