export type StoreCategory = 'FB' | 'HOTEL'
export type StockUnit = 'KG' | 'LTR' | 'PCS' | 'BOX' | 'DOZEN' | 'BOTTLE' | 'PACK' | 'ROLL'
export type TransactionType = 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT' | 'WASTAGE'
export type POStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'SENT_TO_SUPPLIER' | 'RECEIVED' | 'CLOSED'
export type ChargeStatus = 'OPEN' | 'SETTLED'

export interface StoreItem {
  id: string
  name: string
  sku?: string
  category: StoreCategory
  subCategory: string
  unit: StockUnit
  currentStock: number
  minimumStock: number
  maximumStock: number
  unitCost: number
  sellingPrice?: number
  supplierId?: string
  supplier?: Supplier
  location?: string
  isActive: boolean
  isSellable: boolean
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstocked'
  createdAt: string
}

export interface StoreTransaction {
  id: string
  itemId: string
  item: StoreItem
  type: TransactionType
  quantity: number
  unitCost?: number
  balanceBefore: number
  balanceAfter: number
  reference?: string
  notes?: string
  performedBy: { id: string; fullName: string }
  createdAt: string
}

export interface PurchaseOrder {
  id: string
  poNumber: string
  status: POStatus
  supplier: Supplier
  items: PurchaseOrderItem[]
  totalAmount: number
  notes?: string
  expectedDelivery?: string
  receivedAt?: string
  createdBy: { id: string; fullName: string }
  createdAt: string
}

export interface PurchaseOrderItem {
  id: string
  item: StoreItem
  quantityOrdered: number
  quantityReceived: number
  unitCost: number
  totalCost: number
}

export interface Supplier {
  id: string
  name: string
  phone: string
  email?: string
  address?: string
  paymentTerms?: string
  notes?: string
  isActive: boolean
  itemCount?: number
  totalOrders?: number
  totalValue?: number
  lastOrder?: string
}

export interface RoomCharge {
  id: string
  bookingId: string
  booking: { bookingRef: string; room: { roomNumber: string }; guest: { fullName: string } }
  items: RoomChargeItem[]
  totalAmount: number
  status: ChargeStatus
  notes?: string
  postedBy: { fullName: string }
  createdAt: string
}

export interface RoomChargeItem {
  id: string
  itemName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  item: StoreItem
}

export interface StoreDashboardStats {
  totalItems: number
  lowStockCount: number
  outOfStockCount: number
  monthlySpend: number
  monthlySpendTrend: Array<{ month: string; fb: number; hotel: number }>
  topUsedItems: Array<{ item: StoreItem; totalUsed: number }>
  recentTransactions: StoreTransaction[]
  lowStockItems: StoreItem[]
  pendingPOs: number
}

export interface Invoice {
  invoiceNumber: string
  hotel: { name: string; address: string; phone: string; email: string }
  guest: { name: string; phone: string; nationality?: string }
  booking: { ref: string; room: string; roomType: string; checkIn: string; checkOut: string; nights: number }
  charges: {
    accommodation: number
    roomCharges: Array<{ date: string; description: string; quantity: number; unitPrice: number; total: number }>
  }
  summary: { subtotal: number; tax: number; total: number; amountPaid: number; balanceDue: number }
  paymentMethod: string
  issuedAt: string
  issuedBy: string
}

// Stock status helper
export const STOCK_STATUS_CONFIG = {
  in_stock:    { label: 'In Stock',     bg: 'bg-green-50',  text: 'text-green-600',  border: 'border-green-100' },
  low_stock:   { label: 'Low Stock',    bg: 'bg-amber-50',  text: 'text-amber-600',  border: 'border-amber-100' },
  out_of_stock:{ label: 'Out of Stock', bg: 'bg-red-50',    text: 'text-red-500',    border: 'border-red-100' },
  overstocked: { label: 'Overstocked', bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-100' },
}

export const TRANSACTION_TYPE_CONFIG = {
  STOCK_IN:    { label: 'Stock In',    bg: 'bg-green-50',  text: 'text-green-600',  icon: '📦' },
  STOCK_OUT:   { label: 'Stock Out',   bg: 'bg-blue-50',   text: 'text-blue-600',   icon: '📤' },
  ADJUSTMENT:  { label: 'Adjustment',  bg: 'bg-gray-100',  text: 'text-gray-600',   icon: '🔧' },
  WASTAGE:     { label: 'Wastage',     bg: 'bg-red-50',    text: 'text-red-500',    icon: '🗑️' },
}

export const PO_STATUS_CONFIG = {
  DRAFT:            { label: 'Draft',              bg: 'bg-gray-100',   text: 'text-gray-500'  },
  SUBMITTED:        { label: 'Submitted',          bg: 'bg-blue-50',    text: 'text-blue-600'  },
  APPROVED:         { label: 'Approved',           bg: 'bg-indigo-50',  text: 'text-indigo-600'},
  SENT_TO_SUPPLIER: { label: 'Sent to Supplier',   bg: 'bg-amber-50',   text: 'text-amber-600' },
  RECEIVED:         { label: 'Received',           bg: 'bg-green-50',   text: 'text-green-600' },
  CLOSED:           { label: 'Closed',             bg: 'bg-gray-100',   text: 'text-gray-400'  },
}