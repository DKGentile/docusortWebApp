export type Role = 'user' | 'assistant'

export interface GeneratedPnlMetadata {
  property: string
  summary: string
  csvUrl: string
  xlsxUrl: string
  totals: {
    revenue: number
    expenses: number
    noi: number
  }
  retrievedChunks: number
  sources: string[]
}

export interface RetrievedChunk {
  docId: string
  chunkId: string
  score: number
  snippet: string
  documentName: string
}

export interface ChatMessageMetadata {
  retrievedChunks?: number
  relatedDocuments?: RetrievedChunk[]
  documentName?: string | null
  generatedPnl?: GeneratedPnlMetadata[]
}

export interface ChatMessage {
  id: string
  role: Role
  content: string
  createdAt: string
  metadata?: ChatMessageMetadata
}

export interface ChatSession {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messages: ChatMessage[]
}

export interface ChatSummary {
  id: string
  title: string
  updatedAt: string
  lastMessagePreview?: string
}