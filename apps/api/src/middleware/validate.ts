import { Request, Response, NextFunction } from 'express'
import { z, ZodSchema } from 'zod'
import { ApiError } from '../utils/ApiError'

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const details = result.error.flatten().fieldErrors
      throw ApiError.badRequest('Taarifa zilizowekwa si sahihi', details)
    }
    req.body = result.data
    next()
  }
}

// ─── Schemas ───────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Email si sahihi'),
  password: z.string().min(1, 'Nywila inahitajika'),
})

export const createUserSchema = z.object({
  fullName: z.string().min(2, 'Jina linahitajika'),
  email: z.string().email('Email si sahihi'),
  password: z.string().min(8, 'Nywila lazima iwe na herufi 8+'),
  roleId: z.string().uuid('Chagua jukumu sahihi'),
  phone: z.string().optional(),
})
