import { PrismaClient, NotificationType, NotificationChannel } from '@prisma/client'
import { emailService } from './email.service'
import { smsService } from './sms.service'

const prisma = new PrismaClient()

export class NotificationService {
  async notify(params: {
    bookingId?: string
    type: NotificationType
    channel: NotificationChannel
    recipientEmail?: string
    recipientPhone?: string
    data: any
  }) {
    const { bookingId, type, channel, recipientEmail, recipientPhone, data } = params

    // 1. Send via Email if applicable
    if ((channel === 'email' || channel === 'both') && recipientEmail) {
      const { subject, body } = this.getEmailTemplate(type, data)
      
      const res = await emailService.sendEmail(recipientEmail, subject, body)
      
      await this.logNotification({
        bookingId, type, channel: 'email',
        recipient: recipientEmail, subject, body,
        status: res.success ? 'sent' : 'failed',
        error: res.error ? String(res.error) : undefined
      })
    }

    // 2. Send via SMS if applicable
    if ((channel === 'sms' || channel === 'both') && recipientPhone) {
      const body = this.getSmsTemplate(type, data)
      
      const res = await smsService.sendSms(recipientPhone, body)
      
      await this.logNotification({
        bookingId, type, channel: 'sms',
        recipient: recipientPhone, body,
        status: res.success ? 'sent' : 'failed',
        error: res.error ? String(res.error) : undefined
      })
    }
  }

  private getEmailTemplate(type: NotificationType, data: any): { subject: string; body: string } {
    switch (type) {
      case 'booking_confirmation':
        return {
          subject: `Booking Confirmed — ${data.bookingRef}`,
          body: `Hi ${data.guestName}, your booking ${data.bookingRef} at ${data.hotelName} is confirmed for ${data.checkIn}.`
        }
      case 'payment_receipt':
        return {
          subject: `Receipt ${data.receiptNumber} — StayFlow`,
          body: `Hi, thank you for your payment. Your receipt ${data.receiptNumber} is ready: ${data.receiptUrl}`
        }
      case 'check_in_reminder':
        return {
          subject: `Reminder: Your arrival tomorrow — ${data.hotelName}`,
          body: `Hi ${data.guestName}, we look forward to seeing you tomorrow at ${data.hotelName}.`
        }
      case 'review_request':
        return {
          subject: "How was your stay? Share your experience",
          body: `Hi ${data.guestName}, please share your experience at ${data.hotelName}: ${data.reviewUrl}`
        }
      default:
        return { subject: 'StayFlow Notification', body: JSON.stringify(data) }
    }
  }

  private getSmsTemplate(type: NotificationType, data: any): string {
    switch (type) {
      case 'booking_confirmation':
        return `StayFlow: Booking ${data.bookingRef} confirmed. Room ${data.roomNumber}, ${data.checkIn}. Total: TZS ${data.totalAmount}.`
      case 'payment_receipt':
        return `StayFlow: Receipt ${data.receiptNumber}. Paid: TZS ${data.amount}. Ref: ${data.bookingRef}. Download: ${data.receiptUrl}`
      case 'check_in_reminder':
        return `StayFlow: Reminder! Check-in tomorrow ${data.checkIn}. ${data.hotelName}. Questions? ${data.hotelPhone}`
      case 'review_request':
        return `StayFlow: Hi ${data.guestName}, rate your stay at ${data.hotelName}: ${data.reviewUrl}`
      default:
        return `StayFlow: ${type} - ${data.bookingRef || ''}`
    }
  }

  private async logNotification(data: any) {
    return prisma.notification.create({
      data: {
        ...data,
        sentAt: data.status === 'sent' ? new Date() : null
      }
    })
  }
}

export const notificationService = new NotificationService()
