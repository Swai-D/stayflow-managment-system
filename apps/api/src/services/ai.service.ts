import { PrismaClient } from '@prisma/client'
import axios from 'axios'
import { ApiError } from '../utils/ApiError'
import { getSystemHotelId } from '../utils/systemHotel'
import { aiContextService } from './aiContext.service'

const prisma = new PrismaClient()

export type AiProvider = 'openai' | 'deepseek' | 'gemini'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  messages: ChatMessage[]
  provider?: AiProvider
}

export interface AiSettingsInput {
  enabled?: boolean
  provider?: AiProvider
  openaiKey?: string
  openaiModel?: string
  deepseekKey?: string
  deepseekModel?: string
  geminiKey?: string
  geminiModel?: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
  language?: string
  responseStyle?: string
  includeCharts?: boolean
  autoAnalyze?: boolean
}

function buildSystemPrompt(settings: {
  systemPrompt: string
  language: string
  responseStyle: string
}) {
  const langInstruction =
    settings.language === 'swahili'
      ? 'Always respond in Kiswahili unless the user asks otherwise.'
      : settings.language === 'english'
      ? 'Always respond in English unless the user asks otherwise.'
      : 'Respond in both Kiswahili and English when helpful.'

  const styleMap: Record<string, string> = {
    professional: 'Use a professional and courteous tone.',
    casual: 'Use a friendly, conversational tone.',
    detailed: 'Provide detailed and thorough explanations.',
    concise: 'Keep responses concise and to the point.'
  }

  return `${settings.systemPrompt}\n\n${langInstruction}\n${styleMap[settings.responseStyle] || styleMap.professional}`
}

export class AiService {
  async getSettings(hotelId: string) {
    const settings = await prisma.aiSettings.findUnique({
      where: { hotelId }
    })

    if (!settings) {
      return prisma.aiSettings.create({
        data: { hotelId }
      })
    }

    return settings
  }

  async updateSettings(hotelId: string, data: AiSettingsInput) {
    const existing = await prisma.aiSettings.findUnique({
      where: { hotelId }
    })

    if (!existing) {
      return prisma.aiSettings.create({
        data: {
          hotelId,
          ...(data.enabled !== undefined && { enabled: data.enabled }),
          ...(data.provider && { provider: data.provider }),
          ...(data.openaiKey !== undefined && { openaiKey: data.openaiKey }),
          ...(data.openaiModel && { openaiModel: data.openaiModel }),
          ...(data.deepseekKey !== undefined && { deepseekKey: data.deepseekKey }),
          ...(data.deepseekModel && { deepseekModel: data.deepseekModel }),
          ...(data.geminiKey !== undefined && { geminiKey: data.geminiKey }),
          ...(data.geminiModel && { geminiModel: data.geminiModel }),
          ...(data.temperature !== undefined && { temperature: data.temperature }),
          ...(data.maxTokens !== undefined && { maxTokens: data.maxTokens }),
          ...(data.systemPrompt !== undefined && { systemPrompt: data.systemPrompt }),
          ...(data.language && { language: data.language }),
          ...(data.responseStyle && { responseStyle: data.responseStyle }),
          ...(data.includeCharts !== undefined && { includeCharts: data.includeCharts }),
          ...(data.autoAnalyze !== undefined && { autoAnalyze: data.autoAnalyze })
        }
      })
    }

    return prisma.aiSettings.update({
      where: { hotelId },
      data: {
        ...(data.enabled !== undefined && { enabled: data.enabled }),
        ...(data.provider && { provider: data.provider }),
        ...(data.openaiKey !== undefined && { openaiKey: data.openaiKey }),
        ...(data.openaiModel && { openaiModel: data.openaiModel }),
        ...(data.deepseekKey !== undefined && { deepseekKey: data.deepseekKey }),
        ...(data.deepseekModel && { deepseekModel: data.deepseekModel }),
        ...(data.geminiKey !== undefined && { geminiKey: data.geminiKey }),
        ...(data.geminiModel && { geminiModel: data.geminiModel }),
        ...(data.temperature !== undefined && { temperature: data.temperature }),
        ...(data.maxTokens !== undefined && { maxTokens: data.maxTokens }),
        ...(data.systemPrompt !== undefined && { systemPrompt: data.systemPrompt }),
        ...(data.language && { language: data.language }),
        ...(data.responseStyle && { responseStyle: data.responseStyle }),
        ...(data.includeCharts !== undefined && { includeCharts: data.includeCharts }),
        ...(data.autoAnalyze !== undefined && { autoAnalyze: data.autoAnalyze }),
        updatedAt: new Date()
      }
    })
  }

  async chat(hotelId: string, request: ChatRequest) {
    const settings = await this.getSettings(hotelId)

    if (!settings.enabled) {
      throw ApiError.badRequest('Buffalo haijawashwa. Wasiliana na admin kumwezesha.')
    }

    const provider = request.provider || (settings.provider as AiProvider) || 'openai'
    const context = await aiContextService.buildContext(hotelId, settings.autoAnalyze)
    const systemPrompt = `${buildSystemPrompt(settings)}\n\n${context}`

    switch (provider) {
      case 'openai':
        return this.chatOpenAI(settings, request.messages, systemPrompt)
      case 'deepseek':
        return this.chatDeepSeek(settings, request.messages, systemPrompt)
      case 'gemini':
        return this.chatGemini(settings, request.messages, systemPrompt)
      default:
        throw ApiError.badRequest('Provider isiyojulikana')
    }
  }

  private async chatOpenAI(
    settings: any,
    messages: ChatMessage[],
    systemPrompt: string
  ): Promise<string> {
    if (!settings.openaiKey) {
      throw ApiError.badRequest('OpenAI API key haijasanidiwa')
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: settings.openaiModel || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map(m => ({ role: m.role, content: m.content }))
          ],
          temperature: settings.temperature,
          max_tokens: settings.maxTokens
        },
        {
          headers: {
            Authorization: `Bearer ${settings.openaiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      )

      return response.data.choices?.[0]?.message?.content || 'Hakuna jibu lililopatikana.'
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'OpenAI request failed'
      throw ApiError.badRequest(`AI error: ${message}`)
    }
  }

  private async chatDeepSeek(
    settings: any,
    messages: ChatMessage[],
    systemPrompt: string
  ): Promise<string> {
    if (!settings.deepseekKey) {
      throw ApiError.badRequest('DeepSeek API key haijasanidiwa')
    }

    try {
      const response = await axios.post(
        'https://api.deepseek.com/chat/completions',
        {
          model: settings.deepseekModel || 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map(m => ({ role: m.role, content: m.content }))
          ],
          temperature: settings.temperature,
          max_tokens: settings.maxTokens
        },
        {
          headers: {
            Authorization: `Bearer ${settings.deepseekKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      )

      return response.data.choices?.[0]?.message?.content || 'Hakuna jibu lililopatikana.'
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'DeepSeek request failed'
      throw ApiError.badRequest(`AI error: ${message}`)
    }
  }

  private async chatGemini(
    settings: any,
    messages: ChatMessage[],
    systemPrompt: string
  ): Promise<string> {
    if (!settings.geminiKey) {
      throw ApiError.badRequest('Gemini API key haijasanidiwa')
    }

    const model = settings.geminiModel || 'gemini-1.5-flash'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${settings.geminiKey}`

    // Gemini uses alternating user/model roles; combine history into a single prompt for simplicity
    const historyText = messages
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n')

    try {
      const response = await axios.post(
        url,
        {
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: historyText || 'Hello' }]
            }
          ],
          generationConfig: {
            temperature: settings.temperature,
            maxOutputTokens: settings.maxTokens
          }
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 60000
        }
      )

      const candidates = response.data.candidates
      if (!candidates?.length) {
        throw new Error('Hakuna jibu lililopatikana')
      }

      return candidates[0].content?.parts?.map((p: any) => p.text).join('') || 'Hakuna jibu lililopatikana.'
    } catch (error: any) {
      const message = error.response?.data?.error?.message || error.message || 'Gemini request failed'
      throw ApiError.badRequest(`AI error: ${message}`)
    }
  }

  async validateKey(provider: AiProvider, apiKey: string) {
    switch (provider) {
      case 'openai':
        try {
          await axios.get('https://api.openai.com/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
            timeout: 10000
          })
          return { valid: true, message: 'OpenAI API key ni sahihi' }
        } catch (error: any) {
          return { valid: false, message: error.response?.data?.error?.message || 'OpenAI API key si sahihi' }
        }
      case 'deepseek':
        try {
          await axios.get('https://api.deepseek.com/user/balance', {
            headers: { Authorization: `Bearer ${apiKey}` },
            timeout: 10000
          })
          return { valid: true, message: 'DeepSeek API key ni sahihi' }
        } catch (error: any) {
          return { valid: false, message: error.response?.data?.error?.message || 'DeepSeek API key si sahihi' }
        }
      case 'gemini':
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
          await axios.get(url, { timeout: 10000 })
          return { valid: true, message: 'Gemini API key ni sahihi' }
        } catch (error: any) {
          return { valid: false, message: error.response?.data?.error?.message || 'Gemini API key si sahihi' }
        }
      default:
        return { valid: false, message: 'Provider isiyojulikana' }
    }
  }
}

export const aiService = new AiService()
