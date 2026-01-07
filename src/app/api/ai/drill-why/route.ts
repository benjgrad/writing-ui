import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import {
  WHY_DRILLING_SYSTEM_PROMPT,
  buildWhyDrillingMessages,
  parseWhyDrillingResponse
} from '@/lib/ai/prompts/why-drilling'

// POST /api/ai/drill-why - Continue the "Why" drilling conversation
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { goal_title, conversation = [] } = await request.json()

    if (!goal_title || typeof goal_title !== 'string') {
      return NextResponse.json({ error: 'goal_title is required' }, { status: 400 })
    }

    // Build messages for the API
    const messages = buildWhyDrillingMessages(goal_title, conversation)

    // Use Anthropic if available, otherwise return a simple response
    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      // Fallback without AI
      const defaultQuestions = [
        "Why is this important to you?",
        "And why does that matter?",
        "What would achieving this give you that you don't have now?"
      ]

      const questionIndex = Math.min(conversation.length, defaultQuestions.length - 1)

      if (conversation.length >= 3) {
        return NextResponse.json({
          message: `You want to ${goal_title.toLowerCase()} because it matters deeply to you.`,
          is_complete: true,
          why_root: `You want to ${goal_title.toLowerCase()} because it matters deeply to you.`
        })
      }

      return NextResponse.json({
        message: defaultQuestions[questionIndex],
        is_complete: false
      })
    }

    // Call Anthropic API
    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: WHY_DRILLING_SYSTEM_PROMPT,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    })

    const textBlock = response.content.find(block => block.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({
        message: "Why is this important to you?",
        is_complete: false
      })
    }

    const parsed = parseWhyDrillingResponse(textBlock.text)

    return NextResponse.json({
      message: parsed.message,
      is_complete: parsed.isComplete,
      why_root: parsed.whyRoot
    })
  } catch (error) {
    console.error('Error in why drilling:', error)
    return NextResponse.json(
      { error: 'Failed to process', message: "Why is this important to you?", is_complete: false },
      { status: 500 }
    )
  }
}
