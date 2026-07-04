export type RoomStatus = 'available' | 'occupied' | 'dirty' | 'cleaning' | 'maintenance' | 'blocked'
export type RoomType = 'standard' | 'deluxe' | 'family' | 'suite' | 'presidential' | 'superior' | 'conference' | 'twin' | 'triple'

export interface Room {
  id: string
  roomNumber: string
  name: string
  floor: number
  type: RoomType
  status: RoomStatus
  pricePerNight: number
  pricePerHour?: number
  specialRate?: number
  fullBoardRate?: number
  nonResidentRate?: string
  beds: number
  capacity: number
  description?: string
  amenities: string[]
  images: string[]
  qrCodeToken?: string | null
  qrCodeExpiresAt?: string | null
  bookings: RoomBooking[]
  housekeepingLogs: HousekeepingLog[]
}

export interface RoomBooking {
  id: string
  bookingRef: string
  status: string
  checkIn: string
  checkOut: string
  guest: {
    id: string
    fullName: string
    phone: string
    nationality?: string
  }
}

export interface HousekeepingLog {
  id: string
  status: string
  notes?: string
  checklist: { task: string; done: boolean }[]
  updatedAt: string
  updatedBy?: { id: string; fullName: string }
}

export interface RoomStats {
  total: number
  occupied: number
  available: number
  dirty: number
  maintenance: number
  occupancyRate: number
}

// ─── UI Helpers (Matched to stayflow_template.html) ────────────────

export const ROOM_STATUS_CONFIG: Record<RoomStatus, {
  label: string
  labelSw: string
  bgClass: string
  textClass: string
  borderClass: string
}> = {
  available:   { 
    label: 'Available',    
    labelSw: 'Inapatikana',    
    bgClass: 'bg-[#ecfdf5]',       
    textClass: 'text-[#10b981]',   
    borderClass: 'border-[#d1fae5]' 
  },
  occupied:    { 
    label: 'Occupied',     
    labelSw: 'Imejazwa',       
    bgClass: 'bg-[#1a2b4a]',     
    textClass: 'text-white',   
    borderClass: 'border-[#1a2b4a]' 
  },
  dirty:       { 
    label: 'Dirty',        
    labelSw: 'Chafu',          
    bgClass: 'bg-[#fffbeb]',    
    textClass: 'text-[#d97706]',  
    borderClass: 'border-[#fef3c7]' 
  },
  cleaning:    { 
    label: 'Cleaning',     
    labelSw: 'Inasafishwa',    
    bgClass: 'bg-[#e0e7ff]',   
    textClass: 'text-[#3730a3]', 
    borderClass: 'border-indigo-200' 
  },
  maintenance: { 
    label: 'Maintenance',  
    labelSw: 'Matengenezo',    
    bgClass: 'bg-[#fef2f2]',      
    textClass: 'text-[#dc2626]',    
    borderClass: 'border-[#fee2e2]' 
  },
  blocked:     { 
    label: 'Blocked',      
    labelSw: 'Imezuiwa',       
    bgClass: 'bg-gray-100',    
    textClass: 'text-gray-500',   
    borderClass: 'border-gray-300' 
  },
}

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  standard:     'Standard',
  deluxe:       'Deluxe',
  family:       'Family',
  suite:        'Suite',
  presidential: 'Presidential',
  superior:     'Superior',
  conference:   'Conference',
  twin:         'Twin',
  triple:       'Triple',
}
