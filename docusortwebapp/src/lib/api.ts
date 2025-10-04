import axios from 'axios'
import type {
  ChatResponse,
  ChatSession,
  ChatSummary,
  DocumentRecord,
  GeneratePnlResponse,
  UploadResponse
} from '../types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
  withCredentials: false
})

export const fetchDocuments = async (): Promise<DocumentRecord[]> => {
  const { data } = await api.get<UploadResponse>('/api/docs')
  return data.documents
}

export const fetchChats = async (): Promise<ChatSummary[]> => {
  const { data } = await api.get<{ chats: ChatSummary[] }>('/api/chats')
  return data.chats
}

export const fetchChatById = async (chatId: string): Promise<ChatSession> => {
  const { data } = await api.get<{ chat: ChatSession }>(`/api/chats/${chatId}`)
  return data.chat
}

export interface UploadPayload {
  files: File[]
}

export const uploadDocuments = async ({ files }: UploadPayload): Promise<DocumentRecord[]> => {
  const formData = new FormData()
  files.forEach(file => formData.append('files', file))
  const { data } = await api.post<UploadResponse>('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return data.documents
}

export interface SendChatPayload {
  chatId?: string | null
  prompt: string
  documentId?: string | null
}

export const sendChatPrompt = async (payload: SendChatPayload): Promise<ChatResponse> => {
  const { data } = await api.post<ChatResponse>('/api/chat', payload)
  return data
}

export interface GeneratePnlPayload {
  property: string
  documentId?: string | null
}

export const generatePnl = async (payload: GeneratePnlPayload): Promise<GeneratePnlResponse> => {
  const { data } = await api.post<GeneratePnlResponse>('/api/generate/pnl', payload)
  return data
}

export default api