# Writing Prompt Generation Documentation

## Overview

The writing-ui application generates AI-powered prompts to help writers maintain flow and explore their ideas. The system supports two main types of prompts: **continuation prompts** and **extraction prompts**.

## Architecture

### Core Components

- **AI Providers**: Support for Anthropic Claude, OpenAI GPT, and fallback providers
- **Prompt Templates**: Pre-defined system prompts for different use cases
- **API Endpoints**: RESTful endpoints for prompt generation
- **Frontend Integration**: React components that trigger and display prompts

### File Structure

```
src/lib/ai/
├── index.ts              # Main AI provider interface and factory
├── providers/
│   ├── anthropic.ts      # Anthropic Claude implementation
│   └── openai.ts         # OpenAI GPT implementation
└── prompts/
    ├── continuation.ts   # Writing continuation prompts
    └── extraction.ts     # Knowledge extraction prompts

src/app/api/ai/
├── prompt/route.ts       # Continuation prompt API endpoint
└── extract/route.ts      # Extraction API endpoint
```

## Prompt Types

### Continuation Prompts

**Purpose**: Help writers continue their writing flow by providing contextual suggestions.

**Trigger Conditions**:

- When all written text has faded (30-second timer)
- When starting a new writing session
- When user dismisses current prompt and continues writing

**System Prompt Template**:

```typescript
export const CONTINUATION_PROMPT = (learningGoals?: string[]) => {
  const goalsSection = learningGoals?.length
    ? `\n\nThe writer's learning goals are:\n${learningGoals
        .map((g) => `- ${g}`)
        .join("\n")}\n\nConsider these goals when crafting your prompt.`
    : "";

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

Just provide the prompt text directly, nothing else.${goalsSection}`;
};
```

**Example Outputs**:

- "What happens next?"
- "And then..."
- "But why?"
- "What if everything changed?"
- "Who else was there?"

### Extraction Prompts

**Purpose**: Extract atomic notes from written content for knowledge graph creation using the Zettelkasten method.

**System Prompt Template**:

```typescript
export const EXTRACTION_PROMPT = `You are an expert at extracting atomic notes in the Zettelkasten method. Given a piece of writing, extract discrete, atomic ideas that stand on their own.

For each atomic note:
1. Give it a clear, descriptive title (max 10 words)
2. Write a concise explanation of the idea (1-3 sentences)
3. Assign relevant tags (2-5 tags)
4. Identify connections to other notes you're extracting

Connection types:
- "related": General topical relationship
- "supports": This note provides evidence for another
- "contradicts": This note challenges another
- "extends": This note builds upon another
- "example_of": This note is a specific instance of a general concept

Respond with valid JSON in this exact format:
{
  "notes": [
    {
      "title": "Note title here",
      "content": "The atomic idea explained clearly.",
      "tags": ["tag1", "tag2"],
      "connections": [
        {
          "targetTitle": "Title of connected note",
          "type": "related",
          "strength": 0.8
        }
      ]
    }
  ]
}

Focus on:
- Extracting truly atomic ideas (one concept per note)
- Making notes that are useful independently
- Identifying meaningful relationships
- Quality over quantity

If the text doesn't contain extractable atomic ideas, return: {"notes": []}`;
```

## AI Provider Configuration

### Environment Variables

```bash
# Primary AI provider (anthropic, openai, or fallback)
AI_PROVIDER=anthropic

# Anthropic API
ANTHROPIC_API_KEY=your_anthropic_key

# OpenAI API
OPENAI_API_KEY=your_openai_key
```

### Provider Selection Logic

```typescript
export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER || "anthropic";

  switch (provider) {
    case "openai":
      return new OpenAIProvider();
    case "anthropic":
      return new AnthropicProvider();
    default:
      // Fallback to mock provider if no API keys configured
      return {
        async generatePrompt(context: string): Promise<string> {
          const prompts = [
            "What happens next?",
            "And then...",
            "But why?",
            "What if everything changed?",
            "Who else was there?",
            "What did they discover?",
            "How did it begin?",
            "What were they afraid of?",
          ];
          return prompts[Math.floor(Math.random() * prompts.length)];
        },
        async extractNotes(): Promise<ExtractedNote[]> {
          return [];
        },
      };
  }
}
```

## API Endpoints

### POST /api/ai/prompt

Generates continuation prompts based on writing context.

**Request Body**:

```json
{
  "context": "Recent writing text to base prompt on",
  "documentId": "optional-document-id-for-logging"
}
```

**Response**:

```json
{
  "prompt": "What happens next?"
}
```

**Features**:

- Authenticates user via Supabase
- Retrieves user's learning goals from profile
- Logs prompt history for analytics
- Handles errors gracefully with fallback prompts

### POST /api/ai/extract

Extracts knowledge notes from writing content.

**Request Body**:

```json
{
  "text": "Writing content to extract notes from"
}
```

**Response**:

```json
{
  "notes": [
    {
      "title": "Atomic note title",
      "content": "Explanation of the idea",
      "tags": ["tag1", "tag2"],
      "connections": [
        {
          "targetTitle": "Related note title",
          "type": "related",
          "strength": 0.8
        }
      ]
    }
  ]
}
```

## Frontend Integration

### Prompt Display Logic

Prompts are displayed in the writing interface when:

1. All existing text has faded (continuation prompts)
2. User starts a new writing session
3. Text becomes hidden due to writing goals (vault mode)

### Editor Components

- **DreamEditor**: Main writing interface with fading text and prompt overlay
- **FadingEditor**: Alternative editor with different fading behavior
- **ForwardOnlyEditor**: Goal-oriented editor with vault functionality

### Prompt UI Components

- **IdlePrompt**: Displays continuation prompts as overlay
- **ContinuationPrompt**: Alternative prompt display component

## Learning Goals Integration

The system considers user-defined learning goals when generating prompts:

1. Goals are stored in user profiles (`profiles.learning_goals`)
2. Retrieved during prompt generation API calls
3. Incorporated into system prompts to guide AI suggestions
4. Help focus prompts toward user's writing development objectives

## Fallback Behavior

When AI providers are unavailable or API keys are not configured:

- Continuation prompts use a curated list of generic prompts
- Extraction returns empty notes array
- System continues to function without AI features

## Performance Considerations

- **Token Limits**: Continuation prompts limited to 100 tokens
- **Context Window**: Recent writing context truncated to 500 characters for logging
- **Caching**: No explicit caching; prompts generated on-demand
- **Rate Limiting**: Handled by AI provider APIs

## Error Handling

- API failures return fallback prompts
- Invalid responses gracefully handled
- User experience uninterrupted during AI outages
- Errors logged for monitoring and debugging

## Future Enhancements

Potential improvements to the prompt generation system:

1. **Personalization**: More sophisticated user preference learning
2. **Context Awareness**: Better understanding of writing style and themes
3. **Multi-language Support**: Prompts in different languages
4. **Prompt Templates**: User-customizable prompt styles
5. **Analytics**: Tracking prompt effectiveness and user engagement
