import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import {
  GOAL_COACHING_PROMPT,
  parseCoachingResponse,
  type CoachingContext
} from '@/lib/ai/prompts/goal-coaching'

export async function POST(request: Request) {
  try {
    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      // Return a mock response for development without API key
      return NextResponse.json({
        message: "Hi! I'm here to help you set a meaningful goal. What's something you've been wanting to work on or change in your life?",
        goalTitle: undefined,
        whyRoot: undefined,
        microWin: undefined,
        isComplete: false
      })
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })

    const body = await request.json()
    const { context, userMessage } = body as {
      context: CoachingContext
      userMessage?: string
    }

    if (!context) {
      return NextResponse.json(
        { error: 'Coaching context is required' },
        { status: 400 }
      )
    }

    // Build messages array for the API
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []

    // Add conversation history
    for (const msg of context.conversationHistory) {
      messages.push(msg)
    }

    // Add current user message if provided
    if (userMessage) {
      messages.push({ role: 'user', content: userMessage })
    } else if (messages.length === 0) {
      // Initial message to start conversation
      messages.push({ role: 'user', content: 'Hi, I want to set a new goal.' })
    }

    const systemPrompt = GOAL_COACHING_PROMPT(context)

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: systemPrompt,
      messages
    })

    const textBlock = response.content.find(block => block.type === 'text')
    const rawMessage = textBlock?.type === 'text' ? textBlock.text : ''

    console.log('[coach-goal] Stage:', context.stage)
    console.log('[coach-goal] Raw AI response:', rawMessage)

    // Parse the response for stage transitions and captured data
    const parsed = parseCoachingResponse(rawMessage)

    console.log('[coach-goal] Parsed result:', {
      message: parsed.message?.substring(0, 50) + '...',
      goalTitle: parsed.goalTitle,
      whyRoot: parsed.whyRoot,
      microWin: parsed.microWin,
      notes: parsed.notes,
      isComplete: parsed.isComplete,
      isUpdate: parsed.isUpdate,
      updateType: parsed.updateType
    })

    return NextResponse.json({
      message: parsed.message,
      goalTitle: parsed.goalTitle,
      whyRoot: parsed.whyRoot,
      microWin: parsed.microWin,
      notes: parsed.notes,
      isComplete: parsed.isComplete,
      isUpdate: parsed.isUpdate,
      updateType: parsed.updateType
    })
  } catch (error) {
    console.error('Goal coaching error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to get coaching response: ${errorMessage}` },
      { status: 500 }
    )
  }
}
