import { v4 as uuid } from 'uuid'
import type { ChatMessage, ChatSession, ChatSummary } from '../types'

export class ChatStore {
  private chats = new Map<string, ChatSession>()

  get(chatId: string): ChatSession | undefined {
    return this.chats.get(chatId)
  }

  list(): ChatSummary[] {
    return Array.from(this.chats.values())
      .map(chat => ({
        id: chat.id,
        title: chat.title,
        updatedAt: chat.updatedAt,
        lastMessagePreview: chat.messages.at(-1)?.content.slice(0, 120)
      }))
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  }

  create(initialTitle: string, initialMessages: ChatMessage[]): ChatSession {
    const chatId = uuid()
    const createdAt = new Date().toISOString()
    const chat: ChatSession = {
      id: chatId,
      title: initialTitle,
      createdAt,
      updatedAt: createdAt,
      messages: [...initialMessages]
    }
    this.chats.set(chatId, chat)
    return chat
  }

  append(chatId: string, messages: ChatMessage[], titleHint?: string): ChatSession {
    const existing = this.chats.get(chatId)
    if (!existing) {
      const title = titleHint && titleHint.length > 0 ? titleHint : 'Conversation'
      const chat: ChatSession = {
        id: chatId,
        title,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [...messages]
      }
      this.chats.set(chatId, chat)
      return chat
    }

    const updated: ChatSession = {
      ...existing,
      title: existing.title || titleHint || 'Conversation',
      updatedAt: messages.at(-1)?.createdAt ?? new Date().toISOString(),
      messages: [...existing.messages, ...messages]
    }

    this.chats.set(chatId, updated)
    return updated
  }
}