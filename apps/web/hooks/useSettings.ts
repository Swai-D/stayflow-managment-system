import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export function useHotelSettings() {
  return useQuery({
    queryKey: ['settings', 'hotel'],
    queryFn: async () => {
      const res = await api.get('/settings/hotel')
      return res.data.data
    }
  })
}

export function useUpdateHotelSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.patch('/settings/hotel', data)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'hotel'] })
    }
  })
}

export function useStaff() {
  return useQuery({
    queryKey: ['settings', 'users'],
    queryFn: async () => {
      const res = await api.get('/settings/users')
      return res.data.data
    }
  })
}

export function useCreateStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: any) => {
      const payload = { ...data }
      if (payload.role) {
        payload.roleId = payload.role
        delete payload.role
      }
      const res = await api.post('/settings/users', payload)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'users'] })
    }
  })
}

export function useUpdateStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const payload = { ...data }
      if (payload.role) {
        payload.roleId = payload.role
        delete payload.role
      }
      const res = await api.patch(`/settings/users/${id}`, payload)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'users'] })
    }
  })
}

export function useDeleteStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/settings/users/${id}`)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'users'] })
    }
  })
}

export function useAuditLogs() {
  return useQuery({
    queryKey: ['settings', 'audit-log'],
    queryFn: async () => {
      const res = await api.get('/settings/audit-log')
      return res.data.data
    }
  })
}
