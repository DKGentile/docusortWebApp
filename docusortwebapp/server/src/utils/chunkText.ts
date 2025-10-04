export interface TextChunk {
  text: string
  index: number
}

interface ChunkOptions {
  chunkSize?: number
  chunkOverlap?: number
}

export function chunkText(input: string, options: ChunkOptions = {}): TextChunk[] {
  const chunkSize = options.chunkSize ?? 800
  const chunkOverlap = options.chunkOverlap ?? 200
  const normalized = input.replace(/\s+/g, ' ').trim()

  if (!normalized) {
    return []
  }

  const tokens = normalized.split(' ')
  const chunks: TextChunk[] = []
  let index = 0

  for (let start = 0; start < tokens.length; start += chunkSize - chunkOverlap) {
    const end = Math.min(tokens.length, start + chunkSize)
    const slice = tokens.slice(start, end).join(' ').trim()
    if (slice.length === 0) continue
    chunks.push({ text: slice, index })
    index += 1
    if (end === tokens.length) break
  }

  return chunks
}

export function summarize(text: string, maxLength = 220): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) {
    return normalized
  }
  return `${normalized.slice(0, maxLength)}...`
}