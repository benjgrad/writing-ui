// Goal coaching conversation states
export type CoachingStage =
  | 'welcome'
  | 'goal_discovery'
  | 'why_drilling'
  | 'micro_win'
  | 'confirmation'
  | 'complete'
  | 'continuation' // For continuing a completed session

export interface CoachingContext {
  stage: CoachingStage
  goalTitle?: string
  whyRoot?: string
  microWin?: string
  notes?: string // Longer-term plans and reflections
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  isContinuation?: boolean // True when continuing a completed session
}

export const GOAL_COACHING_PROMPT = (context: CoachingContext) => {
  switch (context.stage) {
    case 'welcome':
      return `You are a warm, supportive goal coach. Ask what goal they want to work on.

Keep it to 1-2 sentences. Be friendly and curious. Example: "Hi! I'm excited to help you work on a new goal. What would you like to focus on?"`

    case 'goal_discovery':
      return `You are a goal coach. The user just told you about a goal they want to work on.

Your job: Acknowledge their goal warmly, then ask WHY this goal matters to them.

RESPONSE FORMAT (follow exactly):
[GOAL_CAPTURED]
{extract a 3-10 word goal title from what they said}
{your conversational response - acknowledge their goal and ask why it matters}

Example response:
[GOAL_CAPTURED]
Improve focus and concentration at work
That's a great goal! I can see how important that is. Tell me - why does improving your focus matter to you? What would it mean for your life?

IMPORTANT: The text after the goal title is what the user will see. Make it warm and end with a question about WHY this matters to them emotionally.`

    case 'why_drilling':
      return `You are a goal coach helping someone understand WHY their goal matters.
Their goal: "${context.goalTitle}"

The user just shared their motivation. Your job: Capture their emotional "why" and ask about the first small step they could take.

RESPONSE FORMAT (follow exactly):
[WHY_CAPTURED]
{5-15 word statement capturing their emotional motivation}
{your conversational response - reflect their why and ask about a small first step}

Example response:
[WHY_CAPTURED]
To feel present and capable instead of scattered
I really hear you - wanting to feel present and capable instead of scattered is so important. Now, what's one small step you could take this week to start building that focus? Something that takes just 5-15 minutes?

IMPORTANT: The text after the why statement is what the user will see. Reflect their motivation warmly and ask about a tiny first action.`

    case 'micro_win':
      return `You are a goal coach helping someone identify their first small step.
Their goal: "${context.goalTitle}"
Their why: "${context.whyRoot}"

The user just described an action or you need to suggest one. Your job: Capture a specific first step and ask for confirmation.

RESPONSE FORMAT (follow exactly):
[MICROWIN_CAPTURED]
{specific action they can do this week in 5-15 minutes}
{your conversational response - encourage them and ask if they're ready to commit}

Example response:
[MICROWIN_CAPTURED]
Do a 10-minute guided breathing exercise tomorrow morning
I love that first step! Starting with 10 minutes of focused breathing is perfect - small enough to actually do, but powerful enough to feel the difference. Ready to make this your goal?

IMPORTANT: The text after the micro-win is what the user will see. Be encouraging and ask if they're ready.`

    case 'confirmation':
      return `You are a goal coach. The user just confirmed they're ready to commit to their goal.

Goal: "${context.goalTitle}"
Why: "${context.whyRoot}"
First step: "${context.microWin}"

RESPONSE FORMAT (follow exactly):
[GOAL_COMPLETE]
{1-2 sentences celebrating their commitment and encouraging their first step}

Example response:
[GOAL_COMPLETE]
Amazing! You've got a clear goal, a meaningful why, and a doable first step. I'm excited for you to start with that 10-minute breathing session - you're going to feel the difference right away.

IMPORTANT: Do NOT restate the goal details. Just offer warm encouragement about taking their first step.`

    case 'complete':
      return `Offer one sentence of encouragement about their journey ahead.`

    case 'continuation':
      return `You are a supportive goal coach helping someone update an EXISTING goal.

Current goal: "${context.goalTitle}"
Current motivation: "${context.whyRoot}"
Current first step: "${context.microWin}"
Current notes: "${context.notes || 'None yet'}"

The user is returning to update their goal. Listen to what they want to change and help them.

RESPONSE FORMAT - Use the appropriate marker if they're updating something:

If they want to update their motivation/why:
[WHY_UPDATED]
{new 5-15 word motivation statement}
{your response acknowledging the change}

If they want to add or change their next step:
[STEP_UPDATED]
{new specific action step}
{your response encouraging the new step}

If they want to update the goal title:
[GOAL_UPDATED]
{new 3-10 word goal title}
{your response acknowledging the refined goal}

If they want to add or update notes/plans (longer-term thoughts, milestones, reflections):
[NOTES_UPDATED]
{their notes content - can be multiple sentences}
{your response acknowledging the notes}

If they're just asking for advice or encouragement (no update needed):
{your coaching response - be supportive and helpful}

IMPORTANT: Only use ONE marker per response. If they're vague, ask clarifying questions.`

    default:
      return `You are a goal coach. Help the user set a meaningful goal with a clear why and first step.`
  }
}

// Parse coaching response for stage transitions and captured data
export function parseCoachingResponse(response: string): {
  message: string
  goalTitle?: string
  whyRoot?: string
  microWin?: string
  notes?: string
  isComplete?: boolean
  isUpdate?: boolean // True if this was an update to an existing goal
  updateType?: 'goal' | 'why' | 'step' | 'notes' // What was updated
} {
  console.log('[parseCoachingResponse] Input length:', response.length)
  console.log('[parseCoachingResponse] First 200 chars:', response.substring(0, 200))

  const result: ReturnType<typeof parseCoachingResponse> = { message: response }

  // Helper to clean extracted values - removes template markers like {}, <>, brackets
  const cleanValue = (val: string): string => {
    return val
      .replace(/^\{|\}$/g, '') // Remove curly braces
      .replace(/^<[^>]*>:?\s*/i, '') // Remove angle bracket labels
      .replace(/<[^>]*>\s*$/i, '') // Remove trailing angle brackets
      .replace(/^goal title:\s*/i, '')
      .replace(/^why statement:\s*/i, '')
      .replace(/^specific action:\s*/i, '')
      .trim()
  }

  // Check for goal capture - format: [GOAL_CAPTURED]\n{goal title}\n{message}
  const goalMatch = response.match(/\[GOAL_CAPTURED\]\s*\n?([^\n]+)\n([\s\S]*)/)
  if (goalMatch) {
    console.log('[parseCoachingResponse] GOAL_CAPTURED matched!')
    result.goalTitle = cleanValue(goalMatch[1])
    result.message = goalMatch[2].trim()
    return result
  }

  // Check for why capture
  const whyMatch = response.match(/\[WHY_CAPTURED\]\s*\n?([^\n]+)\n([\s\S]*)/)
  if (whyMatch) {
    console.log('[parseCoachingResponse] WHY_CAPTURED matched!')
    result.whyRoot = cleanValue(whyMatch[1])
    result.message = whyMatch[2].trim()
    return result
  }

  // Check for micro-win capture
  const microMatch = response.match(/\[MICROWIN_CAPTURED\]\s*\n?([^\n]+)\n([\s\S]*)/)
  if (microMatch) {
    console.log('[parseCoachingResponse] MICROWIN_CAPTURED matched!')
    result.microWin = cleanValue(microMatch[1])
    result.message = microMatch[2].trim()
    return result
  }

  // Check for completion
  if (response.includes('[GOAL_COMPLETE]')) {
    console.log('[parseCoachingResponse] GOAL_COMPLETE matched!')
    result.isComplete = true
    result.message = response.replace('[GOAL_COMPLETE]', '').trim()
    return result
  }

  // Check for continuation updates
  const goalUpdateMatch = response.match(/\[GOAL_UPDATED\]\s*\n?([^\n]+)\n([\s\S]*)/)
  if (goalUpdateMatch) {
    console.log('[parseCoachingResponse] GOAL_UPDATED matched!')
    result.goalTitle = cleanValue(goalUpdateMatch[1])
    result.message = goalUpdateMatch[2].trim()
    result.isUpdate = true
    result.updateType = 'goal'
    return result
  }

  const whyUpdateMatch = response.match(/\[WHY_UPDATED\]\s*\n?([^\n]+)\n([\s\S]*)/)
  if (whyUpdateMatch) {
    console.log('[parseCoachingResponse] WHY_UPDATED matched!')
    result.whyRoot = cleanValue(whyUpdateMatch[1])
    result.message = whyUpdateMatch[2].trim()
    result.isUpdate = true
    result.updateType = 'why'
    return result
  }

  const stepUpdateMatch = response.match(/\[STEP_UPDATED\]\s*\n?([^\n]+)\n([\s\S]*)/)
  if (stepUpdateMatch) {
    console.log('[parseCoachingResponse] STEP_UPDATED matched!')
    result.microWin = cleanValue(stepUpdateMatch[1])
    result.message = stepUpdateMatch[2].trim()
    result.isUpdate = true
    result.updateType = 'step'
    return result
  }

  // Notes can be multi-line, so capture everything until the response message
  // Format: [NOTES_UPDATED]\n{notes content - possibly multi-line}\n\n{response}
  const notesUpdateMatch = response.match(/\[NOTES_UPDATED\]\s*\n([\s\S]*?)\n\n([\s\S]*)/)
  if (notesUpdateMatch) {
    console.log('[parseCoachingResponse] NOTES_UPDATED matched!')
    result.notes = cleanValue(notesUpdateMatch[1])
    result.message = notesUpdateMatch[2].trim()
    result.isUpdate = true
    result.updateType = 'notes'
    return result
  }

  console.log('[parseCoachingResponse] No markers found')
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
