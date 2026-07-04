import { PrismaClient } from '@prisma/client'
import { ApiError } from '../utils/ApiError'

const prisma = new PrismaClient()

export class GuestPortalService {
  // ─── List room service orders ──────────────────────────
  async getOrders(hotelId: string, filters?: { status?: string; search?: string }) {
    const where: any = {
      booking: { hotelId },
      ...(filters?.status && { status: filters.status }),
      ...(filters?.search && {
        OR: [
          { orderId: { contains: filters.search, mode: 'insensitive' } },
          { guestAccount: { email: { contains: filters.search, mode: 'insensitive' } } },
          { guestAccount: { firstName: { contains: filters.search, mode: 'insensitive' } } },
          { guestAccount: { lastName: { contains: filters.search, mode: 'insensitive' } } }
        ]
      })
    }

    const [orders, total] = await Promise.all([
      prisma.roomServiceOrder.findMany({
        where,
        include: {
          guestAccount: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          booking: {
            select: {
              id: true,
              bookingRef: true,
              room: { select: { id: true, roomNumber: true, type: true } }
            }
          },
          roomCharge: { select: { id: true, totalAmount: true, status: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.roomServiceOrder.count({ where })
    ])

    return { orders, total }
  }

  // ─── List service requests ─────────────────────────────
  async getRequests(hotelId: string, filters?: { type?: string; status?: string; search?: string }) {
    const where: any = {
      booking: { hotelId },
      ...(filters?.type && { type: filters.type }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.search && {
        OR: [
          { requestId: { contains: filters.search, mode: 'insensitive' } },
          { guestAccount: { email: { contains: filters.search, mode: 'insensitive' } } },
          { guestAccount: { firstName: { contains: filters.search, mode: 'insensitive' } } },
          { guestAccount: { lastName: { contains: filters.search, mode: 'insensitive' } } }
        ]
      })
    }

    const [requests, total] = await Promise.all([
      prisma.serviceRequest.findMany({
        where,
        include: {
          guestAccount: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          booking: {
            select: {
              id: true,
              bookingRef: true,
              room: { select: { id: true, roomNumber: true, type: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.serviceRequest.count({ where })
    ])

    return { requests, total }
  }

  // ─── Update room service order status ──────────────────
  async updateOrderStatus(orderId: string, hotelId: string, status: string) {
    const order = await prisma.roomServiceOrder.findFirst({
      where: { id: orderId, booking: { hotelId } }
    })
    if (!order) throw ApiError.notFound('Order haikupatikana')

    const validStatuses = ['PENDING', 'PREPARING', 'DELIVERED', 'CANCELLED']
    if (!validStatuses.includes(status)) {
      throw ApiError.badRequest('Hali ya order si sahihi')
    }

    return prisma.roomServiceOrder.update({
      where: { id: orderId },
      data: { status: status as any, updatedAt: new Date() }
    })
  }

  // ─── Update service request status ─────────────────────
  async updateRequestStatus(requestId: string, hotelId: string, status: string) {
    const request = await prisma.serviceRequest.findFirst({
      where: { id: requestId, booking: { hotelId } }
    })
    if (!request) throw ApiError.notFound('Request haikupatikana')

    const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
    if (!validStatuses.includes(status)) {
      throw ApiError.badRequest('Hali ya request si sahihi')
    }

    return prisma.serviceRequest.update({
      where: { id: requestId },
      data: { status: status as any, updatedAt: new Date() }
    })
  }

  // ─── Quick stats ───────────────────────────────────────
  async getStats(hotelId: string) {
    const [pendingOrders, pendingRequests, todayOrders, todayRequests] = await Promise.all([
      prisma.roomServiceOrder.count({
        where: { booking: { hotelId }, status: 'PENDING' }
      }),
      prisma.serviceRequest.count({
        where: { booking: { hotelId }, status: 'PENDING' }
      }),
      prisma.roomServiceOrder.count({
        where: {
          booking: { hotelId },
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        }
      }),
      prisma.serviceRequest.count({
        where: {
          booking: { hotelId },
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        }
      })
    ])

    return { pendingOrders, pendingRequests, todayOrders, todayRequests }
  }
}

export const guestPortalService = new GuestPortalService()
