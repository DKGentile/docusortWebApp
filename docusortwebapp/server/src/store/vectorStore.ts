import { v4 as uuid } from 'uuid'

type EmbeddingVector = number[]

export interface DocumentMetadata {
  id: string
  name: string
  mimeType: string
  size: number
  uploadedAt: string
  summary: string
  path: string
  fullText: string
}

export interface ChunkRecord {
  id: string
  docId: string
  text: string
  embedding: EmbeddingVector
  order: number
}

export interface SearchResult {
  chunk: ChunkRecord
  score: number
  document: DocumentMetadata
}

export class InMemoryVectorStore {
  private documents = new Map<string, DocumentMetadata>()
  private chunks: ChunkRecord[] = []

  addDocument(metadata: Omit<DocumentMetadata, 'id'> & { id?: string }, chunks: Omit<ChunkRecord, 'id'>[]): DocumentMetadata {
    const docId = metadata.id ?? uuid()
    const document: DocumentMetadata = {
      ...metadata,
      id: docId
    }
    this.documents.set(docId, document)

    const chunkRecords: ChunkRecord[] = chunks.map((chunk, index) => ({
      id: chunk.id ?? `${docId}-chunk-${index}`,
      docId,
      text: chunk.text,
      embedding: normalizeVector(chunk.embedding),
      order: chunk.order ?? index
    }))

    this.chunks = [...this.chunks, ...chunkRecords]

    return document
  }

  listDocuments(): DocumentMetadata[] {
    return Array.from(this.documents.values()).sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1))
  }

  getDocument(docId: string): DocumentMetadata | undefined {
    return this.documents.get(docId)
  }

  getDocumentText(docId: string): string | null {
    const document = this.documents.get(docId)
    return document?.fullText ?? null
  }

  search(queryEmbedding: EmbeddingVector, options?: { topK?: number; documentId?: string | null }): SearchResult[] {
    const topK = options?.topK ?? 8
    const docFilter = options?.documentId ?? null

    const normalizedQuery = normalizeVector(queryEmbedding)
    const scores: SearchResult[] = []

    for (const chunk of this.chunks) {
      if (docFilter && chunk.docId !== docFilter) continue
      const document = this.documents.get(chunk.docId)
      if (!document) continue

      const score = cosineSimilarity(normalizedQuery, chunk.embedding)
      scores.push({ chunk, score, document })
    }

    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .filter(result => result.score > 0.02)
  }

  clear() {
    this.documents.clear()
    this.chunks = []
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length)
  let sum = 0
  for (let index = 0; index < length; index += 1) {
    sum += a[index]! * b[index]!
  }
  return sum
}

function normalizeVector(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((total, value) => total + value * value, 0)) || 1
  return vector.map(value => value / norm)
}