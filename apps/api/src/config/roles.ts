/**
 * Permission catalog and role helpers.
 *
 * `AppPermission` is the fixed catalog of permissions that admins can assign
 * to custom roles via checkboxes. `ROLES` keeps metadata (labels/descriptions)
 * for the four built-in system roles.
 */

export const ROLES: Record<string, { label: string; description: string }> = {
  admin: {
    label: 'Administrator',
    description: 'Full system access. Can manage users, settings, payroll and all operations.'
  },
  receptionist: {
    label: 'Receptionist',
    description: 'Front desk operations: bookings, check-in/out, payments, POS, invoices and reports.'
  },
  housekeeping: {
    label: 'Housekeeping',
    description: 'Room status updates, consumption logging and guest service requests.'
  },
  waiter: {
    label: 'Waiter',
    description: 'POS operations and guest portal food orders.'
  }
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

/**
 * Check whether a role or permission list grants a given permission.
 *
 * `roleOrPermissions` can be:
 *   - a role name string (e.g. 'admin', 'receptionist')
 *   - an array of permission strings from the DB role record
 *
 * Admin role names and the special 'all' permission always grant access.
 */
export function hasPermission(
  roleOrPermissions: string | string[],
  permission: string
): boolean {
  if (typeof roleOrPermissions === 'string') {
    if (roleOrPermissions === 'admin') return true
    return false
  }

  const permissions = roleOrPermissions as string[]
  if (permissions.includes('all')) return true
  return permissions.includes(permission)
}

/**
 * Backward-compatible helper. Returns the permission list for a known
 * system role name. For unknown/custom roles, returns an empty array.
 */
export function getRolePermissions(role: string): AppPermission[] {
  if (role === 'admin') {
    return [
      'bookings:view', 'bookings:manage', 'bookings:checkin', 'bookings:checkout', 'bookings:extend',
      'guests:view', 'guests:manage',
      'rooms:view', 'rooms:manage',
      'housekeeping:view', 'housekeeping:manage',
      'pos:view', 'pos:charge', 'pos:checkout', 'pos:void',
      'payments:record', 'payments:view',
      'invoices:view', 'invoices:manage',
      'companies:view', 'companies:manage',
      'store:view', 'store:manage',
      'staff:view', 'staff:manage',
      'payroll:view', 'payroll:manage',
      'reports:view',
      'settings:view', 'settings:manage',
      'guest_portal:orders', 'guest_portal:requests',
      'developer:manage'
    ]
  }

  if (role === 'receptionist') {
    return [
      'bookings:view', 'bookings:manage', 'bookings:checkin', 'bookings:checkout', 'bookings:extend',
      'guests:view', 'guests:manage',
      'rooms:view',
      'housekeeping:view',
      'pos:view', 'pos:charge', 'pos:checkout',
      'payments:record', 'payments:view',
      'invoices:view', 'invoices:manage',
      'companies:view', 'companies:manage',
      'store:view',
      'reports:view',
      'guest_portal:orders', 'guest_portal:requests'
    ]
  }

  if (role === 'housekeeping') {
    return [
      'rooms:view',
      'housekeeping:view', 'housekeeping:manage',
      'store:view',
      'guest_portal:requests'
    ]
  }

  if (role === 'waiter') {
    return [
      'pos:view', 'pos:charge',
      'guest_portal:orders'
    ]
  }

  return []
}
