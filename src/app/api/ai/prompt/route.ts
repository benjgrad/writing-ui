import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAIProvider } from '@/lib/ai'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { context, documentId } = await request.json()

    if (!context || typeof context !== 'string') {
      return NextResponse.json({ error: 'Context is required' }, { status: 400 })
    }

    // Get user's learning goals if available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('learning_goals')
      .eq('id', user.id)
      .single()

    const provider = getAIProvider()
    const prompt = await provider.generatePrompt(
      context,
      profile?.learning_goals || undefined
    )

    // Optionally log prompt history
    if (documentId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('prompt_history').insert({
        user_id: user.id,
        document_id: documentId,
        context_text: context.substring(0, 500),
        prompt_generated: prompt,
        provider: process.env.AI_PROVIDER || 'fallback'
      })
    }

    return NextResponse.json({ prompt })
  } catch (error) {
    console.error('Error generating prompt:', error)
    return NextResponse.json(
      { error: 'Failed to generate prompt', prompt: "What happens next?" },
      { status: 500 }
    )
  }
}
