import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'

export interface PublicHotel {
  id: string
  name: string
  address?: string
  phone?: string
  email?: string
  logoUrl?: string
  wifiName?: string
  checkInTime?: string
  checkOutTime?: string
  defaultLanguage?: string
  paymentNumbers?: { name: string; number: string; network: string }[]
}

export function usePublicHotel(slug: string) {
  return useQuery<PublicHotel>({
    queryKey: ['public', 'hotel', slug],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/public/hotels/${slug}`)
      return res.data.data
    },
    enabled: !!slug
  })
}

export function usePublicRooms(slug: string) {
  return useQuery({
    queryKey: ['public', 'rooms', slug],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/public/hotels/${slug}/rooms`)
      return res.data.data
    },
    enabled: !!slug
  })
}

export interface PublicBookingResponse {
  booking: any
  otp: string
  otpExpiresAt: string
  message: string
}

export function useCheckPublicAvailability(slug: string) {
  return useMutation<{ available: boolean }, Error, { roomId: string; checkIn: string; checkOut: string }>({
    mutationFn: async ({ roomId, checkIn, checkOut }) => {
      const res = await axios.get(`${API_URL}/public/hotels/${slug}/availability?roomId=${roomId}&checkIn=${checkIn}&checkOut=${checkOut}`)
      return res.data.data
    }
  })
}

export function useCreatePublicBooking(slug: string) {
  const queryClient = useQueryClient()
  return useMutation<PublicBookingResponse, Error, any>({
    mutationFn: async (data) => {
      const res = await axios.post(`${API_URL}/public/hotels/${slug}/book`, data)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public', 'rooms', slug] })
    }
  })
}
