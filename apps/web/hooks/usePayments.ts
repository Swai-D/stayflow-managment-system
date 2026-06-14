import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export interface PaymentRequest {
  bookingId: string
  amount: number
  method: string
  notes?: string
}

export function useRecordPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: PaymentRequest) => {
      const res = await api.post('/payments', data)
      return res.data.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['bookings', variables.bookingId] })
      queryClient.invalidateQueries({ queryKey: ['payments', variables.bookingId] })
    }
  })
}

export function useBookingPayments(bookingId: string) {
  return useQuery({
    queryKey: ['payments', bookingId],
    queryFn: async () => {
      const res = await api.get(`/payments/booking/${bookingId}`)
      return res.data.data
    },
    enabled: !!bookingId
  })
}

export function useInitiateSnippe() {
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/payments/snippe/initiate', data)
      return res.data.data
    }
  })
}
