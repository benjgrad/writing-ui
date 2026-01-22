// Goal information for personalized prompts
export interface GoalContext {
  title: string
  why_root?: string | null
  momentum: number // 1-5: 1=Stuck, 5=Flowing
  current_micro_win?: string | null
}

// Tone detection types
export type EntryTone = 'pragmatic' | 'reflective'

export type PragmaticStage =
  | 'grounding'    // "Where are you with this?"
  | 'motivation'   // "Why does this matter?"
  | 'clarity'      // "What outcome do you want?"
  | 'obstacles'    // "What's in the way?"
  | 'next_step'    // "What's one action you can take?"
  | 'complete'

export interface PragmaticContext {
  stage: PragmaticStage
  topic: string
  answers: Record<string, string>  // stage -> user's answer
}

export interface ContinuationResult {
  prompt: string
  tone: EntryTone
  pragmaticContext?: PragmaticContext
}

// Helper to build pragmatic coaching instructions based on current stage
function getPragmaticInstructions(ctx: PragmaticContext): string {
  const stageGuide: Record<PragmaticStage, string> = {
    grounding: `Current stage: GROUNDING
The writer is exploring: "${ctx.topic}"
${ctx.answers.grounding ? `Their previous grounding answer: "${ctx.answers.grounding}"` : ''}
Ask a question that helps them assess their current state. Examples:
- "On a scale of 1-10, how clear are you about what you want?"
- "What have you already tried?"
- "Where do you feel most stuck right now?"`,

    motivation: `Current stage: MOTIVATION
Topic: "${ctx.topic}"
Their grounding: "${ctx.answers.grounding || 'not yet answered'}"
Ask why this matters to them. Connect to values or deeper feelings.`,

    clarity: `Current stage: CLARITY
Topic: "${ctx.topic}"
Their motivation: "${ctx.answers.motivation || 'not yet answered'}"
Ask what specific outcome they want. Get concrete.`,

    obstacles: `Current stage: OBSTACLES
Topic: "${ctx.topic}"
Their desired outcome: "${ctx.answers.clarity || 'not yet answered'}"
Ask what's getting in the way. Name the blockers.`,

    next_step: `Current stage: NEXT_STEP
Topic: "${ctx.topic}"
Their obstacles: "${ctx.answers.obstacles || 'not yet answered'}"
Ask about one small concrete action they could take today or this week.`,

    complete: `The coaching sequence is complete. Offer brief encouragement and acknowledge their progress.`
  }

  return `You are continuing a PRAGMATIC coaching conversation.

${stageGuide[ctx.stage]}

Based on what the writer has written, determine if they've answered the current stage's question.
If they have answered, extract their answer and advance to the next stage.
If they haven't answered yet (or their writing is about something else), stay at the current stage.

Stage progression: grounding -> motivation -> clarity -> obstacles -> next_step -> complete

RESPONSE FORMAT:
[TONE:pragmatic]
[STAGE:${ctx.stage}] (or next stage if they answered)
[TOPIC:${ctx.topic}]
[ANSWER:their answer summary] (only if they answered the current stage's question)
{Your single-sentence coaching prompt for the current or next stage}`
}

export const CONTINUATION_PROMPT = (
  learningGoals?: string[],
  activeGoals?: GoalContext[],
  pragmaticContext?: PragmaticContext
) => {
  // If we're in an active pragmatic coaching session, use specialized instructions
  if (pragmaticContext && pragmaticContext.stage !== 'complete') {
    return getPragmaticInstructions(pragmaticContext)
  }

  // Support both old learning_goals and new Momentum Engine goals
  let goalsSection = ''

  if (activeGoals?.length) {
    // New Momentum Engine goals - more context-rich
    const goalsText = activeGoals.map(g => {
      let goalLine = `- "${g.title}"`
      if (g.why_root) {
        goalLine += ` (motivation: ${g.why_root})`
      }
      if (g.current_micro_win) {
        goalLine += ` [current focus: ${g.current_micro_win}]`
      }
      if (g.momentum <= 2) {
        goalLine += ' [feeling stuck - needs encouragement]'
      } else if (g.momentum >= 4) {
        goalLine += ' [in flow - support momentum]'
      }
      return goalLine
    }).join('\n')

    goalsSection = `

The writer has ${activeGoals.length} active goal${activeGoals.length > 1 ? 's' : ''}:
${goalsText}

When crafting your prompt:
- Subtly connect to their goals when relevant
- If they seem stuck (low momentum), be encouraging and grounding
- If they're flowing (high momentum), support continued exploration
- Reference their "why" motivation if it helps deepen reflection`
  } else if (learningGoals?.length) {
    // Legacy learning_goals format
    goalsSection = `

The writer's learning goals are:
${learningGoals.map(g => `- ${g}`).join('\n')}

Consider these goals when crafting your prompt.`
  }

  return `You are a thoughtful writing companion. Your role is to provide a brief, helpful prompt to help the writer continue.

FIRST, analyze the writing to determine the appropriate response style:

PRAGMATIC entries show:
- Problem-solving language ("need to figure out", "overwhelmed by", "how do I", "I should")
- Action-oriented framing (job search, project planning, decision making, task lists)
- Seeking structure, clarity, or a plan
- Concrete challenges, tasks, or goals mentioned
- Feeling stuck or uncertain about next steps

REFLECTIVE entries show:
- Emotional exploration ("feeling", "wondering", "curious about")
- Open-ended pondering or introspection
- Creative or narrative content
- Processing experiences, relationships, or emotions
- No clear action or decision needed

For REFLECTIVE entries:
- Generate a single short question or statement (1 sentence max)
- Naturally follows from what they've written
- Sparks curiosity or deeper exploration
- Open-ended and inviting
- Matches their contemplative tone

For PRAGMATIC entries:
- Recognize they need structured guidance, not abstract reflection
- Start with a GROUNDING question to understand where they are
- Be concrete and action-oriented
- One clear question that helps them gain clarity
- Extract the main topic they're working on

RESPONSE FORMAT (required):
[TONE:pragmatic] or [TONE:reflective]
[STAGE:grounding] (only for pragmatic - always start at grounding)
[TOPIC:extracted topic] (only for pragmatic - e.g., "job search", "project deadline")
{Your single-sentence prompt}

EXAMPLES:

Reflective example:
[TONE:reflective]
What would it feel like to have already found what you're looking for?

Pragmatic example:
[TONE:pragmatic]
[STAGE:grounding]
[TOPIC:job search]
On a scale of 1-10, how clear are you right now about what kind of role you actually want?

Do NOT:
- Ask multiple questions
- Provide long explanations
- Skip the tone/stage markers${goalsSection}`
}

// Stage progression order
const STAGE_ORDER: PragmaticStage[] = ['grounding', 'motivation', 'clarity', 'obstacles', 'next_step', 'complete']

function getNextStage(currentStage: PragmaticStage): PragmaticStage {
  const currentIndex = STAGE_ORDER.indexOf(currentStage)
  if (currentIndex === -1 || currentIndex >= STAGE_ORDER.length - 1) {
    return 'complete'
  }
  return STAGE_ORDER[currentIndex + 1]
}

// Parse AI response to extract tone, stage, topic, and clean prompt
export function parseContinuationResponse(
  response: string,
  existingContext?: PragmaticContext
): ContinuationResult {
  // Extract markers
  const toneMatch = response.match(/\[TONE:(pragmatic|reflective)\]/)
  const stageMatch = response.match(/\[STAGE:(\w+)\]/)
  const topicMatch = response.match(/\[TOPIC:([^\]]+)\]/)
  const answerMatch = response.match(/\[ANSWER:([^\]]+)\]/)

  // Clean the prompt text (remove all markers)
  const prompt = response
    .replace(/\[TONE:\w+\]\s*/g, '')
    .replace(/\[STAGE:\w+\]\s*/g, '')
    .replace(/\[TOPIC:[^\]]+\]\s*/g, '')
    .replace(/\[ANSWER:[^\]]+\]\s*/g, '')
    .trim()

  const tone = (toneMatch?.[1] as EntryTone) || 'reflective'

  // If reflective, return simple result
  if (tone === 'reflective') {
    return { prompt, tone }
  }

  // For pragmatic, build context
  const stage = (stageMatch?.[1] as PragmaticStage) || 'grounding'
  const topic = topicMatch?.[1]?.trim() || existingContext?.topic || 'your situation'
  const answer = answerMatch?.[1]?.trim()

  // Build updated answers object
  const answers = { ...(existingContext?.answers || {}) }

  // If we got an answer and we're advancing stages, store the answer for the previous stage
  if (answer && existingContext) {
    // The answer is for the stage we were on before this response
    const previousStage = existingContext.stage
    if (previousStage !== stage) {
      // We advanced, so store the answer under the previous stage
      answers[previousStage] = answer
    }
  }

  return {
    prompt,
    tone,
    pragmaticContext: {
      stage,
      topic,
      answers
    }
  }
}
