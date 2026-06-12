import { useQuery, useMutation } from '@tanstack/react-query'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'

export function usePublicHotel(slug: string) {
  return useQuery({
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

export function useCreatePublicBooking(slug: string) {
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await axios.post(`${API_URL}/public/hotels/${slug}/book`, data)
      return res.data.data
    }
  })
}
