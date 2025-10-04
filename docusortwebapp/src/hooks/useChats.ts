import { useQuery } from '@tanstack/react-query'
import { fetchChats } from '../lib/api'

export const chatsKey = ['chats'] as const

export function useChats() {
  return useQuery({
    queryKey: chatsKey,
    queryFn: fetchChats
  })
}