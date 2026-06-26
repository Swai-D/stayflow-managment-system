import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Company, CompanyFormData, CompanyWithDetails } from '@/types/company'

export function useCompanies(search?: string) {
  return useQuery<Company[]>({
    queryKey: ['companies', search],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      const res = await api.get(`/companies?${params}`)
      return res.data.data
    }
  })
}

export function useCompany(id: string) {
  return useQuery<CompanyWithDetails>({
    queryKey: ['companies', id],
    queryFn: async () => {
      const res = await api.get(`/companies/${id}`)
      return res.data.data
    },
    enabled: !!id
  })
}

export function useCreateCompany() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CompanyFormData) => {
      const res = await api.post('/companies', data)
      return res.data.data as Company
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
    }
  })
}

export function useUpdateCompany() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CompanyFormData }) => {
      const res = await api.patch(`/companies/${id}`, data)
      return res.data.data as Company
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      queryClient.invalidateQueries({ queryKey: ['companies', variables.id] })
    }
  })
}

export function useDeleteCompany() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/companies/${id}`)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
    }
  })
}
