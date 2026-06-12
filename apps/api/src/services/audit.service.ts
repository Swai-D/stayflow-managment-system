import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface AuditLogParams {
  userId?: string
  action: string
  entity: string
  entityId?: string
  changes?: any
  ipAddress?: string
  userAgent?: string
}

export class AuditService {
  async log(params: AuditLogParams) {
    try {
      return await prisma.auditLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          changes: params.changes || {},
          ipAddress: params.ipAddress,
          userAgent: params.userAgent
        }
      })
    } catch (err) {
      console.error('Failed to create audit log:', err)
    }
  }

  // Helper for common actions
  async logBookingCreated(userId: string, bookingId: string, ref: string) {
    return this.log({
      userId,
      action: 'booking.created',
      entity: 'booking',
      entityId: bookingId,
      changes: { bookingRef: ref }
    })
  }

  async logPaymentRecorded(userId: string, paymentId: string, amount: number) {
    return this.log({
      userId,
      action: 'payment.recorded',
      entity: 'payment',
      entityId: paymentId,
      changes: { amount }
    })
  }

  async logRoomStatusChanged(userId: string, roomId: string, status: string) {
    return this.log({
      userId,
      action: 'room.status_updated',
      entity: 'room',
      entityId: roomId,
      changes: { status }
    })
  }
}

export const auditService = new AuditService()
