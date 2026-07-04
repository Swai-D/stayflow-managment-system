import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { requirePermission } from '../middleware/requirePermission'
import { validate } from '../middleware/validate'
import { z } from 'zod'
import {
  getRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole
} from '../controllers/roles.controller'

const router = Router()
router.use(authenticate)

const roleSchema = z.object({
  name: z.string().min(2, 'Jina la jukumu linahitajika'),
  description: z.string().optional(),
  permissions: z.array(z.string()).default([])
})

const updateRoleSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional()
})

// Anyone authenticated can list roles (needed for dropdowns)
router.get('/', getRoles)
router.get('/:id', getRole)

// Only users with settings management permission can create/update/delete roles
router.post('/', requirePermission('settings:manage'), validate(roleSchema), createRole)
router.patch('/:id', requirePermission('settings:manage'), validate(updateRoleSchema), updateRole)
router.delete('/:id', requirePermission('settings:manage'), deleteRole)

export default router
