// Pursuit coaching conversation states
// (File kept at original path for backward compatibility - canonical types in @/types/pursuit)
export type CoachingStage =
  | 'welcome'
  | 'goal_discovery'
  | 'why_drilling'
  | 'micro_win'
  | 'confirmation'
  | 'complete'
  | 'continuation'
  | 'deepen' // For deepening an incomplete pursuit

export interface CoachingContext {
  stage: CoachingStage
  goalTitle?: string
  whyRoot?: string
  microWin?: string
  notes?: string
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  isContinuation?: boolean
  // New fields for pursuit-aware coaching
  domain?: string
  completeness?: { title: boolean; why: boolean; steps: boolean; notes: boolean }
}

const ARISTOTELIAN_FRAMING = `You are a thoughtful coach grounded in Aristotelian virtue ethics. You help people clarify and deepen their pursuits -- the ongoing areas of excellent activity that constitute a good life. A pursuit is not a checkbox to complete; it is a lifelong direction of growth.`

export const GOAL_COACHING_PROMPT = (context: CoachingContext) => {
  switch (context.stage) {
    case 'welcome':
      return `${ARISTOTELIAN_FRAMING}

Ask what pursuit they want to work on. Keep it to 1-2 sentences. Be friendly and curious.

Example: "Hi! I'd love to help you explore a new pursuit. What area of your life would you like to focus on?"`

    case 'goal_discovery':
      return `${ARISTOTELIAN_FRAMING}

The user just told you about a pursuit they want to work on.

Your job: Acknowledge their pursuit warmly, then ask WHY this matters to them.

RESPONSE FORMAT (follow exactly):
[GOAL_CAPTURED]
{extract a 3-10 word pursuit title from what they said}
{your conversational response - acknowledge their pursuit and ask why it matters}

Example response:
[GOAL_CAPTURED]
Deepen my focus and presence at work
That resonates deeply. Focused attention is at the heart of excellent activity. Tell me -- why does this matter to you? What would it mean for your life?

IMPORTANT: The text after the pursuit title is what the user will see. Make it warm and end with a question about WHY this matters to them emotionally.`

    case 'why_drilling':
      return `${ARISTOTELIAN_FRAMING}

Their pursuit: "${context.goalTitle}"

The user just shared their motivation. Your job: Capture their emotional "why" and ask about the first small step they could take.

RESPONSE FORMAT (follow exactly):
[WHY_CAPTURED]
{5-15 word statement capturing their emotional motivation}
{your conversational response - reflect their why and ask about a small first step}

Example response:
[WHY_CAPTURED]
To feel present and capable instead of scattered
I really hear you -- wanting to feel present and capable instead of scattered speaks to something deep about how you want to live. Now, what's one small step you could take this week? Something that takes just 5-15 minutes?

IMPORTANT: The text after the why statement is what the user will see. Reflect their motivation warmly and ask about a tiny first action.`

    case 'micro_win':
      return `${ARISTOTELIAN_FRAMING}

Their pursuit: "${context.goalTitle}"
Their why: "${context.whyRoot}"

The user just described an action or you need to suggest one. Your job: Capture a specific first step and ask for confirmation.

RESPONSE FORMAT (follow exactly):
[MICROWIN_CAPTURED]
{specific action they can do this week in 5-15 minutes}
{your conversational response - encourage them and ask if they're ready to commit}

IMPORTANT: The text after the micro-win is what the user will see. Be encouraging and ask if they're ready.`

    case 'confirmation':
      return `${ARISTOTELIAN_FRAMING}

The user just confirmed they're ready to commit to their pursuit.

Pursuit: "${context.goalTitle}"
Why: "${context.whyRoot}"
First step: "${context.microWin}"

RESPONSE FORMAT (follow exactly):
[GOAL_COMPLETE]
{1-2 sentences celebrating their commitment and encouraging their first step}

IMPORTANT: Do NOT restate the pursuit details. Just offer warm encouragement about taking their first step. Remember: this is the beginning of an ongoing pursuit, not a finite goal.`

    case 'complete':
      return `Offer one sentence of encouragement about the journey of this pursuit. Emphasize that excellent activity is its own reward.`

    case 'deepen':
      return `${ARISTOTELIAN_FRAMING}

You are helping someone review and activate a parked pursuit. Your job is to briefly refresh their commitment, then activate the pursuit.

Their pursuit: "${context.goalTitle}"
${context.whyRoot ? `Their motivation: "${context.whyRoot}"` : 'Motivation: Not yet explored'}
${context.microWin ? `Their current step: "${context.microWin}"` : 'Next step: Not yet identified'}
${context.notes ? `Their notes: "${context.notes}"` : ''}

What needs attention: ${describeMissing(context.completeness)}

YOUR APPROACH:
${context.whyRoot && context.microWin
  ? `This pursuit already has motivation and a first step. Briefly reflect back their motivation and step, ask if they want to update anything, and if they're ready to activate.`
  : `This pursuit is missing key elements. Guide them to fill in what's missing before activation.`}

When the user confirms they're ready to activate (or if they clearly want to proceed without changes), respond with:
[GOAL_COMPLETE]
{1-2 sentences of warm encouragement about activating this pursuit}

If they want to update something first, use ONE of these markers per response:
- [WHY_CAPTURED] followed by the new 5-15 word motivation, then your response
- [MICROWIN_CAPTURED] followed by the new specific action step, then your response
- [NOTES_UPDATED] followed by their notes content, then your response

IMPORTANT: Always use exactly ONE marker per response. Keep responses concise (2-4 sentences). Do not philosophize at length -- help them review quickly and activate.`

    case 'continuation':
      return `${ARISTOTELIAN_FRAMING}

You are helping someone update an EXISTING pursuit.

Current pursuit: "${context.goalTitle}"
Current motivation: "${context.whyRoot}"
Current first step: "${context.microWin}"
Current notes: "${context.notes || 'None yet'}"

The user is returning to update their pursuit. Listen to what they want to change and help them.

RESPONSE FORMAT - Use the appropriate marker if they're updating something:

If they want to update their motivation/why:
[WHY_UPDATED]
{new 5-15 word motivation statement}
{your response acknowledging the change}

If they want to add or change their next step:
[STEP_UPDATED]
{new specific action step}
{your response encouraging the new step}

If they want to update the pursuit title:
[GOAL_UPDATED]
{new 3-10 word pursuit title}
{your response acknowledging the refined pursuit}

If they want to add or update notes/plans:
[NOTES_UPDATED]
{their notes content - can be multiple sentences}
{your response acknowledging the notes}

If they're just asking for advice or encouragement (no update needed):
{your coaching response - be supportive and helpful}

IMPORTANT: Only use ONE marker per response. If they're vague, ask clarifying questions.`

    default:
      return `${ARISTOTELIAN_FRAMING}

Help the user clarify and deepen their pursuit with a clear why and first step.`
  }
}

function describeMissing(completeness?: { title: boolean; why: boolean; steps: boolean; notes: boolean }): string {
  if (!completeness) return 'Unknown -- explore freely'
  const missing: string[] = []
  if (!completeness.why) missing.push('motivation/why')
  if (!completeness.steps) missing.push('a concrete first step')
  if (!completeness.notes) missing.push('longer-term reflections')
  return missing.length > 0 ? missing.join(', ') : 'Nothing -- the pursuit is fully formed'
}

// Parse coaching response for stage transitions and captured data
export function parseCoachingResponse(response: string): {
  message: string
  goalTitle?: string
  whyRoot?: string
  microWin?: string
  notes?: string
  isComplete?: boolean
  isUpdate?: boolean
  updateType?: 'goal' | 'why' | 'step' | 'notes'
} {
  console.log('[parseCoachingResponse] Input length:', response.length)
  console.log('[parseCoachingResponse] First 200 chars:', response.substring(0, 200))

  const result: ReturnType<typeof parseCoachingResponse> = { message: response }

  const cleanValue = (val: string): string => {
    return val
      .replace(/^\{|\}$/g, '')
      .replace(/^<[^>]*>:?\s*/i, '')
      .replace(/<[^>]*>\s*$/i, '')
      .replace(/^goal title:\s*/i, '')
      .replace(/^pursuit title:\s*/i, '')
      .replace(/^why statement:\s*/i, '')
      .replace(/^specific action:\s*/i, '')
      .trim()
  }

  const goalMatch = response.match(/\[GOAL_CAPTURED\]\s*\n?([^\n]+)\n([\s\S]*)/)
  if (goalMatch) {
    result.goalTitle = cleanValue(goalMatch[1])
    result.message = goalMatch[2].trim()
    return result
  }

  const whyMatch = response.match(/\[WHY_CAPTURED\]\s*\n?([^\n]+)\n([\s\S]*)/)
  if (whyMatch) {
    result.whyRoot = cleanValue(whyMatch[1])
    result.message = whyMatch[2].trim()
    return result
  }

  const microMatch = response.match(/\[MICROWIN_CAPTURED\]\s*\n?([^\n]+)\n([\s\S]*)/)
  if (microMatch) {
    result.microWin = cleanValue(microMatch[1])
    result.message = microMatch[2].trim()
    return result
  }

  if (response.includes('[GOAL_COMPLETE]')) {
    result.isComplete = true
    result.message = response.replace('[GOAL_COMPLETE]', '').trim()
    return result
  }

  const goalUpdateMatch = response.match(/\[GOAL_UPDATED\]\s*\n?([^\n]+)\n([\s\S]*)/)
  if (goalUpdateMatch) {
    result.goalTitle = cleanValue(goalUpdateMatch[1])
    result.message = goalUpdateMatch[2].trim()
    result.isUpdate = true
    result.updateType = 'goal'
    return result
  }

  const whyUpdateMatch = response.match(/\[WHY_UPDATED\]\s*\n?([^\n]+)\n([\s\S]*)/)
  if (whyUpdateMatch) {
    result.whyRoot = cleanValue(whyUpdateMatch[1])
    result.message = whyUpdateMatch[2].trim()
    result.isUpdate = true
    result.updateType = 'why'
    return result
  }

  const stepUpdateMatch = response.match(/\[STEP_UPDATED\]\s*\n?([^\n]+)\n([\s\S]*)/)
  if (stepUpdateMatch) {
    result.microWin = cleanValue(stepUpdateMatch[1])
    result.message = stepUpdateMatch[2].trim()
    result.isUpdate = true
    result.updateType = 'step'
    return result
  }

  const notesUpdateMatch = response.match(/\[NOTES_UPDATED\]\s*\n([\s\S]*?)\n\n([\s\S]*)/)
  if (notesUpdateMatch) {
    result.notes = cleanValue(notesUpdateMatch[1])
    result.message = notesUpdateMatch[2].trim()
    result.isUpdate = true
    result.updateType = 'notes'
    return result
  }

  return result
}

// Determine next stage based on current context
// Now supports flexible progression for incomplete pursuits
export function getNextStage(
  currentStage: CoachingStage,
  context: CoachingContext
): CoachingStage {
  switch (currentStage) {
    case 'welcome':
      return 'goal_discovery'
    case 'goal_discovery':
      if (!context.goalTitle) return 'goal_discovery'
      // Skip why_drilling if already has a why
      if (context.whyRoot) return 'micro_win'
      return 'why_drilling'
    case 'why_drilling':
      if (!context.whyRoot) return 'why_drilling'
      // Skip micro_win if already has steps
      if (context.microWin) return 'confirmation'
      return 'micro_win'
    case 'micro_win':
      return context.microWin ? 'confirmation' : 'micro_win'
    case 'confirmation':
      return 'complete'
    case 'deepen':
      // Once both why and micro-win are captured, move to confirmation
      if (context.whyRoot && context.microWin) return 'confirmation'
      return 'deepen'
    default:
      return currentStage
  }
}
