import { CHAT_MODEL } from '../config'
import { getOpenAIClient, hasOpenAIClient } from './embeddings'

interface ContextSection {
  header: string
  text: string
}

export async function answerWithContext(prompt: string, sections: ContextSection[]): Promise<string> {
  const contextPrompt = sections
    .map((section, index) => `Source ${index + 1} (${section.header}):\n${section.text}`)
    .join('\n\n')

  if (hasOpenAIClient()) {
    const client = getOpenAIClient()
    const completion = await client.chat.completions.create({
      model: CHAT_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'You are DocuSort AI. Provide grounded answers citing only the supplied excerpts. If the answer is unknown, say so clearly.'
        },
        {
          role: 'user',
          content: `Context:\n${contextPrompt}\n\nQuestion:\n${prompt}`
        }
      ]
    })

    const message = completion.choices[0]?.message?.content
    if (message && message.length > 0) {
      return message.trim()
    }
  }

  const syntheticSummary = sections
    .map(section => `- ${section.header}: ${section.text.slice(0, 220)}${section.text.length > 220 ? '...' : ''}`)
    .join('\n')

  return `*Document-backed response (offline mode)*\n\n${syntheticSummary}\n\nAnswer: ${prompt}`
}

export type { ContextSection }