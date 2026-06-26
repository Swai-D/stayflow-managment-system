import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { StoreItem, StoreTransaction, PurchaseOrder, Supplier, StoreDashboardStats } from '@/types/store'

// ─── Items ─────────────────────────────────────────────
export function useStoreItems(filters?: any) {
  const params = new URLSearchParams()
  if (filters?.category) params.append('category', filters.category)
  if (filters?.subCategory) params.append('subCategory', filters.subCategory)
  if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive))

  return useQuery<StoreItem[]>({
    queryKey: ['store', 'items', filters],
    queryFn: async () => {
      const res = await api.get(`/store/items?${params}`)
      return res.data.data
    }
  })
}

export function useStoreItem(id: string) {
  return useQuery<StoreItem>({
    queryKey: ['store', 'items', id],
    queryFn: async () => {
      const res = await api.get(`/store/items/${id}`)
      return res.data.data
    },
    enabled: !!id
  })
}

export function useCreateStoreItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/store/items', data)
      return res.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['store', 'items'] })
  })
}

export function useUpdateStoreItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.patch(`/store/items/${id}`, data)
      return res.data.data
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['store', 'items'] })
      queryClient.invalidateQueries({ queryKey: ['store', 'items', id] })
    }
  })
}

export function useLowStockItems() {
  return useQuery<StoreItem[]>({
    queryKey: ['store', 'items', 'low-stock'],
    queryFn: async () => {
      const res = await api.get('/store/items/low-stock')
      return res.data.data
    }
  })
}

// ─── Transactions ──────────────────────────────────────
export function useStoreTransactions(filters?: any) {
  const params = new URLSearchParams()
  if (filters?.itemId) params.append('itemId', filters.itemId)
  if (filters?.type) params.append('type', filters.type)

  return useQuery<StoreTransaction[]>({
    queryKey: ['store', 'transactions', filters],
    queryFn: async () => {
      const res = await api.get(`/store/transactions?${params}`)
      return res.data.data
    }
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/store/transactions', data)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store', 'items'] })
      queryClient.invalidateQueries({ queryKey: ['store', 'transactions'] })
      queryClient.invalidateQueries({ queryKey: ['store', 'dashboard'] })
    }
  })
}

export function useRecordHousekeepingConsumption() {
  const queryClient = useQueryClient()
  return useMutation<StoreTransaction[], unknown, { roomNumber: string; items: { itemId: string; quantity: number }[] }>({
    mutationFn: async (data) => {
      const res = await api.post('/store/housekeeping-consumption', data)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store', 'items'] })
      queryClient.invalidateQueries({ queryKey: ['store', 'transactions'] })
      queryClient.invalidateQueries({ queryKey: ['store', 'dashboard'] })
    }
  })
}

// ─── Purchase Orders ───────────────────────────────────
export function usePurchaseOrders() {
  return useQuery<PurchaseOrder[]>({
    queryKey: ['store', 'purchase-orders'],
    queryFn: async () => {
      const res = await api.get('/store/purchase-orders')
      return res.data.data
    }
  })
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/store/purchase-orders', data)
      return res.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['store', 'purchase-orders'] })
  })
}

export function useReceivePO() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/store/purchase-orders/${id}/receive`)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store'] })
    }
  })
}

export function useUpdatePOStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: any }) => {
      const res = await api.patch(`/store/purchase-orders/${id}/status`, { status })
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store', 'purchase-orders'] })
    }
  })
}

export function useAutoGeneratePO() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await api.post('/store/purchase-orders/auto-generate')
      return res.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['store', 'purchase-orders'] })
  })
}

// ─── Suppliers ─────────────────────────────────────────
export function useSuppliers() {
  return useQuery<Supplier[]>({
    queryKey: ['store', 'suppliers'],
    queryFn: async () => {
      const res = await api.get('/store/suppliers')
      return res.data.data
    }
  })
}

export function useCreateSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/store/suppliers', data)
      return res.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['store', 'suppliers'] })
  })
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.patch(`/store/suppliers/${id}`, data)
      return res.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['store', 'suppliers'] })
  })
}

// ─── Dashboard ─────────────────────────────────────────
export function useStoreDashboard() {
  return useQuery<StoreDashboardStats>({
    queryKey: ['store', 'dashboard'],
    queryFn: async () => {
      const res = await api.get('/store/dashboard')
      return res.data.data
    }
  })
}