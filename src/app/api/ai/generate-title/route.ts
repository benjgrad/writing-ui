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

    const { content } = await request.json()

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Need at least some content to generate a meaningful title
    if (content.trim().length < 10) {
      return NextResponse.json({ error: 'Content too short to generate title' }, { status: 400 })
    }

    const provider = getAIProvider()
    const title = await provider.generateTitle(content)

    return NextResponse.json({ title })
  } catch (error) {
    console.error('Error generating title:', error)
    return NextResponse.json(
      { error: 'Failed to generate title' },
      { status: 500 }
    )
  }
}
