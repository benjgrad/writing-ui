import { OpenAIProvider } from './providers/openai'
import { AnthropicProvider } from './providers/anthropic'
import type { GoalContext } from './prompts/continuation'

export interface ExtractedNote {
  title: string
  content: string
  tags: string[]
  connections: Array<{
    targetTitle: string
    type: 'related' | 'supports' | 'contradicts' | 'extends' | 'example_of'
    strength: number
  }>
}

export interface AIProvider {
  generatePrompt(
    context: string,
    learningGoals?: string[],
    activeGoals?: GoalContext[]
  ): Promise<string>
  extractNotes(text: string): Promise<ExtractedNote[]>
}

export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER || 'anthropic'

  switch (provider) {
    case 'openai':
      return new OpenAIProvider()
    case 'anthropic':
      return new AnthropicProvider()
    default:
      // Fallback to a mock provider if no API keys are configured
      return {
        async generatePrompt(): Promise<string> {
          const prompts = [
            "What happens next?",
            "And then...",
            "But why?",
            "What if everything changed?",
            "Who else was there?",
            "What did they discover?",
            "How did it begin?",
            "What were they afraid of?"
          ]
          return prompts[Math.floor(Math.random() * prompts.length)]
        },
        async extractNotes(): Promise<ExtractedNote[]> {
          return []
        }
      }
  }
}
