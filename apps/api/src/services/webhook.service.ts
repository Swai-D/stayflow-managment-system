import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'
import axios from 'axios'

const prisma = new PrismaClient()

export class WebhookService {
  async dispatch(hotelId: string, event: string, payload: any) {
    const webhooks = await prisma.webhook.findMany({
      where: { hotelId, isActive: true }
    })

    const matching = webhooks.filter(w => {
      const events = (w.events as string[]) || []
      return events.includes('*') || events.includes(event)
    })

    for (const webhook of matching) {
      // Fire and forget with retry
      this.sendWebhook(webhook.id, webhook.url, webhook.secret, event, payload).catch((err: any) => {
        console.error(`[Webhook] Failed to dispatch ${event} to ${webhook.url}:`, err.message)
      })
    }
  }

  private async sendWebhook(webhookId: string, url: string, secret: string | null, event: string, payload: any, attempt = 1): Promise<void> {
    const body = {
      event,
      timestamp: new Date().toISOString(),
      data: payload,
    }

    const signature = secret
      ? crypto.createHmac('sha256', secret).update(JSON.stringify(body)).digest('hex')
      : undefined

    try {
      const response = await axios.post(url, body, {
        headers: {
          'Content-Type': 'application/json',
          'X-Buffalo-Hotel-Event': event,
          'X-Buffalo-Hotel-Signature': signature,
          'User-Agent': 'Buffalo-Hotel-Webhook/1.0',
        },
        timeout: 10000,
        validateStatus: () => true,
      })

      await prisma.webhookDelivery.create({
        data: {
          webhookId,
          event,
          payload: body as any,
          responseStatus: response.status,
          responseBody: typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
          attemptCount: attempt,
          deliveredAt: response.status >= 200 && response.status < 300 ? new Date() : null,
        }
      })

      if (response.status < 200 || response.status >= 300) {
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 2000 * attempt))
          return this.sendWebhook(webhookId, url, secret, event, payload, attempt + 1)
        }
      }
    } catch (err: any) {
      await prisma.webhookDelivery.create({
        data: {
          webhookId,
          event,
          payload: body as any,
          errorMessage: err.message,
          attemptCount: attempt,
        }
      })

      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 2000 * attempt))
        return this.sendWebhook(webhookId, url, secret, event, payload, attempt + 1)
      }
    }
  }
}

export const webhookService = new WebhookService()
