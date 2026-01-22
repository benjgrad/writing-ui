import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAIProvider } from '@/lib/ai'
import type { GoalContext, PragmaticContext } from '@/lib/ai/prompts/continuation'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { context, documentId, pragmaticContext } = await request.json()

    if (!context || typeof context !== 'string') {
      return NextResponse.json({ error: 'Context is required' }, { status: 400 })
    }

    // Get user's learning goals if available (legacy)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('learning_goals')
      .eq('id', user.id)
      .single()

    // Get user's active goals from Momentum Engine (new system)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: goals } = await (supabase as any)
      .from('goals')
      .select(`
        title,
        why_root,
        momentum,
        micro_wins!inner (
          description,
          is_current
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('position', { ascending: true })

    // Transform goals to GoalContext format
    const activeGoals: GoalContext[] = (goals || []).map((g: {
      title: string
      why_root: string | null
      momentum: number
      micro_wins: Array<{ description: string; is_current: boolean }>
    }) => ({
      title: g.title,
      why_root: g.why_root,
      momentum: g.momentum,
      current_micro_win: g.micro_wins?.find((mw: { is_current: boolean }) => mw.is_current)?.description || null
    }))

    const provider = getAIProvider()
    const result = await provider.generatePrompt(
      context,
      profile?.learning_goals || undefined,
      activeGoals.length > 0 ? activeGoals : undefined,
      pragmaticContext as PragmaticContext | undefined
    )

    // Optionally log prompt history
    if (documentId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('prompt_history').insert({
        user_id: user.id,
        document_id: documentId,
        context_text: context.substring(0, 500),
        prompt_generated: result.prompt,
        provider: process.env.AI_PROVIDER || 'fallback'
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error generating prompt:', error)
    return NextResponse.json(
      { error: 'Failed to generate prompt', prompt: "What happens next?", tone: 'reflective' },
      { status: 500 }
    )
  }
}
