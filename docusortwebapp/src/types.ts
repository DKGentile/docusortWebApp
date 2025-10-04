export type Role = 'user' | 'assistant'

export interface DocumentRecord {
  id: string
  name: string
  mimeType: string
  size: number
  uploadedAt: string
  summary: string
}

export interface ChatSummary {
  id: string
  title: string
  updatedAt: string
  lastMessagePreview?: string
}

export interface RetrievedChunk {
  docId: string
  chunkId: string
  score: number
  snippet: string
  documentName?: string
}

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

export interface UploadResponse {
  documents: DocumentRecord[]
}

export interface ChatResponse {
  chatId: string
  message: ChatMessage
  retrievedChunks: number
  relatedDocuments: RetrievedChunk[]
  generatedPnl?: GeneratedPnlMetadata[]
}

export interface GeneratePnlResponse {
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