import Anthropic from '@anthropic-ai/sdk'
import type { AIProvider, ExtractedNote } from '../index'
import {
  CONTINUATION_PROMPT,
  parseContinuationResponse,
  type GoalContext,
  type PragmaticContext,
  type ContinuationResult
} from '../prompts/continuation'
import { EXTRACTION_PROMPT } from '../prompts/extraction'

export class AnthropicProvider implements AIProvider {
  private client: Anthropic

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })
  }

  async generatePrompt(
    context: string,
    learningGoals?: string[],
    activeGoals?: GoalContext[],
    pragmaticContext?: PragmaticContext
  ): Promise<ContinuationResult> {
    const systemPrompt = CONTINUATION_PROMPT(learningGoals, activeGoals, pragmaticContext)

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 150, // Slightly more for markers
      system: systemPrompt,
      messages: [
        { role: 'user', content: `Recent writing:\n\n${context}` }
      ]
    })

    const textBlock = response.content.find(block => block.type === 'text')
    const rawResponse = textBlock?.type === 'text' ? textBlock.text : "[TONE:reflective]\nWhat happens next?"

    return parseContinuationResponse(rawResponse, pragmaticContext)
  }

  async extractNotes(text: string): Promise<ExtractedNote[]> {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: EXTRACTION_PROMPT,
      messages: [
        { role: 'user', content: text }
      ]
    })

    const textBlock = response.content.find(block => block.type === 'text')
    if (!textBlock || textBlock.type !== 'text') return []

    try {
      // Extract JSON from the response
      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return []

      const parsed = JSON.parse(jsonMatch[0])
      return parsed.notes || []
    } catch {
      return []
    }
  }
}
