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

If the text doesn't contain extractable atomic ideas, return: {"notes": []}`
