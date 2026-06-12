import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Room, RoomStats, RoomStatus } from '@/types/room'

export function useRooms(filters?: { status?: RoomStatus; floor?: number }) {
  const params = new URLSearchParams()
  if (filters?.status) params.append('status', filters.status)
  if (filters?.floor) params.append('floor', String(filters.floor))

  return useQuery<Room[]>({
    queryKey: ['rooms', filters],
    queryFn: async () => {
      const res = await api.get(`/rooms?${params}`)
      return res.data.data
    },
    staleTime: 30_000, // 30 seconds
  })
}

export function useRoom(id: string) {
  return useQuery<Room>({
    queryKey: ['rooms', id],
    queryFn: async () => {
      const res = await api.get(`/rooms/${id}`)
      return res.data.data
    },
    enabled: !!id
  })
}

export function useRoomStats() {
  return useQuery<RoomStats>({
    queryKey: ['rooms', 'stats'],
    queryFn: async () => {
      const res = await api.get('/rooms/stats')
      return res.data.data
    },
    refetchInterval: 60_000, // Refresh every minute
  })
}

export function useFloors() {
  return useQuery<number[]>({
    queryKey: ['rooms', 'floors'],
    queryFn: async () => {
      const res = await api.get('/rooms/floors')
      return res.data.data
    }
  })
}

export function useUpdateRoomStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status, notes }: {
      id: string; status: RoomStatus; notes?: string
    }) => {
      const res = await api.patch(`/rooms/${id}/status`, { status, notes })
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['rooms', 'stats'] })
    }
  })
}

export function useCreateRoom() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<Room>) => {
      const res = await api.post('/rooms', data)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['rooms', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['rooms', 'floors'] })
    }
  })
}

export function useUpdateRoom() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Room> & { id: string }) => {
      const res = await api.patch(`/rooms/${id}`, data)
      return res.data.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['rooms', data.id] })
    }
  })
}
