import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export function useExpenses(filters?: {
  category?: string
  search?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}) {
  const params = new URLSearchParams()
  if (filters?.category) params.append('category', filters.category)
  if (filters?.search) params.append('search', filters.search)
  if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom)
  if (filters?.dateTo) params.append('dateTo', filters.dateTo)
  if (filters?.page) params.append('page', String(filters.page))
  if (filters?.limit) params.append('limit', String(filters.limit))

  return useQuery({
    queryKey: ['expenses', filters],
    queryFn: async () => {
      const res = await api.get(`/expenses?${params}`)
      return res.data
    },
    staleTime: 30_000,
  })
}

export function useExpenseStats(month?: number, year?: number) {
  return useQuery({
    queryKey: ['expenses', 'stats', month, year],
    queryFn: async () => {
      const res = await api.get(`/expenses/stats?month=${month ?? ''}&year=${year ?? ''}`)
      return res.data.data
    }
  })
}

export function useCreateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/expenses', data)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    }
  })
}
