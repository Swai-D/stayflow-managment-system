import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Booking, BookingStats, BookingStatus } from '@/types/booking'

export function useBookings(filters?: {
  status?: BookingStatus
  source?: string
  search?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}) {
  const params = new URLSearchParams()
  if (filters?.status) params.append('status', filters.status)
  if (filters?.source) params.append('source', filters.source)
  if (filters?.search) params.append('search', filters.search)
  if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom)
  if (filters?.dateTo) params.append('dateTo', filters.dateTo)
  if (filters?.page) params.append('page', String(filters.page))
  if (filters?.limit) params.append('limit', String(filters.limit))

  return useQuery({
    queryKey: ['bookings', filters],
    queryFn: async () => {
      const res = await api.get(`/bookings?${params}`)
      return res.data
    },
    staleTime: 30_000,
  })
}

export function useBooking(id: string) {
  return useQuery<Booking>({
    queryKey: ['bookings', id],
    queryFn: async () => {
      const res = await api.get(`/bookings/${id}`)
      return res.data.data
    },
    enabled: !!id
  })
}

export function useBookingStats() {
  return useQuery<BookingStats>({
    queryKey: ['bookings', 'stats'],
    queryFn: async () => {
      const res = await api.get('/bookings/stats')
      return res.data.data
    },
    refetchInterval: 60_000,
  })
}

export function useCreateBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/bookings', data)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    }
  })
}

export function useCheckIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await api.post(`/bookings/${bookingId}/check-in`)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['rooms', 'stats'] })
    }
  })
}

export function useCheckOut() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await api.post(`/bookings/${bookingId}/check-out`)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['rooms', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['housekeeping'] })
    }
  })
}

export function useCancelBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string, reason: string }) => {
      const res = await api.post(`/bookings/${id}/cancel`, { reason })
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['rooms', 'stats'] })
    }
  })
}
