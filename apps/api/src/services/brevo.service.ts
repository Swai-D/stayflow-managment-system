import axios from 'axios'

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'

export interface BrevoAttachment {
  name: string
  content: Buffer
}

export class BrevoService {
  async sendEmail(options: {
    to: string
    toName?: string
    subject: string
    htmlContent: string
    attachments?: BrevoAttachment[]
  }) {
    const apiKey = process.env.BREVO_API_KEY
    if (!apiKey) {
      throw new Error('BREVO_API_KEY is not configured')
    }

    const payload: any = {
      sender: {
        name: process.env.BREVO_FROM_NAME || 'Buffalo Hotel',
        email: process.env.BREVO_FROM_EMAIL || 'noreply@buffalo-hotel.co.tz'
      },
      to: [{ email: options.to, name: options.toName || options.to }],
      subject: options.subject,
      htmlContent: options.htmlContent
    }

    if (options.attachments && options.attachments.length > 0) {
      payload.attachment = options.attachments.map(a => ({
        name: a.name,
        content: a.content.toString('base64')
      }))
    }

    try {
      const response = await axios.post(BREVO_API_URL, payload, {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 20000
      })
      return { success: true, response: response.data }
    } catch (error: any) {
      console.error('[Brevo] Failed to send email:', error.response?.data || error.message)
      return { success: false, error: error.response?.data || error.message }
    }
  }

  async sendInvoiceEmail(to: string, toName: string, bookingRef: string, pdfBuffer: Buffer) {
    const subject = `Invoice - ${bookingRef}`
    const htmlContent = `
      <div style="font-family: Inter, sans-serif; color: #111827; line-height: 1.6;">
        <p>Hello ${toName},</p>
        <p>Thank you for your payment. Please find your invoice attached for booking <strong>${bookingRef}</strong>.</p>
        <p>If you have any questions, please contact us.</p>
        <p>Best regards,<br/><strong>Buffalo Hotel</strong></p>
      </div>
    `
    return this.sendEmail({
      to,
      toName,
      subject,
      htmlContent,
      attachments: [{ name: `Invoice-${bookingRef}.pdf`, content: pdfBuffer }]
    })
  }
}

export const brevoService = new BrevoService()
