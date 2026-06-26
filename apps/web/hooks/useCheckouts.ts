import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export function useTodayCheckouts() {
  return useQuery({
    queryKey: ['today-checkouts'],
    queryFn: async () => {
      const res = await api.get('/bookings/checkouts/today')
      return res.data.data
    },
    staleTime: 30_000,
  })
}

export function useCheckOutBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, sendInvoice = true }: { id: string; sendInvoice?: boolean }) => {
      const res = await api.post(`/bookings/${id}/check-out`, { sendInvoice })
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['today-checkouts'] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    }
  })
}

export function useExtendStay() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, extraNights, reason }: { id: string; extraNights: number; reason?: string }) => {
      const res = await api.post(`/bookings/${id}/extend`, { extraNights, reason })
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['today-checkouts'] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    }
  })
}
