import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { requirePermission } from '../middleware/requirePermission'
import {
  getItems, getItem, createItem, updateItem, getLowStockItems,
  getTransactions, createTransaction, recordHousekeepingConsumption,
  getPurchaseOrders, createPurchaseOrder, autoGeneratePO, receivePurchaseOrder, updatePOStatus,
  getSuppliers, createSupplier, updateSupplier,
  getDashboardStats
} from '../controllers/store.controller'

const router = Router()
router.use(authenticate)

// View dashboard/stats
router.get('/dashboard',       requirePermission('store:view'), getDashboardStats)

// Items
router.get('/items',           requirePermission('store:view'), getItems)
router.get('/items/low-stock', requirePermission('store:view'), getLowStockItems)
router.get('/items/:id',       requirePermission('store:view'), getItem)
router.post('/items',          requirePermission('store:manage'), createItem)
router.patch('/items/:id',     requirePermission('store:manage'), updateItem)

// Transactions
router.get('/transactions',    requirePermission('store:view'), getTransactions)
router.post('/transactions',   requirePermission('store:manage'), createTransaction)
router.post('/housekeeping-consumption', requirePermission('store:view', 'housekeeping:manage'), recordHousekeepingConsumption)

// Purchase Orders
router.get('/purchase-orders',               requirePermission('store:view'), getPurchaseOrders)
router.post('/purchase-orders',              requirePermission('store:manage'), createPurchaseOrder)
router.post('/purchase-orders/auto-generate',requirePermission('store:manage'), autoGeneratePO)
router.post('/purchase-orders/:id/receive',  requirePermission('store:manage'), receivePurchaseOrder)
router.patch('/purchase-orders/:id/status',   requirePermission('store:manage'), updatePOStatus)

// Suppliers
router.get('/suppliers',       requirePermission('store:view'), getSuppliers)
router.post('/suppliers',      requirePermission('store:manage'), createSupplier)
router.patch('/suppliers/:id',   requirePermission('store:manage'), updateSupplier)

export default router