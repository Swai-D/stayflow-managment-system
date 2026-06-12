import AfricasTalking from 'africastalking'

const at = AfricasTalking({
  apiKey: process.env.AT_API_KEY || 'placeholder_key',
  username: process.env.AT_USERNAME || 'sandbox'
})

const sms = at.SMS

export class SmsService {
  async sendSms(to: string, message: string) {
    const options = {
      to: [to],
      message,
      from: process.env.AT_SENDER_ID || 'STAYFLOW'
    }

    try {
      const response = await sms.send(options)
      return { success: true, response }
    } catch (error) {
      console.error('AfricasTalking Error:', error)
      return { success: false, error }
    }
  }

  async sendBookingConfirmation(phone: string, bookingRef: string) {
    const message = `StayFlow: Booking ${bookingRef} confirmed. Karibu!`
    return this.sendSms(phone, message)
  }
}

export const smsService = new SmsService()
