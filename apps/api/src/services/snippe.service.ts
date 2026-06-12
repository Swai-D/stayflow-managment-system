import { Snippe, verifyWebhook, SnippeWebhookVerificationError } from '@snippe/sdk'

const snippe = new Snippe({ 
  apiKey: process.env.SNIPPE_API_KEY || 'sandbox_key',
  webhookUrl: process.env.SNIPPE_WEBHOOK_URL
})

export class SnippeService {
  /**
   * Initiate mobile money payment (USSD push)
   * API v1.0.0 uses snippe.payments.mobile.create
   */
  async initiateMobileMoney(params: {
    amount: number
    phone: string           // +255XXXXXXXXX format
    customer: {
      firstName: string
      lastName: string
      email: string
    }
    metadata?: Record<string, any>
    idempotencyKey?: string
  }) {
    return await snippe.payments.mobile.create({
      amount: params.amount,
      phoneNumber: params.phone,
      customer: params.customer,
      metadata: params.metadata,
    }, {
      idempotencyKey: params.idempotencyKey
    })
  }

  /**
   * Initiate card payment (redirect to hosted page)
   * API v1.0.0 uses snippe.payments.card.create
   */
  async initiateCard(params: {
    amount: number
    phoneNumber: string
    redirectUrl: string
    cancelUrl: string
    customer: {
      firstName: string
      lastName: string
      email: string
      address: string
      city: string
      state: string
      postcode: string
      country: string
    }
    metadata?: Record<string, any>
    idempotencyKey?: string
  }) {
    return await snippe.payments.card.create({
      amount: params.amount,
      phoneNumber: params.phoneNumber,
      redirectUrl: params.redirectUrl,
      cancelUrl: params.cancelUrl,
      customer: params.customer,
      metadata: params.metadata,
    }, {
      idempotencyKey: params.idempotencyKey
    })
  }

  /**
   * Verify webhook signature using the SDK helper
   */
  verifyWebhook(options: {
    rawBody: Buffer | string
    signature: string
    timestamp: string
  }) {
    const secret = process.env.SNIPPE_WEBHOOK_SECRET
    if (!secret) return null

    try {
      return verifyWebhook({
        rawBody: options.rawBody,
        signature: options.signature,
        timestamp: options.timestamp,
        signingKey: secret,
      })
    } catch (err) {
      if (err instanceof SnippeWebhookVerificationError) {
        return null
      }
      throw err
    }
  }
}

export const snippeService = new SnippeService()
