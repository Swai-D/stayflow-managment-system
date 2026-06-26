import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Invoice, InvoiceFormData, InvoiceWithDetails, InvoiceType, InvoiceStatus } from '@/types/invoice'

export function useInvoices(filters?: {
  type?: InvoiceType
  status?: InvoiceStatus
  search?: string
  page?: number
  limit?: number
}) {
  const params = new URLSearchParams()
  if (filters?.type) params.append('type', filters.type)
  if (filters?.status) params.append('status', filters.status)
  if (filters?.search) params.append('search', filters.search)
  if (filters?.page) params.append('page', String(filters.page))
  if (filters?.limit) params.append('limit', String(filters.limit))

  return useQuery<{ data: Invoice[]; meta: any }>({
    queryKey: ['invoices', filters],
    queryFn: async () => {
      const res = await api.get(`/invoices?${params}`)
      return res.data
    }
  })
}

export function useInvoice(id: string) {
  return useQuery<InvoiceWithDetails>({
    queryKey: ['invoices', id],
    queryFn: async () => {
      const res = await api.get(`/invoices/${id}`)
      return res.data.data
    },
    enabled: !!id
  })
}

export function useCreateInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: InvoiceFormData) => {
      const res = await api.post('/invoices', data)
      return res.data.data as Invoice
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    }
  })
}

export function useGenerateCompanyInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { companyId: string; bookingIds: string[]; notes?: string }) => {
      const res = await api.post('/invoices/company/generate', data)
      return res.data.data as Invoice
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['companies'] })
    }
  })
}

export function useRecordInvoicePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const res = await api.post(`/invoices/${id}/payment`, { amount })
      return res.data.data as Invoice
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoices', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['companies'] })
    }
  })
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/invoices/${id}`)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    }
  })
}
