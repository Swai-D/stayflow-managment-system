import axios from 'axios'
import { PrismaClient } from '@prisma/client'
import { startOfDay, endOfDay, subDays } from 'date-fns'
import { ApiError } from '../utils/ApiError'

const prisma = new PrismaClient()

export type AdvicePeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY'

export interface BusinessAdvice {
  type: 'success' | 'danger' | 'warning' | 'info'
  title: string
  message: string
  priority: 'high' | 'medium' | 'low'
}

export interface AdviceResponse {
  advice: BusinessAdvice[]
  generatedAt: Date
  expiresAt: Date
  period: AdvicePeriod
  refreshedAt?: Date
  remainingRefreshes: number
  isFallback?: boolean
}

const MAX_DAILY_REFRESHES = 3

export class AdvisorService {
  private dayKey(date = new Date()) {
    return startOfDay(date).toISOString()
  }

  private periodToDays(period: AdvicePeriod): number {
    switch (period) {
      case 'DAILY': return 1
      case 'WEEKLY': return 7
      case 'MONTHLY': return 30
      default: return 30
    }
  }

  private expiryForPeriod(period: AdvicePeriod, generatedAt: Date): Date {
    switch (period) {
      case 'DAILY':
        return endOfDay(generatedAt)
      case 'WEEKLY': {
        const d = new Date(generatedAt)
        d.setDate(d.getDate() + 7 - d.getDay())
        return endOfDay(d)
      }
      case 'MONTHLY': {
        const d = new Date(generatedAt)
        d.setMonth(d.getMonth() + 1, 0)
        return endOfDay(d)
      }
    }
  }

  /**
   * Public endpoint: always returns the latest stored advice for the period.
   * If none exists or it's stale, generates new advice automatically in the background.
   * If LLM fails, returns the most recent stored advice as a fallback so the UI never breaks.
   */
  async getBusinessAdvice(hotelId: string, period: AdvicePeriod = 'MONTHLY'): Promise<AdviceResponse> {
    const stored = await prisma.businessAdvice.findFirst({
      where: { hotelId, period },
      orderBy: { generatedAt: 'desc' }
    })

    const now = new Date()

    if (stored && stored.expiresAt > now) {
      return {
        advice: stored.advice as unknown as BusinessAdvice[],
        generatedAt: stored.generatedAt,
        expiresAt: stored.expiresAt,
        period,
        remainingRefreshes: await this.remainingRefreshes(hotelId, period)
      }
    }

    // Auto-generate if missing or expired (cron should normally handle this)
    try {
      return await this.generateAndSave(hotelId, period)
    } catch (err: any) {
      console.error('[Advisor] Auto-generation failed, returning fallback:', err.message)

      if (stored) {
        return {
          advice: stored.advice as unknown as BusinessAdvice[],
          generatedAt: stored.generatedAt,
          expiresAt: stored.expiresAt,
          period,
          remainingRefreshes: await this.remainingRefreshes(hotelId, period),
          isFallback: true
        }
      }

      return {
        advice: [{
          type: 'info',
          title: 'Buffalo Business Advisor inasonga',
          message: 'Ushauri wa kibiashara bado unatayarishwa na mfumo wetu. Tafadhali rudi baada ya dakika chache.',
          priority: 'medium'
        }],
        generatedAt: now,
        expiresAt: new Date(now.getTime() + 1000 * 60 * 15),
        period,
        remainingRefreshes: MAX_DAILY_REFRESHES,
        isFallback: true
      }
    }
  }

  /**
   * Manual refresh with rate limiting.
   * Returns new advice if within daily refresh budget, otherwise throws.
   */
  async refreshBusinessAdvice(hotelId: string, period: AdvicePeriod = 'MONTHLY'): Promise<AdviceResponse> {
    const remaining = await this.remainingRefreshes(hotelId, period)
    if (remaining <= 0) {
      throw new ApiError(429, 'RATE_LIMIT_EXCEEDED', `Umeshafikia kikomo cha kurefresh ushauri wa ${this.periodLabel(period)} leo. Jaribu kesho.`, { remaining: 0 })
    }

    await this.recordRefresh(hotelId, period)
    return this.generateAndSave(hotelId, period)
  }

  /**
   * Cron-friendly: generate advice for every active hotel for the given period.
   */
  async generateAdviceForAllHotels(period: AdvicePeriod = 'DAILY'): Promise<void> {
    const hotels = await prisma.hotel.findMany({ where: { isActive: true }, select: { id: true } })
    console.log(`[Advisor Cron] Generating ${period} advice for ${hotels.length} hotels...`)

    for (const hotel of hotels) {
      try {
        await this.generateAndSave(hotel.id, period)
        console.log(`[Advisor Cron] ${period} advice generated for hotel ${hotel.id}`)
      } catch (err: any) {
        console.error(`[Advisor Cron] Failed to generate ${period} advice for hotel ${hotel.id}:`, err.message)
      }
    }
  }

  private async generateAndSave(hotelId: string, period: AdvicePeriod): Promise<AdviceResponse> {
    const days = this.periodToDays(period)
    const advice = await this.callLLMAdvice(hotelId, days, period)
    const generatedAt = new Date()
    const expiresAt = this.expiryForPeriod(period, generatedAt)

    await prisma.businessAdvice.create({
      data: {
        hotelId,
        period,
        advice: advice as any,
        generatedAt,
        expiresAt
      }
    })

    return {
      advice,
      generatedAt,
      expiresAt,
      period,
      remainingRefreshes: await this.remainingRefreshes(hotelId, period)
    }
  }

  private async remainingRefreshes(hotelId: string, period: AdvicePeriod): Promise<number> {
    const today = this.dayKey()
    const usage = await prisma.advisorRefreshLog.aggregate({
      where: { hotelId, period, createdAt: { gte: new Date(today) } },
      _count: { id: true }
    })
    return Math.max(0, MAX_DAILY_REFRESHES - usage._count.id)
  }

  private async recordRefresh(hotelId: string, period: AdvicePeriod): Promise<void> {
    await prisma.advisorRefreshLog.create({
      data: { hotelId, period }
    })
  }

  private periodLabel(period: AdvicePeriod): string {
    switch (period) {
      case 'DAILY': return 'kila siku'
      case 'WEEKLY': return 'wiki'
      case 'MONTHLY': return 'mwezi'
    }
  }

  private async callLLMAdvice(hotelId: string, days: number, period: AdvicePeriod): Promise<BusinessAdvice[]> {
    const endDate = endOfDay(new Date())
    const startDate = startOfDay(subDays(endDate, days))

    // Gather business data
    const [hotel, financial, occupancy, summary, topRooms, recentExpenses, bookingSources] = await Promise.all([
      prisma.hotel.findUnique({ where: { id: hotelId } }),

      // Financial metrics
      (async () => {
        const [revenue, expenses, roomsCount, roomNightsSold] = await Promise.all([
          prisma.payment.aggregate({
            where: {
              booking: { hotelId },
              status: 'completed',
              paidAt: { gte: startDate, lte: endDate }
            },
            _sum: { amount: true }
          }),
          prisma.expense.aggregate({
            where: {
              hotelId,
              date: { gte: startDate, lte: endDate }
            },
            _sum: { amount: true }
          }),
          prisma.room.count({ where: { hotelId, isActive: true } }),
          prisma.booking.findMany({
            where: {
              hotelId,
              status: { in: ['confirmed', 'checked_in', 'checked_out'] },
              checkIn: { lte: endDate },
              checkOut: { gte: startDate }
            },
            select: { checkIn: true, checkOut: true }
          })
        ])

        const totalRevenue = Number(revenue._sum.amount || 0)
        const totalExpenses = Number(expenses._sum.amount || 0)
        let totalNightsSold = 0
        roomNightsSold.forEach(b => {
          const start = b.checkIn > startDate ? b.checkIn : startDate
          const end = b.checkOut < endDate ? b.checkOut : endDate
          const nights = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
          totalNightsSold += nights
        })

        const totalAvailableNights = roomsCount * days
        const adr = totalNightsSold > 0 ? totalRevenue / totalNightsSold : 0
        const revpar = totalAvailableNights > 0 ? totalRevenue / totalAvailableNights : 0
        const expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0
        const occupancyRate = totalAvailableNights > 0 ? (totalNightsSold / totalAvailableNights) * 100 : 0

        return {
          totalRevenue,
          totalExpenses,
          netProfit: totalRevenue - totalExpenses,
          adr,
          revpar,
          expenseRatio,
          totalNightsSold,
          occupancyRate,
          roomsCount,
          periodDays: days
        }
      })(),

      // Occupancy trend
      (async () => {
        const [roomsCount, bookings] = await Promise.all([
          prisma.room.count({ where: { hotelId, isActive: true } }),
          prisma.booking.findMany({
            where: {
              hotelId,
              status: { in: ['confirmed', 'checked_in', 'checked_out'] },
              OR: [{ checkIn: { lte: endDate }, checkOut: { gte: startDate } }]
            },
            select: { checkIn: true, checkOut: true }
          })
        ])

        const interval = Array.from({ length: Math.min(days, 30) }, (_, i) => {
          const d = subDays(endDate, Math.min(days, 30) - 1 - i)
          return startOfDay(d)
        })

        return interval.map(date => {
          const occupied = bookings.filter(b => {
            const bIn = startOfDay(b.checkIn)
            const bOut = startOfDay(b.checkOut)
            return date >= bIn && date < bOut
          }).length
          return {
            date: date.toISOString().split('T')[0],
            rate: roomsCount > 0 ? Math.round((occupied / roomsCount) * 100) : 0
          }
        })
      })(),

      // Dashboard summary
      (async () => {
        const today = startOfDay(new Date())
        const tomorrow = endOfDay(today)
        const [checkIns, checkOuts, revenueToday, onlineReservations, directReservations, totalActive] = await Promise.all([
          prisma.booking.count({ where: { hotelId, checkIn: { gte: today, lte: tomorrow } } }),
          prisma.booking.count({ where: { hotelId, checkOut: { gte: today, lte: tomorrow } } }),
          prisma.payment.aggregate({
            where: { booking: { hotelId }, status: 'completed', paidAt: { gte: today, lte: tomorrow } },
            _sum: { amount: true }
          }),
          prisma.booking.count({ where: { hotelId, source: 'online_self', status: { not: 'cancelled' } } }),
          prisma.booking.count({ where: { hotelId, source: { in: ['staff_entry', 'walk_in'] }, status: { not: 'cancelled' } } }),
          prisma.booking.count({ where: { hotelId, status: { in: ['confirmed', 'checked_in'] } } })
        ])
        return {
          checkInsToday: checkIns,
          checkOutsToday: checkOuts,
          revenueToday: Number(revenueToday._sum.amount || 0),
          onlineReservations,
          directReservations,
          totalActive
        }
      })(),

      // Top performing rooms
      prisma.booking.groupBy({
        by: ['roomId'],
        where: {
          hotelId,
          status: { in: ['confirmed', 'checked_in', 'checked_out'] },
          checkIn: { gte: startDate, lte: endDate }
        },
        _count: { id: true },
        _sum: { totalAmount: true },
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: 5
      }).then(async grouped => {
        const rooms = await prisma.room.findMany({
          where: { id: { in: grouped.map(g => g.roomId) } },
          select: { id: true, roomNumber: true, type: true }
        })
        return grouped.map(g => ({
          roomNumber: rooms.find(r => r.id === g.roomId)?.roomNumber || '—',
          type: rooms.find(r => r.id === g.roomId)?.type || '—',
          bookings: g._count.id,
          revenue: Number(g._sum.totalAmount || 0)
        }))
      }),

      // Recent expenses by category
      prisma.expense.groupBy({
        by: ['category'],
        where: { hotelId, date: { gte: startDate, lte: endDate } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } }
      }).then(grouped => grouped.map(g => ({
        category: g.category,
        amount: Number(g._sum.amount || 0)
      }))),

      // Booking sources
      prisma.booking.groupBy({
        by: ['source'],
        where: { hotelId, status: { not: 'cancelled' }, createdAt: { gte: startDate, lte: endDate } },
        _count: { id: true },
        _sum: { totalAmount: true }
      }).then(grouped => grouped.map(g => ({
        source: g.source,
        bookings: g._count.id,
        revenue: Number(g._sum.totalAmount || 0)
      })))
    ])

    const prompt = this.buildPrompt(hotel, financial, occupancy, summary, topRooms, recentExpenses, bookingSources, period)

    return this.callLLM(prompt)
  }

  private buildPrompt(
    hotel: any,
    financial: any,
    occupancy: any[],
    summary: any,
    topRooms: any[],
    recentExpenses: any[],
    bookingSources: any[],
    period: AdvicePeriod
  ): string {
    const occupancyTrend = occupancy.slice(-7).map(o => `${o.date}: ${o.rate}%`).join(', ')
    const periodLabel = period === 'DAILY' ? 'siku 1 iliyopita' : period === 'WEEKLY' ? 'wiki 1 iliyopita' : 'mwezi 1 uliopita'

    return `You are Buffalo Business Advisor, an expert hotel management consultant with deep experience in East African hospitality, especially small-to-medium hotels and lodges in Tanzania.

Your job is to analyze the hotel's real business data and provide 3-5 specific, actionable, high-quality business recommendations. Be direct, practical, and use simple Swahili/English mix suitable for a Tanzanian hotel owner or manager.

HOTEL INFORMATION:
- Name: ${hotel?.name || 'Buffalo Hotel'}
- Location: ${hotel?.address || 'Tanzania'}
- Active Rooms: ${financial.roomsCount}

FINANCIAL PERFORMANCE (Last ${periodLabel}):
- Gross Revenue: TZS ${financial.totalRevenue.toLocaleString()}
- Total Expenses: TZS ${financial.totalExpenses.toLocaleString()}
- Net Profit: TZS ${financial.netProfit.toLocaleString()}
- ADR (Average Daily Rate): TZS ${financial.adr.toFixed(0)}
- RevPAR (Revenue Per Available Room): TZS ${financial.revpar.toFixed(0)}
- Expense Ratio: ${financial.expenseRatio.toFixed(1)}%
- Occupancy Rate: ${financial.occupancyRate.toFixed(1)}%
- Room Nights Sold: ${financial.totalNightsSold}

DASHBOARD TODAY:
- Check-ins today: ${summary.checkInsToday}
- Check-outs today: ${summary.checkOutsToday}
- Revenue today: TZS ${summary.revenueToday.toLocaleString()}
- Active bookings: ${summary.totalActive}
- Online reservations: ${summary.onlineReservations}
- Direct/Walk-in reservations: ${summary.directReservations}

LAST 7 DAYS OCCUPANCY TREND:
${occupancyTrend}

TOP 5 PERFORMING ROOMS:
${topRooms.map(r => `- Room ${r.roomNumber} (${r.type}): ${r.bookings} bookings, TZS ${r.revenue.toLocaleString()}`).join('\n') || 'No data'}

EXPENSE BREAKDOWN:
${recentExpenses.map(e => `- ${e.category}: TZS ${e.amount.toLocaleString()}`).join('\n') || 'No data'}

BOOKING SOURCES:
${bookingSources.map(s => `- ${s.source}: ${s.bookings} bookings, TZS ${s.revenue.toLocaleString()}`).join('\n') || 'No data'}

INSTRUCTIONS:
1. Identify the biggest opportunity or threat based on the numbers.
2. Give 3-5 prioritized recommendations (high/medium/low priority).
3. Each recommendation must have: title (short, bold), message (2-3 sentences with specific numbers), type (success/danger/warning/info), and priority (high/medium/low).
4. Focus on things like: pricing strategy, occupancy, expense control, marketing channels, room upgrades, staff efficiency, online bookings, seasonal promotions.
5. If profit is negative or expense ratio > 40%, prioritize cost control.
6. If occupancy < 50%, prioritize marketing/pricing.
7. If RevPAR is low, suggest promotions or upsells.

RETURN STRICTLY AS JSON ARRAY in this exact format (no markdown, no explanation, just valid JSON). Do not include any text before or after the JSON array:
[
  {
    "type": "success|danger|warning|info",
    "title": "Short title",
    "message": "Detailed recommendation with numbers",
    "priority": "high|medium|low"
  }
]`
  }

  private async callLLM(prompt: string): Promise<BusinessAdvice[]> {
    const primaryProvider = (process.env.AI_PROVIDER || 'openrouter') as 'openrouter' | 'grok' | 'gemini'
    const primaryKey = process.env.AI_API_KEY

    const providers: { name: string; call: () => Promise<BusinessAdvice[]> }[] = []

    if (primaryKey) {
      providers.push({ name: primaryProvider, call: () => this.callProvider(primaryProvider, prompt, primaryKey) })
    }

    // Fallback order depends on the primary provider
    const fallbackOrder: ('openrouter' | 'grok' | 'gemini')[] =
      primaryProvider === 'openrouter' ? ['grok', 'gemini'] :
      primaryProvider === 'grok' ? ['gemini', 'openrouter'] :
      ['openrouter', 'grok']

    for (const p of fallbackOrder) {
      const key = p === 'openrouter' ? process.env.OPENROUTER_API_KEY : p === 'grok' ? process.env.GROK_API_KEY : process.env.GEMINI_API_KEY
      if (key && !providers.some(pp => pp.name === p)) {
        providers.push({ name: p, call: () => this.callProvider(p, prompt, key) })
      }
    }

    if (providers.length === 0) {
      throw new Error('No AI API keys configured. Set AI_API_KEY or provider-specific keys (OPENROUTER_API_KEY, GROK_API_KEY, GEMINI_API_KEY).')
    }

    let lastError: any
    for (const provider of providers) {
      try {
        console.log(`[Advisor] Trying provider: ${provider.name}`)
        const result = await provider.call()
        console.log(`[Advisor] Provider ${provider.name} succeeded`)
        return result
      } catch (err: any) {
        console.error(`[Advisor] Provider ${provider.name} failed:`, err.message)
        lastError = err
      }
    }

    throw new Error(`All AI providers failed. Last error: ${lastError?.message || 'Unknown'}`)
  }

  private callProvider(provider: 'openrouter' | 'grok' | 'gemini', prompt: string, apiKey: string): Promise<BusinessAdvice[]> {
    switch (provider) {
      case 'openrouter': return this.callOpenRouter(prompt, apiKey)
      case 'grok': return this.callGrok(prompt, apiKey)
      case 'gemini': return this.callGemini(prompt, apiKey)
    }
  }

  private async callOpenRouter(prompt: string, apiKey: string): Promise<BusinessAdvice[]> {
    const model = process.env.AI_MODEL || 'meta-llama/llama-3.1-8b-instruct:free'

    const res = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model,
        messages: [
          { role: 'system', content: 'You are a hotel business advisor. Always return valid JSON arrays.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
          'X-Title': 'Buffalo Business Advisor'
        },
        timeout: 8000
      }
    )

    const content = res.data.choices?.[0]?.message?.content || ''
    return this.parseJSONAdvice(content)
  }

  private async callGemini(prompt: string, apiKey: string): Promise<BusinessAdvice[]> {
    const model = process.env.AI_MODEL || 'gemini-1.5-flash'

    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1500
        }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 8000
      }
    )

    const content = res.data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    return this.parseJSONAdvice(content)
  }

  private async callGrok(prompt: string, apiKey: string): Promise<BusinessAdvice[]> {
    const model = process.env.AI_MODEL || 'grok-2-latest'

    const res = await axios.post(
      'https://api.x.ai/v1/chat/completions',
      {
        model,
        messages: [
          { role: 'system', content: 'You are a hotel business advisor. Always return valid JSON arrays.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 8000
      }
    )

    const content = res.data.choices?.[0]?.message?.content || ''
    return this.parseJSONAdvice(content)
  }

  private parseJSONAdvice(content: string): BusinessAdvice[] {
    let cleaned = content.trim()

    // Extract JSON from markdown code block
    const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      cleaned = codeBlockMatch[1].trim()
    }

    // If content still has extra text, find the first JSON array
    if (!cleaned.startsWith('[')) {
      const arrayMatch = cleaned.match(/(\[[\s\S]*\])/)
      if (arrayMatch) {
        cleaned = arrayMatch[1].trim()
      }
    }

    const parsed = JSON.parse(cleaned)

    if (!Array.isArray(parsed)) {
      throw new Error('Parsed advice is not an array')
    }

    return parsed.map((item: any) => ({
      type: ['success', 'danger', 'warning', 'info'].includes(item.type) ? item.type : 'info',
      title: String(item.title || 'Ushauri'),
      message: String(item.message || ''),
      priority: ['high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium'
    }))
  }

  private fallbackAdvice(): BusinessAdvice[] {
    return [{
      type: 'info',
      title: 'Ushauri wa Kibiashara',
      message: 'Mfumo wa ushauri ulishindwa kuchakata majibu. Tafadhali jaribu tena baadae.',
      priority: 'medium'
    }]
  }
}

export const advisorService = new AdvisorService()
