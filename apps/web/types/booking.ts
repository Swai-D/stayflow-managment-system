export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show' | 'late_checkout'
export type BookingSource = 'online_self' | 'staff_entry' | 'walk_in'
export type BookingType = 'individual' | 'company'
export type GuestAgeCategory = 'adult' | 'child'

import { RoomCharge } from './store'

export interface BookingGuest {
  id: string
  bookingId: string
  fullName: string
  phone?: string
  email?: string
  nationality?: string
  idType?: string
  idNumber?: string
  ageCategory: GuestAgeCategory
  isPrimary: boolean
  createdAt: string
  updatedAt: string
}

export interface Booking {
  id: string
  bookingRef: string
  hotelId: string
  guestId: string
  roomId: string
  createdById: string
  source: BookingSource
  status: BookingStatus
  bookingType: BookingType
  checkIn: string
  checkOut: string
  startTime?: string
  endTime?: string
  actualCheckIn?: string
  actualCheckOut?: string
  adults: number
  children: number
  roomTotal: number
  addonsTotal: number
  discountAmount: number
  totalAmount: number
  paidAmount: number
  balanceDue: number
  specialRequests?: string
  createdAt: string
  updatedAt: string
  guest: {
    id: string
    fullName: string
    phone: string
    email?: string
    nationality?: string
    idType?: string
    idNumber?: string
  }
  company?: {
    id: string
    name: string
    phone?: string
    email?: string
  }
  room: {
    id: string
    roomNumber: string
    name: string
    type: string
  }
  createdBy?: {
    id: string
    fullName: string
  }
  payments?: any[]
  receipts?: any[]
  roomCharges?: RoomCharge[]
  guests?: BookingGuest[]
}

export interface BookingStats {
  checkInsToday: number
  checkOutsToday: number
  totalActive: number
  pendingCount: number
  allCount: number
  onlineCount: number
  directCount: number
}

export const BOOKING_STATUS_CONFIG: Record<BookingStatus, {
  label: string
  labelSw: string
  bgClass: string
  textClass: string
}> = {
  pending:        { label: 'Pending',       labelSw: 'Inasubiri',       bgClass: 'bg-amber-50',   textClass: 'text-amber-700' },
  confirmed:      { label: 'Confirmed',     labelSw: 'Imethibitishwa',  bgClass: 'bg-blue-50',    textClass: 'text-blue-700' },
  checked_in:     { label: 'Checked In',    labelSw: 'Amewasili',       bgClass: 'bg-green-50',   textClass: 'text-green-700' },
  checked_out:    { label: 'Checked Out',   labelSw: 'Ameondoka',       bgClass: 'bg-gray-100',   textClass: 'text-gray-600' },
  cancelled:      { label: 'Cancelled',     labelSw: 'Imefutwa',        bgClass: 'bg-red-50',     textClass: 'text-red-700' },
  no_show:        { label: 'No Show',       labelSw: 'Hakuja',          bgClass: 'bg-red-50',     textClass: 'text-red-700' },
  late_checkout:  { label: 'Late Checkout', labelSw: 'CO Marehemu',     bgClass: 'bg-red-50',     textClass: 'text-red-700' },
}
