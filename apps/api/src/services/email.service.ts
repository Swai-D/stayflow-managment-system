import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY || 'SG.placeholder')

export class EmailService {
  async sendEmail(to: string, subject: string, text: string, html?: string) {
    const msg = {
      to,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@stayflow.app',
      subject,
      text,
      html: html || text,
    }

    try {
      await sgMail.send(msg)
      return { success: true }
    } catch (error) {
      console.error('SendGrid Error:', error)
      return { success: false, error }
    }
  }

  async sendBookingConfirmation(email: string, bookingRef: string, hotelName: string) {
    const subject = `Booking Confirmation - ${bookingRef}`
    const text = `Hi, your booking ${bookingRef} at ${hotelName} has been confirmed.`
    return this.sendEmail(email, subject, text)
  }
}

export const emailService = new EmailService()
