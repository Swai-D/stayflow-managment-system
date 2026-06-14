import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

export function useRevenueReport(days: number = 30) {
  return useQuery({
    queryKey: ['reports', 'revenue', days],
    queryFn: async () => {
      const res = await api.get(`/reports/revenue?days=${days}`)
      return res.data.data
    }
  })
}

export function useOccupancyReport(days: number = 30) {
  return useQuery({
    queryKey: ['reports', 'occupancy', days],
    queryFn: async () => {
      const res = await api.get(`/reports/occupancy?days=${days}`)
      return res.data.data
    }
  })
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['reports', 'summary'],
    queryFn: async () => {
      const res = await api.get('/reports/summary')
      return res.data.data
    },
    refetchInterval: 60_000,
  })
}

export function useFinancialReport(days: number = 30) {
  return useQuery({
    queryKey: ['reports', 'financial', days],
    queryFn: async () => {
      const res = await api.get(`/reports/financial?days=${days}`)
      return res.data.data
    }
  })
}
