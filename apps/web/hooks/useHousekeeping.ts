import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export function useHousekeepingStatus() {
  return useQuery({
    queryKey: ['housekeeping'],
    queryFn: async () => {
      const res = await api.get('/housekeeping')
      return res.data.data
    },
    refetchInterval: 30_000,
  })
}

export function useUpdateHousekeeping() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ roomId, status, notes }: {
      roomId: string; status: string; notes?: string
    }) => {
      const res = await api.patch(`/housekeeping/${roomId}`, { status, notes })
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['housekeeping'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    }
  })
}
