import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  keyHash: string
  scopes: string[]
  isActive: boolean
  lastUsedAt?: string
  expiresAt?: string
  createdAt: string
  createdBy?: { fullName: string }
}

export interface Webhook {
  id: string
  name: string
  url: string
  secret?: string
  events: string[]
  isActive: boolean
  createdAt: string
  createdBy?: { fullName: string }
  _count?: { deliveries: number }
}

export interface WebhookDelivery {
  id: string
  event: string
  responseStatus?: number
  errorMessage?: string
  attemptCount: number
  deliveredAt?: string
  createdAt: string
}

export interface ApiLog {
  id: string
  method: string
  path: string
  statusCode?: number
  ipAddress?: string
  userAgent?: string
  durationMs?: number
  createdAt: string
  apiKey?: { name: string; keyPrefix: string }
}

export function useDeveloperMetadata() {
  return useQuery<{ scopes: string[]; events: string[] }>({
    queryKey: ['developer', 'metadata'],
    queryFn: async () => {
      const res = await api.get('/developer/metadata')
      return res.data.data
    }
  })
}

export function useApiKeys() {
  return useQuery<ApiKey[]>({
    queryKey: ['developer', 'api-keys'],
    queryFn: async () => {
      const res = await api.get('/developer/api-keys')
      return res.data.data
    }
  })
}

export function useCreateApiKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string; scopes: string[]; expiresInDays?: number }) => {
      const res = await api.post('/developer/api-keys', data)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developer', 'api-keys'] })
    }
  })
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/developer/api-keys/${id}/revoke`)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developer', 'api-keys'] })
    }
  })
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/developer/api-keys/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developer', 'api-keys'] })
    }
  })
}

export function useWebhooks() {
  return useQuery<Webhook[]>({
    queryKey: ['developer', 'webhooks'],
    queryFn: async () => {
      const res = await api.get('/developer/webhooks')
      return res.data.data
    }
  })
}

export function useCreateWebhook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string; url: string; events: string[]; secret?: string }) => {
      const res = await api.post('/developer/webhooks', data)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developer', 'webhooks'] })
    }
  })
}

export function useUpdateWebhook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<{ name: string; url: string; events: string[]; secret: string; isActive: boolean }> }) => {
      const res = await api.put(`/developer/webhooks/${id}`, data)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developer', 'webhooks'] })
    }
  })
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/developer/webhooks/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developer', 'webhooks'] })
    }
  })
}

export function useWebhookDeliveries(webhookId: string) {
  return useQuery<WebhookDelivery[]>({
    queryKey: ['developer', 'webhooks', webhookId, 'deliveries'],
    queryFn: async () => {
      const res = await api.get(`/developer/webhooks/${webhookId}/deliveries`)
      return res.data.data
    },
    enabled: !!webhookId
  })
}

export function useApiLogs(page = 1, limit = 50) {
  return useQuery<{ logs: ApiLog[]; meta: any }>({
    queryKey: ['developer', 'logs', page, limit],
    queryFn: async () => {
      const res = await api.get('/developer/logs', { params: { page, limit } })
      return { logs: res.data.data, meta: res.data.meta }
    }
  })
}
