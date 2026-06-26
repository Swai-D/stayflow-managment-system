import { PrismaClient, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client'
import { ApiError } from '../utils/ApiError'
import { auditService } from './audit.service'

const prisma = new PrismaClient()

export class PaymentsService {
  async recordPayment(data: {
    bookingId: string
    amount: number
    method: PaymentMethod
    receivedById?: string
    notes?: string
    mpesaRef?: string
    bankRef?: string
    status?: PaymentStatus
  }) {
    const { bookingId, amount, method, receivedById, notes, mpesaRef, bankRef, status = 'completed' } = data    

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    })
    if (!booking) throw ApiError.notFound('Booking haikupatikana')

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Create payment record
      const payment = await tx.payment.create({
        data: {
          bookingId,
          amount,
          method,
          receivedById,
          notes,
          mpesaRef,
          bankRef,
          status,
          paidAt: status === 'completed' ? new Date() : null
        }
      })

      // 2. Update booking paid amount and balance
      if (status === 'completed') {
        const updatedPaidAmount = Number(booking.paidAmount) + amount
        const updatedBalanceDue = Number(booking.totalAmount) - updatedPaidAmount

        await tx.booking.update({
          where: { id: bookingId },
          data: {
            paidAmount: updatedPaidAmount,
            balanceDue: updatedBalanceDue,
            status: updatedBalanceDue <= 0 ? 'confirmed' : booking.status
          }
        })
      }

      await auditService.logPaymentRecorded(receivedById || 'system', payment.id, amount)

      return payment
    })
  }

  async getPayments(bookingId: string) {
    return prisma.payment.findMany({
      where: { bookingId },
      include: { receivedBy: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' }
    })
  }

  async getPaymentStats(hotelId: string, dateFrom?: Date, dateTo?: Date) {
    const where: Prisma.PaymentWhereInput = {
      booking: { hotelId },
      ...(dateFrom || dateTo ? {
        createdAt: {
          ...(dateFrom && { gte: dateFrom }),
          ...(dateTo && { lte: dateTo })
        }
      } : {})
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        booking: { select: { hotelId: true } }
      }
    })

    const completed = payments.filter(p => p.status === 'completed')
    const pending = payments.filter(p => p.status === 'pending')
    const failed = payments.filter(p => p.status === 'failed')
    const refunded = payments.filter(p => p.status === 'refunded')
    const partial = payments.filter(p => p.status === 'partial')

    const methodBreakdown: Record<string, number> = {}
    payments.forEach(p => {
      methodBreakdown[p.method] = (methodBreakdown[p.method] || 0) + Number(p.amount)
    })

    // Group by date for trend chart
    const trendMap = new Map<string, number>()
    completed.forEach(p => {
      const date = p.createdAt.toISOString().split('T')[0]
      trendMap.set(date, (trendMap.get(date) || 0) + Number(p.amount))
    })
    const trend = Array.from(trendMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return {
      totalTransactions: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + Number(p.amount), 0),
      completedAmount: completed.reduce((sum, p) => sum + Number(p.amount), 0),
      pendingAmount: pending.reduce((sum, p) => sum + Number(p.amount), 0),
      failedAmount: failed.reduce((sum, p) => sum + Number(p.amount), 0),
      refundedAmount: refunded.reduce((sum, p) => sum + Number(p.amount), 0),
      partialAmount: partial.reduce((sum, p) => sum + Number(p.amount), 0),
      completedCount: completed.length,
      pendingCount: pending.length,
      failedCount: failed.length,
      refundedCount: refunded.length,
      methodBreakdown,
      trend
    }
  }
}

export const paymentsService = new PaymentsService()
