import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

export interface SearchResult {
  id: string
  title: string
  subtitle?: string
  type: 'booking' | 'guest' | 'room' | 'store_item' | 'supplier'
  href: string
  status?: string
  meta?: string
}

export function useSearch(query: string, enabled: boolean = true) {
  return useQuery<SearchResult[]>({
    queryKey: ['search', query],
    queryFn: async () => {
      if (!query.trim() || query.trim().length < 2) return []
      const res = await api.get(`/search?q=${encodeURIComponent(query.trim())}`)
      return res.data.data
    },
    enabled: enabled && query.trim().length >= 2,
    staleTime: 1000 * 60 * 2
  })
}
