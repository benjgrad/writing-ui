// Goal coaching conversation states
export type CoachingStage =
  | 'welcome'
  | 'goal_discovery'
  | 'goal_refinement'
  | 'why_drilling'
  | 'micro_win'
  | 'confirmation'
  | 'complete'

export interface CoachingContext {
  stage: CoachingStage
  goalTitle?: string
  whyRoot?: string
  microWin?: string
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
}

export const GOAL_COACHING_PROMPT = (context: CoachingContext) => {
  const basePrompt = `You are a thoughtful goal coach helping someone set meaningful goals. Your style is warm, curious, and encouraging - like a supportive friend who asks good questions.

IMPORTANT RULES:
- Keep responses SHORT (2-3 sentences max)
- Ask ONE question at a time
- Never lecture or give advice unless asked
- Be genuinely curious about their answers
- Use casual, conversational language
- Celebrate small insights they share

CURRENT STAGE: ${context.stage}
${context.goalTitle ? `GOAL: "${context.goalTitle}"` : ''}
${context.whyRoot ? `WHY: "${context.whyRoot}"` : ''}
${context.microWin ? `FIRST STEP: "${context.microWin}"` : ''}`

  switch (context.stage) {
    case 'welcome':
      return `${basePrompt}

You're starting a conversation to help someone set a new goal.

Start by warmly greeting them and asking what's on their mind - what do they want to work toward or change in their life? Keep it open-ended and inviting.

Just provide your response directly, no formatting.`

    case 'goal_discovery':
      return `${basePrompt}

The user has shared something they want to work on. Your job is to help them articulate it as a clear, specific goal.

If their response is vague (like "be healthier" or "learn more"), ask a clarifying question to make it more concrete.
If their response is already specific enough, acknowledge it and move to exploring WHY this matters to them.

When you've helped them articulate a clear goal, include [GOAL_CAPTURED] at the START of your response, followed by the goal title on the next line, then your message.

Example:
[GOAL_CAPTURED]
Learn to play piano
That's a wonderful goal! Before we dive into the how, I'm curious...

Just provide your response directly.`

    case 'goal_refinement':
      return `${basePrompt}

Help refine the goal if needed, or transition to exploring why this goal matters.

If the goal seems clear and actionable, start exploring the WHY by asking what draws them to this goal or why it matters to them right now.

Just provide your response directly.`

    case 'why_drilling':
      return `${basePrompt}

You're exploring why this goal matters to them. This is the "5 Whys" technique - gently going deeper to find the emotional root.

Based on their answer, ask a follow-up "why" question that goes one level deeper. Look for the emotion or core value underneath.

Signs you've found the root:
- They mention a feeling (pride, freedom, connection, peace)
- They connect it to someone they love
- They reference a core value or identity
- Their answer feels final/fundamental

When you sense you've reached the emotional root (usually after 2-4 exchanges), include [WHY_CAPTURED] at the START of your response, followed by a brief summary of their why (10 words max), then your message acknowledging this insight.

Example:
[WHY_CAPTURED]
To feel capable and prove myself
That's really powerful - wanting to feel capable...

Just provide your response directly.`

    case 'micro_win':
      return `${basePrompt}

Now help them identify the smallest possible first step - a "micro-win" they can do in the next day or two.

The key is finding something:
- Very small (5-15 minutes)
- Concrete and specific
- They can do immediately
- That creates momentum

Ask them: What's the tiniest first step you could take? Something so small it feels almost too easy?

When they share a specific first step, include [MICROWIN_CAPTURED] at the START of your response, followed by the step description, then your message.

Example:
[MICROWIN_CAPTURED]
Watch one 10-minute piano tutorial
That's perfect! Small steps build momentum...

Just provide your response directly.`

    case 'confirmation':
      return `${basePrompt}

Summarize what you've captured:
- Their goal
- Their why (the emotional motivation)
- Their first micro-win

Then ask if they're ready to commit to this goal, or if they want to adjust anything.

When they confirm, include [GOAL_COMPLETE] at the START of your response, then give them an encouraging send-off.

Just provide your response directly.`

    case 'complete':
      return `${basePrompt}

The goal has been created! Give them a brief, warm encouragement to get started on their first step.

Just provide your response directly.`

    default:
      return basePrompt
  }
}

// Parse coaching response for stage transitions and captured data
export function parseCoachingResponse(response: string): {
  message: string
  goalTitle?: string
  whyRoot?: string
  microWin?: string
  isComplete?: boolean
} {
  const result: ReturnType<typeof parseCoachingResponse> = { message: response }

  // Check for goal capture
  const goalMatch = response.match(/\[GOAL_CAPTURED\]\s*\n?([^\n]+)\n?([\s\S]*)/)
  if (goalMatch) {
    result.goalTitle = goalMatch[1].trim()
    result.message = goalMatch[2].trim()
    return result
  }

  // Check for why capture
  const whyMatch = response.match(/\[WHY_CAPTURED\]\s*\n?([^\n]+)\n?([\s\S]*)/)
  if (whyMatch) {
    result.whyRoot = whyMatch[1].trim()
    result.message = whyMatch[2].trim()
    return result
  }

  // Check for micro-win capture
  const microMatch = response.match(/\[MICROWIN_CAPTURED\]\s*\n?([^\n]+)\n?([\s\S]*)/)
  if (microMatch) {
    result.microWin = microMatch[1].trim()
    result.message = microMatch[2].trim()
    return result
  }

  // Check for completion
  if (response.includes('[GOAL_COMPLETE]')) {
    result.isComplete = true
    result.message = response.replace('[GOAL_COMPLETE]', '').trim()
    return result
  }

  return result
}

// Determine next stage based on current context
export function getNextStage(
  currentStage: CoachingStage,
  context: CoachingContext
): CoachingStage {
  switch (currentStage) {
    case 'welcome':
      return 'goal_discovery'
    case 'goal_discovery':
      return context.goalTitle ? 'why_drilling' : 'goal_discovery'
    case 'goal_refinement':
      return 'why_drilling'
    case 'why_drilling':
      return context.whyRoot ? 'micro_win' : 'why_drilling'
    case 'micro_win':
      return context.microWin ? 'confirmation' : 'micro_win'
    case 'confirmation':
      return 'complete'
    default:
      return currentStage
  }
}
