import { useQuery } from '@tanstack/react-query'
import { fetchDocuments } from '../lib/api'

export const documentsKey = ['documents'] as const

export function useDocs() {
  return useQuery({
    queryKey: documentsKey,
    queryFn: fetchDocuments
  })
}