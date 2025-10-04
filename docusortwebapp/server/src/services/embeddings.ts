import crypto from 'crypto'
import OpenAI from 'openai'
import { EMBEDDING_MODEL, OPENAI_API_KEY } from '../config'

const client = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null
const FALLBACK_DIMENSION = 1536

export async function embedText(inputs: string[]): Promise<number[][]> {
  if (!inputs.length) return []

  if (client) {
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: inputs
    })
    return response.data.map(item => item.embedding)
  }

  return inputs.map(input => fallbackEmbedding(input))
}

export function fallbackEmbedding(text: string): number[] {
  const hash = crypto.createHash('sha256').update(text).digest()
  const vector = new Array<number>(FALLBACK_DIMENSION).fill(0)

  for (let index = 0; index < FALLBACK_DIMENSION; index += 1) {
    const byte = hash[index % hash.length] ?? 0
    const code = text.charCodeAt(index % text.length) || 0
    const value = ((byte / 255) * 2 - 1) + (code % 32) / 16
    vector[index] = value
  }

  return normalize(vector)
}

function normalize(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1
  return vector.map(value => value / norm)
}

export function hasOpenAIClient(): boolean {
  return Boolean(client)
}

export function getOpenAIClient() {
  return client
}