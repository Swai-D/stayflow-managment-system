import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export interface StaffFormData {
  fullName: string
  email: string
  password?: string
  roleId: string
  phone?: string
  position: string
  department: string
  employmentType?: string
  startDate: string
  basicSalary: number
  allowances?: { name: string; amount: number; taxable: boolean }[]
  deductNssf?: boolean
  deductWcf?: boolean
  bankName?: string
  bankAccount?: string
}

export interface StaffUpdateData {
  fullName?: string
  phone?: string
  roleId?: string
  position?: string
  department?: string
  basicSalary?: number
  allowances?: { name: string; amount: number; taxable: boolean }[]
  bankName?: string
  bankAccount?: string
  isActive?: boolean
}

export interface LeaveFormData {
  type: string
  startDate: string
  endDate: string
  reason: string
}

export interface ReviewLeaveData {
  action: 'approved' | 'rejected'
  note?: string
}

export interface GeneratePayrollData {
  staffId: string
  month: number
  year: number
}

export function useStaff() {
  return useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const res = await api.get('/staff')
      return res.data.data
    },
    staleTime: 30_000,
  })
}

export function useCreateStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: StaffFormData) => {
      const res = await api.post('/staff', data)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
    }
  })
}

export function useUpdateStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: StaffUpdateData }) => {
      const res = await api.patch(`/staff/${id}`, data)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
    }
  })
}

export function useDeactivateStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/staff/${id}`)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
    }
  })
}

export function useClockIn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await api.post('/staff/shifts/clock-in')
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
    }
  })
}

export function useClockOut() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await api.post('/staff/shifts/clock-out')
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
    }
  })
}

export function useShifts(staffId?: string, month?: number, year?: number) {
  const params = new URLSearchParams()
  if (staffId) params.append('staffId', staffId)
  if (month) params.append('month', String(month))
  if (year) params.append('year', String(year))

  return useQuery({
    queryKey: ['shifts', staffId, month, year],
    queryFn: async () => {
      const res = await api.get(`/staff/shifts?${params}`)
      return res.data.data
    },
    staleTime: 30_000,
  })
}

export function useLeaves(status?: string, staffId?: string) {
  const params = new URLSearchParams()
  if (status) params.append('status', status)
  if (staffId) params.append('staffId', staffId)

  return useQuery({
    queryKey: ['leaves', status, staffId],
    queryFn: async () => {
      const res = await api.get(`/staff/leave?${params}`)
      return res.data.data
    },
    staleTime: 30_000,
  })
}

export function useRequestLeave() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: LeaveFormData) => {
      const res = await api.post('/staff/leave', data)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] })
    }
  })
}

export function useReviewLeave() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ReviewLeaveData }) => {
      const res = await api.patch(`/staff/leave/${id}`, data)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] })
    }
  })
}

export function usePayroll(month?: number, year?: number) {
  const params = new URLSearchParams()
  if (month) params.append('month', String(month))
  if (year) params.append('year', String(year))

  return useQuery({
    queryKey: ['payroll', month, year],
    queryFn: async () => {
      const res = await api.get(`/staff/payroll?${params}`)
      return res.data.data
    },
    staleTime: 30_000,
  })
}

export function usePayrollSummary(month?: number, year?: number) {
  const params = new URLSearchParams()
  if (month) params.append('month', String(month))
  if (year) params.append('year', String(year))

  return useQuery({
    queryKey: ['payroll', 'summary', month, year],
    queryFn: async () => {
      const res = await api.get(`/staff/payroll/summary?${params}`)
      return res.data.data
    },
    staleTime: 30_000,
  })
}

export function useGeneratePayroll() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: GeneratePayrollData) => {
      const res = await api.post('/staff/payroll/generate', data)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll'] })
    }
  })
}

export function useApprovePayroll() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/staff/payroll/${id}/approve`)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll'] })
    }
  })
}

export function useMarkPayrollPaid() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/staff/payroll/${id}/mark-paid`)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll'] })
    }
  })
}
