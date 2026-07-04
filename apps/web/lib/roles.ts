export type UserRole = string

export type Role = {
  id: string
  name: string
  description?: string | null
  permissions: string[]
  isSystem?: boolean
}

export type AppPermission =
  | 'bookings:view'
  | 'bookings:manage'
  | 'bookings:checkin'
  | 'bookings:checkout'
  | 'bookings:extend'
  | 'guests:view'
  | 'guests:manage'
  | 'rooms:view'
  | 'rooms:manage'
  | 'housekeeping:view'
  | 'housekeeping:manage'
  | 'pos:view'
  | 'pos:charge'
  | 'pos:checkout'
  | 'pos:void'
  | 'payments:record'
  | 'payments:view'
  | 'invoices:view'
  | 'invoices:manage'
  | 'companies:view'
  | 'companies:manage'
  | 'store:view'
  | 'store:manage'
  | 'staff:view'
  | 'staff:manage'
  | 'payroll:view'
  | 'payroll:manage'
  | 'reports:view'
  | 'settings:view'
  | 'settings:manage'
  | 'guest_portal:orders'
  | 'guest_portal:requests'
  | 'developer:manage'

export const PERMISSION_GROUPS: { label: string; permissions: AppPermission[] }[] = [
  {
    label: 'Bookings & Guests',
    permissions: ['bookings:view', 'bookings:manage', 'bookings:checkin', 'bookings:checkout', 'bookings:extend', 'guests:view', 'guests:manage']
  },
  {
    label: 'Rooms & Housekeeping',
    permissions: ['rooms:view', 'rooms:manage', 'housekeeping:view', 'housekeeping:manage']
  },
  {
    label: 'POS & Billing',
    permissions: ['pos:view', 'pos:charge', 'pos:checkout', 'pos:void', 'payments:record', 'payments:view', 'invoices:view', 'invoices:manage']
  },
  {
    label: 'Store & Inventory',
    permissions: ['store:view', 'store:manage', 'companies:view', 'companies:manage']
  },
  {
    label: 'Staff & Payroll',
    permissions: ['staff:view', 'staff:manage', 'payroll:view', 'payroll:manage']
  },
  {
    label: 'Reports & Settings',
    permissions: ['reports:view', 'settings:view', 'settings:manage', 'developer:manage']
  },
  {
    label: 'Guest Portal',
    permissions: ['guest_portal:orders', 'guest_portal:requests']
  }
]

function getPermissions(role: Role | { name: string; permissions?: string[] } | string[] | undefined): string[] {
  if (!role) return []
  if (Array.isArray(role)) return role
  if (typeof role === 'object' && 'permissions' in role && Array.isArray(role.permissions)) {
    return role.permissions
  }
  return []
}

function isAdmin(role: Role | { name: string; permissions?: string[] } | string[] | undefined): boolean {
  if (!role) return false
  if (Array.isArray(role)) return false
  if (typeof role === 'object' && 'name' in role && role.name?.toLowerCase() === 'admin') return true
  return false
}

export function hasPermission(
  role: Role | { name: string; permissions?: string[] } | string[] | undefined,
  permission: AppPermission | string
): boolean {
  if (isAdmin(role)) return true
  const permissions = getPermissions(role)
  if (permissions.includes('all')) return true
  return permissions.includes(permission)
}

export function hasAnyPermission(
  role: Role | { name: string; permissions?: string[] } | string[] | undefined,
  permissions: (AppPermission | string)[]
): boolean {
  return permissions.some(p => hasPermission(role, p))
}

export function getRolePermissions(role: Role | { name: string; permissions?: string[] } | undefined): string[] {
  if (isAdmin(role)) return PERMISSION_GROUPS.flatMap(g => g.permissions)
  return getPermissions(role)
}
