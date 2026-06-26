import { PrismaClient } from '@prisma/client'
import { ApiError } from '../utils/ApiError'
import crypto from 'crypto'

const prisma = new PrismaClient()

export const API_SCOPES = [
  'bookings:read',
  'bookings:write',
  'guests:read',
  'guests:write',
  'rooms:read',
  'payments:read',
  'invoices:read',
  'store:read',
  'webhooks:read',
  'webhooks:write',
  'api_keys:read',
  'api_keys:write',
  'admin',
] as const

export type ApiScope = typeof API_SCOPES[number]

export const WEBHOOK_EVENTS = [
  'booking.created',
  'booking.updated',
  'booking.checked_in',
  'booking.checked_out',
  'booking.cancelled',
  'payment.received',
  'invoice.paid',
  'room_charge.created',
  'guest.created',
] as const

export type WebhookEvent = typeof WEBHOOK_EVENTS[number]

export class DeveloperService {
  // ─── API Keys ──────────────────────────────────────────────────────────────
  async listApiKeys(hotelId: string) {
    return prisma.apiKey.findMany({
      where: { hotelId },
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { fullName: true } } }
    })
  }

  async createApiKey(hotelId: string, userId: string, data: { name: string; scopes: ApiScope[]; expiresInDays?: number }) {
    const rawKey = `sf_${crypto.randomBytes(32).toString('hex')}`
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')
    const keyPrefix = rawKey.slice(0, 12)

    const apiKey = await prisma.apiKey.create({
      data: {
        hotelId,
        name: data.name,
        keyPrefix,
        keyHash,
        scopes: data.scopes as any,
        createdById: userId,
        expiresAt: data.expiresInDays ? new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000) : null,
      }
    })

    return { apiKey, rawKey }
  }

  async revokeApiKey(id: string, hotelId: string) {
    const key = await prisma.apiKey.findFirst({ where: { id, hotelId } })
    if (!key) throw ApiError.notFound('API key haikupatikana')
    return prisma.apiKey.update({ where: { id }, data: { isActive: false } })
  }

  async deleteApiKey(id: string, hotelId: string) {
    const key = await prisma.apiKey.findFirst({ where: { id, hotelId } })
    if (!key) throw ApiError.notFound('API key haikupatikana')
    return prisma.apiKey.delete({ where: { id } })
  }

  async validateApiKey(key: string) {
    const keyHash = crypto.createHash('sha256').update(key).digest('hex')
    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: { hotel: true }
    })
    if (!apiKey || !apiKey.isActive) return null
    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) return null
    return apiKey
  }

  async touchApiKey(id: string) {
    return prisma.apiKey.update({ where: { id }, data: { lastUsedAt: new Date() } })
  }

  // ─── Webhooks ──────────────────────────────────────────────────────────────
  async listWebhooks(hotelId: string) {
    return prisma.webhook.findMany({
      where: { hotelId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { fullName: true } },
        _count: { select: { deliveries: true } }
      }
    })
  }

  async createWebhook(hotelId: string, userId: string, data: { name: string; url: string; events: WebhookEvent[]; secret?: string }) {
    return prisma.webhook.create({
      data: {
        hotelId,
        name: data.name,
        url: data.url,
        secret: data.secret || null,
        events: data.events as any,
        createdById: userId,
      }
    })
  }

  async updateWebhook(id: string, hotelId: string, data: Partial<{ name: string; url: string; events: WebhookEvent[]; secret: string; isActive: boolean }>) {
    const webhook = await prisma.webhook.findFirst({ where: { id, hotelId } })
    if (!webhook) throw ApiError.notFound('Webhook haikupatikana')
    return prisma.webhook.update({
      where: { id },
      data: {
        ...data,
        events: data.events as any,
      }
    })
  }

  async deleteWebhook(id: string, hotelId: string) {
    const webhook = await prisma.webhook.findFirst({ where: { id, hotelId } })
    if (!webhook) throw ApiError.notFound('Webhook haikupatikana')
    return prisma.webhook.delete({ where: { id } })
  }

  async listWebhookDeliveries(webhookId: string, hotelId: string, limit = 50) {
    const webhook = await prisma.webhook.findFirst({ where: { id: webhookId, hotelId } })
    if (!webhook) throw ApiError.notFound('Webhook haikupatikana')
    return prisma.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  }

  // ─── API Logs ───────────────────────────────────────────────────────────────
  async listApiLogs(hotelId: string, filters?: { page?: number; limit?: number }) {
    const page = filters?.page || 1
    const limit = filters?.limit || 50
    const skip = (page - 1) * limit

    const [logs, total] = await Promise.all([
      prisma.apiLog.findMany({
        where: { hotelId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { apiKey: { select: { name: true, keyPrefix: true } } }
      }),
      prisma.apiLog.count({ where: { hotelId } })
    ])

    return { logs, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
  }

  async createApiLog(data: {
    hotelId?: string
    apiKeyId?: string
    method: string
    path: string
    statusCode?: number
    ipAddress?: string
    userAgent?: string
    requestBody?: any
    responseBody?: any
    durationMs?: number
  }) {
    return prisma.apiLog.create({
      data: {
        ...data,
        requestBody: data.requestBody ? JSON.stringify(data.requestBody) : undefined,
        responseBody: data.responseBody ? JSON.stringify(data.responseBody) : undefined,
      }
    })
  }
}

export const developerService = new DeveloperService()
