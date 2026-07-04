import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export type AiProvider = 'openai' | 'deepseek' | 'gemini'

export interface AiSettings {
  hotelId: string
  enabled: boolean
  provider: AiProvider
  openaiKey?: string | null
  openaiModel: string
  deepseekKey?: string | null
  deepseekModel: string
  geminiKey?: string | null
  geminiModel: string
  temperature: number
  maxTokens: number
  systemPrompt: string
  language: string
  responseStyle: string
  includeCharts: boolean
  autoAnalyze: boolean
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export function useAiStatus() {
  return useQuery<{ enabled: boolean; provider: AiProvider }>({
    queryKey: ['ai', 'status'],
    queryFn: async () => {
      const res = await api.get('/ai/status')
      return res.data.data
    },
    staleTime: 60_000
  })
}

export function useAiSettings() {
  return useQuery<AiSettings>({
    queryKey: ['ai', 'settings'],
    queryFn: async () => {
      const res = await api.get('/ai/settings')
      return res.data.data
    },
    staleTime: 60_000
  })
}

export function useUpdateAiSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<AiSettings>) => {
      const res = await api.patch('/ai/settings', data)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'settings'] })
    }
  })
}

export function useAiChat() {
  return useMutation({
    mutationFn: async ({ messages, provider }: { messages: ChatMessage[]; provider?: AiProvider }) => {
      const res = await api.post('/ai/chat', { messages, provider })
      return res.data.data.reply as string
    }
  })
}

export function useValidateAiKey() {
  return useMutation({
    mutationFn: async ({ provider, apiKey }: { provider: AiProvider; apiKey: string }) => {
      const res = await api.post('/ai/validate-key', { provider, apiKey })
      return res.data.data as { valid: boolean; message: string }
    }
  })
}
