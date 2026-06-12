import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export function useGuests(search?: string) {
  return useQuery({
    queryKey: ['guests', search],
    queryFn: async () => {
      const res = await api.get(`/guests${search ? `?search=${search}` : ''}`)
      return res.data.data
    },
    staleTime: 30_000,
  })
}

export function useGuest(id: string) {
  return useQuery({
    queryKey: ['guests', id],
    queryFn: async () => {
      const res = await api.get(`/guests/${id}`)
      return res.data.data
    },
    enabled: !!id
  })
}

export function useUpdateGuest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await api.patch(`/guests/${id}`, data)
      return res.data.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['guests'] })
      queryClient.invalidateQueries({ queryKey: ['guests', data.id] })
    }
  })
}
