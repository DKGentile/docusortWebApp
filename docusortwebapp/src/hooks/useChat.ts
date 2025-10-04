import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ChatMessage, ChatSession } from '../types'
import { fetchChatById, sendChatPrompt, type SendChatPayload } from '../lib/api'
import { chatsKey } from './useChats'

const chatKey = (chatId: string) => ['chat', chatId] as const

interface MutationContext {
  previous?: ChatSession
  optimisticMessage: ChatMessage
}

export function useChat(chatId: string | null) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: chatId ? chatKey(chatId) : ['chat', 'inactive'],
    queryFn: () => fetchChatById(chatId!),
    enabled: Boolean(chatId)
  })

  const mutation = useMutation({
    mutationFn: (payload: SendChatPayload) => sendChatPrompt(payload),
    onMutate: async (variables: SendChatPayload) => {
      const optimisticMessage: ChatMessage = {
        id: `optimistic-${Date.now()}`,
        role: 'user',
        content: variables.prompt,
        createdAt: new Date().toISOString()
      }

      if (variables.chatId) {
        await queryClient.cancelQueries({ queryKey: chatKey(variables.chatId) })
        const previous = queryClient.getQueryData<ChatSession>(chatKey(variables.chatId))
        if (previous) {
          queryClient.setQueryData(chatKey(variables.chatId), {
            ...previous,
            messages: [...previous.messages, optimisticMessage],
            updatedAt: optimisticMessage.createdAt
          })
        }
        return { previous, optimisticMessage } satisfies MutationContext
      }

      return { optimisticMessage } satisfies MutationContext
    },
    onError: (error, variables, context) => {
      if (variables.chatId && context?.previous) {
        queryClient.setQueryData(chatKey(variables.chatId), context.previous)
      }
    },
    onSuccess: (data, variables, context) => {
      const resolvedChatId = data.chatId
      const assistantMessage = data.message

      queryClient.setQueryData(chatKey(resolvedChatId), current => {
        const base: ChatSession =
          current ?? {
            id: resolvedChatId,
            title:
              current?.title ??
              (variables.prompt.length > 48
                ? `${variables.prompt.slice(0, 48)}...`
                : variables.prompt || 'New Chat'),
            createdAt: current?.createdAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: current?.messages ?? []
          }

        const messages = [...base.messages]

        if (context?.optimisticMessage) {
          const exists = messages.some(item => item.id === context.optimisticMessage.id)
          if (!exists) {
            messages.push(context.optimisticMessage)
          }
        } else {
          messages.push({
            id: `user-${Date.now()}`,
            role: 'user',
            content: variables.prompt,
            createdAt: new Date().toISOString()
          })
        }

        messages.push(assistantMessage)

        return {
          ...base,
          id: resolvedChatId,
          updatedAt: assistantMessage.createdAt,
          messages
        }
      })

      queryClient.invalidateQueries({ queryKey: chatsKey })

      if (variables.chatId && variables.chatId !== resolvedChatId) {
        queryClient.removeQueries({ queryKey: chatKey(variables.chatId) })
      }
    }
  })

  return {
    ...query,
    sendPrompt: mutation.mutateAsync,
    isSending: mutation.isPending
  }
}