import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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

export interface CalendarRoom {
  id: string
  roomNumber: string
  name: string
  type: string
  floor: number
  pricePerNight: number
  capacity: number
  beds: number
}

export interface CalendarBooking {
  id: string
  bookingRef: string
  roomId: string
  roomNumber: string
  checkIn: string
  checkOut: string
  status: string
  adults: number
  children: number
  guestName: string
  guestPhone: string
}

export interface CalendarReport {
  year: number
  startDate: string
  endDate: string
  rooms: CalendarRoom[]
  bookings: CalendarBooking[]
}

export function useCalendarReport(year?: number) {
  return useQuery<CalendarReport>({
    queryKey: ['reports', 'calendar', year],
    queryFn: async () => {
      const res = await api.get(`/reports/calendar?year=${year || new Date().getFullYear()}`)
      return res.data.data
    },
    staleTime: 1000 * 60 * 2
  })
}

export interface BusinessAdvice {
  type: 'success' | 'danger' | 'warning' | 'info'
  title: string
  message: string
  priority: 'high' | 'medium' | 'low'
}

export interface BusinessAdviceResponse {
  advice: BusinessAdvice[]
  generatedAt: string
  expiresAt: string
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  remainingRefreshes: number
}

export type AdvicePeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY'

export function useBusinessAdvice(period: AdvicePeriod = 'MONTHLY') {
  return useQuery<BusinessAdviceResponse>({
    queryKey: ['advisor', 'business-advice', period],
    queryFn: async () => {
      const res = await api.get(`/advisor/business-advice?period=${period}`)
      return res.data.data
    },
    staleTime: 1000 * 60 * 5,
    retry: 1
  })
}

export function useRefreshBusinessAdvice() {
  const queryClient = useQueryClient()
  return useMutation<BusinessAdviceResponse, Error, AdvicePeriod>({
    mutationFn: async (period) => {
      const res = await api.post(`/advisor/business-advice/refresh?period=${period}`)
      return res.data.data
    },
    onSuccess: (_, period) => {
      queryClient.invalidateQueries({ queryKey: ['advisor', 'business-advice', period] })
    }
  })
}
