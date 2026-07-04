import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { requirePermission } from '../middleware/requirePermission'
import * as developerController from '../controllers/developer.controller'

const router = Router()

router.use(authenticate)
router.use(requirePermission('developer:manage'))

router.get('/metadata', developerController.getScopesAndEvents)

router.get('/api-keys', developerController.listApiKeys)
router.post('/api-keys', developerController.createApiKey)
router.post('/api-keys/:id/revoke', developerController.revokeApiKey)
router.delete('/api-keys/:id', developerController.deleteApiKey)

router.get('/webhooks', developerController.listWebhooks)
router.post('/webhooks', developerController.createWebhook)
router.put('/webhooks/:id', developerController.updateWebhook)
router.delete('/webhooks/:id', developerController.deleteWebhook)
router.get('/webhooks/:id/deliveries', developerController.listWebhookDeliveries)

router.get('/logs', developerController.listApiLogs)

export default router
