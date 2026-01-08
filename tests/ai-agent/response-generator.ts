import Anthropic from '@anthropic-ai/sdk'
import { AI_TEST_CONFIG, type CoachingStage } from './config'

interface CoachingContext {
  stage: CoachingStage
  coachMessage: string
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
}

// Simulates a thoughtful test user who reads and responds to what the coach actually asks
const CONVERSATION_SYSTEM_PROMPT = `You are simulating a real person testing a goal coaching chat interface.

Your job is to:
1. READ what the coach just said carefully
2. RESPOND naturally to the actual question being asked
3. BE a cooperative but realistic test user

IMPORTANT: Respond to what is ACTUALLY being asked:
- If the coach asks about a GOAL → Share a goal you want to work on
- If the coach asks WHY something matters → Share your emotional motivation
- If the coach asks about a FIRST STEP → Describe a small concrete action
- If the coach asks for CONFIRMATION → Say yes or express readiness
- If the coach shares encouragement → Thank them briefly

Stay in character as someone genuinely working through goal-setting. Keep responses to 1-2 sentences.
Do NOT include quotes around your response.`

// Fallback stage prompts (only used if we need stage hints)
const STAGE_PROMPTS: Record<CoachingStage, string> = {
  welcome: `The coach is greeting you and asking what goal you want to work on.`,
  goal_discovery: `The coach is asking about your goal or why it matters to you.`,
  why_drilling: `The coach is asking about your motivation or a first step you could take.`,
  micro_win: `The coach is asking you to confirm or about your readiness to commit.`,
  confirmation: `The coach is wrapping up and encouraging you.`,
  complete: `The session is complete.`,
}

export async function generateTestResponse(
  context: CoachingContext
): Promise<string> {
  const anthropic = new Anthropic({
    apiKey: AI_TEST_CONFIG.anthropicApiKey,
  })

  // Build conversation history for context
  const conversationMessages = context.conversationHistory.map((msg) => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }))

  // Add the latest coach message
  conversationMessages.push({
    role: 'assistant' as const,
    content: context.coachMessage,
  })

  try {
    const response = await anthropic.messages.create({
      model: AI_TEST_CONFIG.model,
      max_tokens: AI_TEST_CONFIG.maxTokens,
      system: CONVERSATION_SYSTEM_PROMPT,
      messages: [
        // Provide full conversation context
        ...conversationMessages,
        // Ask for user's response
        {
          role: 'user',
          content: 'Now respond naturally as the test user to what the coach just said.',
        },
      ],
    })

    const textBlock = response.content.find((block) => block.type === 'text')
    const text = textBlock?.type === 'text' ? textBlock.text.trim() : ''

    // Clean up any accidental quotes or prefixes
    return text
      .replace(/^["']|["']$/g, '')
      .replace(/^(User:|Response:|Me:)\s*/i, '')
      .trim()
  } catch (error) {
    console.error('[ResponseGenerator] Error calling Claude API:', error)
    // Fall back to predefined response
    return getPredefinedResponse(context.stage)
  }
}

// Predefined responses for deterministic testing or when API is unavailable
// These are what the TEST USER says in response to the coach at each stage:
// - welcome: Coach greets, user describes their goal
// - goal_discovery: Coach acknowledged goal and asks WHY, user shares motivation
// - why_drilling: Coach acknowledged why and asks for first step, user describes action
// - micro_win: Coach captured micro-win and asks to confirm, user confirms
// - confirmation: Coach says congrats, user thanks them
export const PREDEFINED_RESPONSES: Record<CoachingStage, string> = {
  welcome: 'I want to improve my focus and concentration at work',
  goal_discovery:
    'Because I often feel scattered and overwhelmed, and I want to feel more present and capable',
  why_drilling:
    "I could start my day with 5 minutes of focused breathing before checking email",
  micro_win: "Yes, I'm ready to commit to this!",
  confirmation: 'Thank you so much!',
  complete: 'Thank you!',
}

export function getPredefinedResponse(stage: CoachingStage): string {
  return PREDEFINED_RESPONSES[stage] || 'Yes'
}

// Variety of predefined responses for more realistic testing
// Mapped to what the coach JUST ASKED at each stage
export const RESPONSE_VARIATIONS: Record<CoachingStage, string[]> = {
  // Coach: "What goal do you want to work on?"
  welcome: [
    'I want to improve my focus and concentration at work',
    "I'd like to start a daily meditation practice",
    'I want to write for 30 minutes every day',
    'I need to exercise more regularly',
    'I want to learn a new programming language',
  ],
  // Coach: "Why does this goal matter to you?"
  goal_discovery: [
    'Because I want to feel more present and less overwhelmed',
    'It would make me feel calmer and more in control of my day',
    'I want to feel proud of myself and more confident in my abilities',
    "It's important for my mental health and sense of peace",
    'I want to feel capable and accomplished instead of stuck',
  ],
  // Coach: "What small first step could you take?"
  why_drilling: [
    "I'll do a 10-minute focus session tomorrow morning",
    "I'll try a 5-minute guided meditation tonight before bed",
    "I'll write for just 10 minutes after my morning coffee",
    "I'll take a 15-minute walk during my lunch break tomorrow",
    "I'll watch the first lesson of the course tonight after dinner",
  ],
  // Coach: "Ready to commit to this goal?"
  micro_win: [
    "Yes, let's do it!",
    'Sounds great, I\'m ready!',
    'Perfect, let\'s go!',
    "Yes, I'm committed!",
    "Absolutely, I'm excited to start!",
  ],
  // Coach: "Congratulations!" (goal complete)
  confirmation: ['Thank you!', 'Thanks so much!', 'Great, thanks!'],
  complete: ['Thank you!', 'Thanks so much!', 'Great, thanks!'],
}

export function getRandomPredefinedResponse(stage: CoachingStage): string {
  const variations = RESPONSE_VARIATIONS[stage] || ['Yes']
  const randomIndex = Math.floor(Math.random() * variations.length)
  return variations[randomIndex]
}
