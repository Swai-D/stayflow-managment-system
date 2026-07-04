export type InvoiceType = 'individual' | 'company'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'cancelled'

export interface Invoice {
  id: string
  hotelId: string
  invoiceNumber: string
  type: InvoiceType
  status: InvoiceStatus
  companyId?: string
  amount: number
  taxAmount: number
  totalAmount: number
  paidAmount: number
  dueDate?: string
  notes?: string
  pdfUrl?: string
  sentAt?: string
  paidAt?: string
  createdAt: string
  updatedAt: string
  invoiceBookings?: {
    booking?: {
      bookingRef: string
      guest?: { fullName: string }
    }
  }[]
  company?: {
    id: string
    name: string
  }
}

export interface InvoiceWithDetails extends Invoice {
  invoiceBookings?: {
    booking?: {
      id: string
      bookingRef: string
      guest: {
        id: string
        fullName: string
        phone: string
        email?: string
        nationality?: string
        idType?: string
        idNumber?: string
      }
      room: {
        id: string
        roomNumber: string
        type: string
      }
      payments: {
        id: string
        amount: number
        status: string
        method: string
        createdAt: string
      }[]
      roomCharges: {
        id: string
        totalAmount: number
        items: {
          itemName: string
          quantity: number
          unitPrice: number
          totalPrice: number
          createdAt: string
        }[]
      }[]
    }
  }[]
  company?: {
    id: string
    name: string
    email?: string
    phone?: string
    address?: string
    tinNumber?: string
    bookings: {
      id: string
      bookingRef: string
      checkIn: string
      checkOut: string
      totalAmount: number
      guest: { fullName: string }
      room: { roomNumber: string; type: string }
    }[]
  }
}

export interface InvoiceFormData {
  type: InvoiceType
  bookingId?: string
  companyId?: string
  amount: number
  taxAmount?: number
  totalAmount: number
  dueDate?: string
  notes?: string
}
