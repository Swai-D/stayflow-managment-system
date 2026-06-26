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

export function useAllPayments(filters?: {
  status?: string
  search?: string
  page?: number
  limit?: number
  dateFrom?: string
  dateTo?: string
  period?: 'today' | 'week' | 'month' | 'year' | ''
}) {
  const params = new URLSearchParams()
  if (filters?.status) params.append('status', filters.status)
  if (filters?.search) params.append('search', filters.search)
  if (filters?.page) params.append('page', String(filters.page))
  if (filters?.limit) params.append('limit', String(filters.limit))
  if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom)
  if (filters?.dateTo) params.append('dateTo', filters.dateTo)
  if (filters?.period) params.append('period', filters.period)

  return useQuery<{ data: any[]; meta: any }>({
    queryKey: ['payments', 'all', filters],
    queryFn: async () => {
      const res = await api.get(`/payments?${params}`)
      return res.data
    }
  })
}

export function usePaymentStats(filters?: {
  dateFrom?: string
  dateTo?: string
  period?: 'today' | 'week' | 'month' | 'year' | ''
}) {
  const params = new URLSearchParams()
  if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom)
  if (filters?.dateTo) params.append('dateTo', filters.dateTo)
  if (filters?.period) params.append('period', filters.period)

  return useQuery<any>({
    queryKey: ['payments', 'stats', filters],
    queryFn: async () => {
      const res = await api.get(`/payments/stats?${params}`)
      return res.data.data
    }
  })
}

export interface Payment {
  id: string
  bookingId: string
  amount: number
  method: string
  status: string
  paidAt?: string
  createdAt: string
  receivedBy?: { fullName: string }
  booking: {
    bookingRef: string
    bookingType: 'individual' | 'company'
    guest?: { fullName: string }
    company?: { name: string }
  }
}
