import axios from 'axios'

/**
 * NextSMS integration for Tanzania.
 * Docs (Reseller / SMS API v1): https://messaging-service.co.tz
 *
 * Auth:
 *   Uses the provided Basic auth header by default.
 *   Override with NEXTSMS_AUTH_HEADER env var if needed.
 *
 * Env vars:
 *   NEXTSMS_SENDER_ID (optional, defaults to hotel name or BUFFALO)
 *   NEXTSMS_TEST_MODE=true (optional, uses test endpoints – no charges)
 */

const NEXTSMS_API_URL = 'https://messaging-service.co.tz'

export class NextSmsService {
  private getAuthHeader(): string {
    // Provided by user; override via env var if credentials change
    return process.env.NEXTSMS_AUTH_HEADER || 'Basic ZGF2eXN3YWk6ZGF2eXN3YWkxOTk1'
  }

  private getHeaders() {
    return {
      'Authorization': this.getAuthHeader(),
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  }

  private getSenderId(senderId?: string): string {
    return senderId || process.env.NEXTSMS_SENDER_ID || 'BUFFALO'
  }

  private isTestMode(): boolean {
    return process.env.NEXTSMS_TEST_MODE === 'true'
  }

  async sendSms(to: string, message: string, senderId?: string) {
    const normalizedTo = this.normalizePhone(to)
    const isTest = this.isTestMode()
    const endpoint = isTest
      ? `${NEXTSMS_API_URL}/api/sms/v1/test/text/single`
      : `${NEXTSMS_API_URL}/api/sms/v1/text/single`

    const payload = {
      from: this.getSenderId(senderId),
      to: normalizedTo,
      content: message
    }

    try {
      const response = await axios.post(endpoint, payload, {
        headers: this.getHeaders(),
        timeout: 15000
      })

      console.log('[NextSMS] SMS sent to', normalizedTo, response.data)
      return { success: true, response: response.data }
    } catch (error: any) {
      console.error('[NextSMS] Failed to send SMS:', error.response?.data || error.message)
      return { success: false, error: error.response?.data || error.message }
    }
  }

  async sendBulkSms(to: string[], message: string, senderId?: string) {
    const normalizedTo = to.map(phone => this.normalizePhone(phone))
    const isTest = this.isTestMode()
    const endpoint = isTest
      ? `${NEXTSMS_API_URL}/api/sms/v1/test/text/multi`
      : `${NEXTSMS_API_URL}/api/sms/v1/text/multi`

    const payload = {
      from: this.getSenderId(senderId),
      to: normalizedTo,
      content: message
    }

    try {
      const response = await axios.post(endpoint, payload, {
        headers: this.getHeaders(),
        timeout: 20000
      })

      console.log('[NextSMS] Bulk SMS sent to', normalizedTo.length, 'recipients', response.data)
      return { success: true, response: response.data }
    } catch (error: any) {
      console.error('[NextSMS] Failed to send bulk SMS:', error.response?.data || error.message)
      return { success: false, error: error.response?.data || error.message }
    }
  }

  async getBalance() {
    try {
      const response = await axios.get(`${NEXTSMS_API_URL}/api/sms/v1/balance`, {
        headers: this.getHeaders(),
        timeout: 10000
      })

      console.log('[NextSMS] Balance fetched:', response.data)
      return { success: true, balance: response.data?.sms_balance, response: response.data }
    } catch (error: any) {
      console.error('[NextSMS] Failed to fetch balance:', error.response?.data || error.message)
      return { success: false, error: error.response?.data || error.message }
    }
  }

  async sendBookingConfirmationWithOtp(
    phone: string,
    guestName: string,
    bookingRef: string,
    otp: string,
    hotelName: string,
    senderId?: string
  ) {
    const message = `Asante ${guestName} kwa kuchagua ${hotelName}. Booking yako ${bookingRef} imethibitishwa. OTP yako ya kuingia kwenye dashboard ni: ${otp}. Usiishare na mtu yeyote.`
    return this.sendSms(phone, message, senderId)
  }

  private normalizePhone(phone: string): string {
    let cleaned = phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '')

    // If starts with 0, replace with 255
    if (cleaned.startsWith('0')) {
      cleaned = '255' + cleaned.slice(1)
    }

    // If no country code and doesn't start with +, assume Tanzania
    if (!cleaned.startsWith('+') && !cleaned.startsWith('255') && cleaned.length === 9) {
      cleaned = '255' + cleaned
    }

    return cleaned.startsWith('+') ? cleaned.slice(1) : cleaned
  }
}

export const nextSmsService = new NextSmsService()
