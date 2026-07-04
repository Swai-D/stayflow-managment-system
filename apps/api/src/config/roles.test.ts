import { describe, it, expect } from 'vitest'
import { hasPermission, getRolePermissions, ROLES, AppPermission } from './roles'

describe('roles config', () => {
  it('defines exactly the four production roles', () => {
    expect(Object.keys(ROLES).sort()).toEqual(['admin', 'housekeeping', 'receptionist', 'waiter'])
  })

  it('grants admin every permission', () => {
    const allPerms = getRolePermissions('admin')
    const uniquePerms = [...new Set(allPerms)] as AppPermission[]
    for (const perm of uniquePerms) {
      expect(hasPermission('admin', perm)).toBe(true)
    }
  })

  it('grants receptionist front-desk and reporting permissions', () => {
    expect(hasPermission(getRolePermissions('receptionist'), 'bookings:view')).toBe(true)
    expect(hasPermission(getRolePermissions('receptionist'), 'bookings:manage')).toBe(true)
    expect(hasPermission(getRolePermissions('receptionist'), 'bookings:checkin')).toBe(true)
    expect(hasPermission(getRolePermissions('receptionist'), 'bookings:checkout')).toBe(true)
    expect(hasPermission(getRolePermissions('receptionist'), 'guests:manage')).toBe(true)
    expect(hasPermission(getRolePermissions('receptionist'), 'payments:record')).toBe(true)
    expect(hasPermission(getRolePermissions('receptionist'), 'invoices:manage')).toBe(true)
    expect(hasPermission(getRolePermissions('receptionist'), 'reports:view')).toBe(true)
  })

  it('does not grant receptionist admin-only permissions', () => {
    expect(hasPermission(getRolePermissions('receptionist'), 'staff:manage')).toBe(false)
    expect(hasPermission(getRolePermissions('receptionist'), 'payroll:manage')).toBe(false)
    expect(hasPermission(getRolePermissions('receptionist'), 'settings:manage')).toBe(false)
    expect(hasPermission(getRolePermissions('receptionist'), 'developer:manage')).toBe(false)
    expect(hasPermission(getRolePermissions('receptionist'), 'pos:void')).toBe(false)
  })

  it('grants housekeeping room and housekeeping permissions only', () => {
    expect(hasPermission(getRolePermissions('housekeeping'), 'rooms:view')).toBe(true)
    expect(hasPermission(getRolePermissions('housekeeping'), 'housekeeping:view')).toBe(true)
    expect(hasPermission(getRolePermissions('housekeeping'), 'housekeeping:manage')).toBe(true)
    expect(hasPermission(getRolePermissions('housekeeping'), 'store:view')).toBe(true)
    expect(hasPermission(getRolePermissions('housekeeping'), 'guest_portal:requests')).toBe(true)

    expect(hasPermission(getRolePermissions('housekeeping'), 'bookings:view')).toBe(false)
    expect(hasPermission(getRolePermissions('housekeeping'), 'pos:view')).toBe(false)
    expect(hasPermission(getRolePermissions('housekeeping'), 'reports:view')).toBe(false)
  })

  it('grants waiter pos and guest-portal order permissions only', () => {
    expect(hasPermission(getRolePermissions('waiter'), 'pos:view')).toBe(true)
    expect(hasPermission(getRolePermissions('waiter'), 'pos:charge')).toBe(true)
    expect(hasPermission(getRolePermissions('waiter'), 'guest_portal:orders')).toBe(true)

    expect(hasPermission(getRolePermissions('waiter'), 'bookings:view')).toBe(false)
    expect(hasPermission(getRolePermissions('waiter'), 'rooms:view')).toBe(false)
    expect(hasPermission(getRolePermissions('waiter'), 'store:view')).toBe(false)
    expect(hasPermission(getRolePermissions('waiter'), 'payments:record')).toBe(false)
  })

  it('returns the correct permission list for each role', () => {
    expect(getRolePermissions('admin').length).toBeGreaterThan(0)
    expect(getRolePermissions('receptionist')).toContain('bookings:view')
    expect(getRolePermissions('housekeeping')).toContain('housekeeping:manage')
    expect(getRolePermissions('waiter')).toContain('pos:charge')
  })
})
