export interface Company {
  id: string
  hotelId: string
  name: string
  email?: string
  phone?: string
  address?: string
  tinNumber?: string
  contactPerson?: string
  notes?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CompanyWithDetails extends Company {
  bookings: CompanyBooking[]
  invoices: CompanyInvoice[]
  _count?: { bookings: number }
}

export interface CompanyBooking {
  id: string
  bookingRef: string
  status: string
  checkIn: string
  checkOut: string
  totalAmount: number
  paidAmount: number
  balanceDue: number
  guest: {
    id: string
    fullName: string
    phone: string
    email?: string
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
  }[]
}

export interface CompanyInvoice {
  id: string
  invoiceNumber: string
  type: string
  status: string
  amount: number
  totalAmount: number
  paidAmount: number
  createdAt: string
}

export interface CompanyFormData {
  name: string
  email?: string
  phone?: string
  address?: string
  tinNumber?: string
  contactPerson?: string
  notes?: string
}
