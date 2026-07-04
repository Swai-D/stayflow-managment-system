import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export interface GuestPortalOrder {
  id: string
  orderId: string
  items: Array<{ name: string; quantity: number; unitPrice: number }>
  totalAmount: number
  notes?: string
  status: 'PENDING' | 'PREPARING' | 'DELIVERED' | 'CANCELLED'
  postedToRoom: boolean
  createdAt: string
  updatedAt: string
  guestAccount: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone?: string
  }
  booking: {
    id: string
    bookingRef: string
    room: { id: string; roomNumber: string; type: string }
  }
  roomCharge?: { id: string; totalAmount: number; status: string }
}

export interface GuestPortalRequest {
  id: string
  requestId: string
  type: 'laundry' | 'taxi' | 'tour' | 'housekeeping' | 'other'
  payload: Record<string, any>
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  createdAt: string
  updatedAt: string
  guestAccount: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone?: string
  }
  booking: {
    id: string
    bookingRef: string
    room: { id: string; roomNumber: string; type: string }
  }
}

export interface GuestPortalStats {
  pendingOrders: number
  pendingRequests: number
  todayOrders: number
  todayRequests: number
}

export function useGuestPortalOrders(status?: string, search?: string) {
  const params = new URLSearchParams()
  if (status) params.append('status', status)
  if (search) params.append('search', search)

  return useQuery<{ orders: GuestPortalOrder[]; total: number }>({
    queryKey: ['guest-portal', 'orders', status, search],
    queryFn: async () => {
      const res = await api.get(`/guest-portal/orders?${params}`)
      return res.data.data
    }
  })
}

export function useGuestPortalRequests(type?: string, status?: string, search?: string) {
  const params = new URLSearchParams()
  if (type) params.append('type', type)
  if (status) params.append('status', status)
  if (search) params.append('search', search)

  return useQuery<{ requests: GuestPortalRequest[]; total: number }>({
    queryKey: ['guest-portal', 'requests', type, status, search],
    queryFn: async () => {
      const res = await api.get(`/guest-portal/requests?${params}`)
      return res.data.data
    }
  })
}

export function useGuestPortalStats() {
  return useQuery<GuestPortalStats>({
    queryKey: ['guest-portal', 'stats'],
    queryFn: async () => {
      const res = await api.get('/guest-portal/stats')
      return res.data.data
    }
  })
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.patch(`/guest-portal/orders/${id}/status`, { status })
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-portal'] })
    }
  })
}

export function useUpdateRequestStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.patch(`/guest-portal/requests/${id}/status`, { status })
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-portal'] })
    }
  })
}
