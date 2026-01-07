// Goal information for personalized prompts
export interface GoalContext {
  title: string
  why_root?: string | null
  momentum: number // 1-5: 1=Stuck, 5=Flowing
  current_micro_win?: string | null
}

export const CONTINUATION_PROMPT = (
  learningGoals?: string[],
  activeGoals?: GoalContext[]
) => {
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

  return `You are a thoughtful writing companion. Your role is to provide a brief, inspiring prompt to help the writer continue their flow.

Based on the recent writing provided, generate a single short question or statement (1 sentence max) that:
- Naturally follows from what they've written
- Sparks curiosity or deeper exploration
- Is open-ended and inviting
- Matches the tone and style of their writing

Do NOT:
- Ask multiple questions
- Provide suggestions or advice
- Explain or analyze their writing
- Be too specific or leading

Just provide the prompt text directly, nothing else.${goalsSection}`
}
