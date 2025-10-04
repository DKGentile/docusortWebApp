import { useMutation } from '@tanstack/react-query'
import { generatePnl, type GeneratePnlPayload } from '../lib/api'

export function useGeneratePnl() {
  return useMutation({
    mutationFn: (payload: GeneratePnlPayload) => generatePnl(payload)
  })
}