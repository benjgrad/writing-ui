import OpenAI from 'openai'
import type { AIProvider, ExtractedNote } from '../index'
import { CONTINUATION_PROMPT, type GoalContext } from '../prompts/continuation'
import { EXTRACTION_PROMPT } from '../prompts/extraction'

export class OpenAIProvider implements AIProvider {
  private client: OpenAI

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }

  async generatePrompt(
    context: string,
    learningGoals?: string[],
    activeGoals?: GoalContext[]
  ): Promise<string> {
    const systemPrompt = CONTINUATION_PROMPT(learningGoals, activeGoals)

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Recent writing:\n\n${context}` }
      ],
      max_tokens: 100,
      temperature: 0.8
    })

    return response.choices[0]?.message?.content || "What happens next?"
  }

  async extractNotes(text: string): Promise<ExtractedNote[]> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: EXTRACTION_PROMPT },
        { role: 'user', content: text }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
      temperature: 0.3
    })

    const content = response.choices[0]?.message?.content
    if (!content) return []

    try {
      const parsed = JSON.parse(content)
      return parsed.notes || []
    } catch {
      return []
    }
  }
}
