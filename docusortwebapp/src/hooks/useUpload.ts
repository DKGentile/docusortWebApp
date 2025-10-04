import { useMutation, useQueryClient } from '@tanstack/react-query'
import { uploadDocuments, type UploadPayload } from '../lib/api'
import { documentsKey } from './useDocs'

export function useUpload() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UploadPayload) => uploadDocuments(payload),
    onSuccess: documents => {
      queryClient.setQueryData(documentsKey, previous => {
        const existing = Array.isArray(previous) ? previous : []
        return [...documents, ...existing]
      })
    }
  })
}