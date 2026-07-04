import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { requirePermission } from '../middleware/requirePermission'
import { validate } from '../middleware/validate'
import { z } from 'zod'
import {
  getAiStatus,
  getAiSettings,
  updateAiSettings,
  chat,
  validateKey
} from '../controllers/ai.controller'

const router = Router()
router.use(authenticate)

const chatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1)
  })).min(1),
  provider: z.enum(['openai', 'deepseek', 'gemini']).optional()
})

const settingsSchema = z.object({
  enabled: z.boolean().optional(),
  provider: z.enum(['openai', 'deepseek', 'gemini']).optional(),
  openaiKey: z.string().optional(),
  openaiModel: z.string().optional(),
  deepseekKey: z.string().optional(),
  deepseekModel: z.string().optional(),
  geminiKey: z.string().optional(),
  geminiModel: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(100).max(8000).optional(),
  systemPrompt: z.string().optional(),
  language: z.enum(['swahili', 'english', 'both']).optional(),
  responseStyle: z.enum(['professional', 'casual', 'detailed', 'concise']).optional(),
  includeCharts: z.boolean().optional(),
  autoAnalyze: z.boolean().optional()
})

const validateKeySchema = z.object({
  provider: z.enum(['openai', 'deepseek', 'gemini']),
  apiKey: z.string().min(1)
})

// Public status for any authenticated user (used by navbar icon)
router.get('/status', getAiStatus)

// Chat is available to any authenticated user if AI is enabled
router.post('/chat', validate(chatSchema), chat)

// Settings management requires admin / settings management permission
router.get('/settings', requirePermission('settings:manage'), getAiSettings)
router.patch('/settings', requirePermission('settings:manage'), validate(settingsSchema), updateAiSettings)

// Validate API key (admin only)
router.post('/validate-key', requirePermission('settings:manage'), validate(validateKeySchema), validateKey)

export default router
