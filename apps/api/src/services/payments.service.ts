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
}

export const paymentsService = new PaymentsService()
