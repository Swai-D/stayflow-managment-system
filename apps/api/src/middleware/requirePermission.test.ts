import { describe, it, expect, vi } from 'vitest'
import { Response } from 'express'
import { requirePermission } from './requirePermission'
import { AuthRequest } from './authenticate'
import { ApiError } from '../utils/ApiError'

function createReq(roleName: string, permissions: string[]): AuthRequest {
  return {
    user: {
      id: 'user-1',
      roleId: 'role-1',
      role: {
        id: 'role-1',
        name: roleName,
        permissions
      },
      hotelId: 'hotel-1',
      email: 'user@example.com'
    }
  } as AuthRequest
}

describe('requirePermission middleware', () => {
  it('calls next when user has the required permission', () => {
    const req = createReq('receptionist', ['bookings:view'])
    const res = {} as Response
    const next = vi.fn()

    requirePermission('bookings:view')(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledWith()
  })

  it('calls next when user has one of several required permissions', () => {
    const req = createReq('receptionist', ['bookings:view'])
    const res = {} as Response
    const next = vi.fn()

    requirePermission('bookings:manage', 'bookings:view')(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
  })

  it('calls next for admin role even without explicit permission', () => {
    const req = createReq('admin', [])
    const res = {} as Response
    const next = vi.fn()

    requirePermission('settings:manage')(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
  })

  it('calls next when user has the special "all" permission', () => {
    const req = createReq('custom-manager', ['all'])
    const res = {} as Response
    const next = vi.fn()

    requirePermission('staff:manage')(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
  })

  it('throws unauthorized when req.user is missing', () => {
    const req = {} as AuthRequest
    const res = {} as Response
    const next = vi.fn()

    expect(() => requirePermission('bookings:view')(req, res, next)).toThrow(ApiError)
    expect(next).not.toHaveBeenCalled()
  })

  it('throws forbidden when user lacks the required permission', () => {
    const req = createReq('housekeeping', ['rooms:view'])
    const res = {} as Response
    const next = vi.fn()

    expect(() => requirePermission('bookings:view')(req, res, next)).toThrow('Huna ruhusa kwa kitendo hiki')
    expect(next).not.toHaveBeenCalled()
  })

  it('throws forbidden for non-admin role without matching permissions', () => {
    const req = createReq('receptionist', ['bookings:view'])
    const res = {} as Response
    const next = vi.fn()

    expect(() => requirePermission('settings:manage')(req, res, next)).toThrow('Huna ruhusa kwa kitendo hiki')
    expect(next).not.toHaveBeenCalled()
  })
})
