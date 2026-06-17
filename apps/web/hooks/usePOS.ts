import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { StoreItem, RoomCharge, Invoice } from '@/types/store'
import { Booking } from '@/types/booking'

export function usePOSItems() {
  return useQuery<StoreItem[]>({
    queryKey: ['pos', 'items'],
    queryFn: async () => {
      const res = await api.get('/pos/items')
      return res.data.data
    }
  })
}

export function useActiveBookings() {
  return useQuery<Booking[]>({
    queryKey: ['pos', 'active-bookings'],
    queryFn: async () => {
      const res = await api.get('/pos/active-bookings')
      return res.data.data
    }
  })
}

export function usePostCharge() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { bookingId: string; items: any[]; notes?: string }) => {
      const res = await api.post('/pos/charge', data)
      return res.data.data
    },
    onSuccess: (_, { bookingId }) => {
      queryClient.invalidateQueries({ queryKey: ['pos', 'folio', bookingId] })
      queryClient.invalidateQueries({ queryKey: ['bookings', bookingId] })
      queryClient.invalidateQueries({ queryKey: ['store', 'items'] })
    }
  })
}

export function useGuestFolio(bookingId: string) {
  return useQuery<Booking>({
    queryKey: ['pos', 'folio', bookingId],
    queryFn: async () => {
      const res = await api.get(`/pos/folio/${bookingId}`)
      return res.data.data
    },
    enabled: !!bookingId
  })
}

export function useVoidCharge() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ chargeId, bookingId }: { chargeId: string; bookingId: string }) => {
      const res = await api.delete(`/pos/charge/${chargeId}`)
      return res.data.data
    },
    onSuccess: (_, { bookingId }) => {
      queryClient.invalidateQueries({ queryKey: ['pos', 'folio', bookingId] })
      queryClient.invalidateQueries({ queryKey: ['bookings', bookingId] })
      queryClient.invalidateQueries({ queryKey: ['store', 'items'] })
    }
  })
}

export function useInvoice(bookingId: string) {
  return useQuery<Invoice>({
    queryKey: ['pos', 'invoice', bookingId],
    queryFn: async () => {
      const res = await api.get(`/pos/invoice/${bookingId}`)
      return res.data.data
    },
    enabled: !!bookingId
  })
}

export function useCheckout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await api.post(`/pos/checkout/${bookingId}`)
      return res.data.data
    },
    onSuccess: (_, bookingId) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['pos', 'folio', bookingId] })
    }
  })
}