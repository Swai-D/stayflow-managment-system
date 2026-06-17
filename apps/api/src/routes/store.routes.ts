import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { authorize } from '../middleware/authorize'
import {
  getItems, getItem, createItem, updateItem, getLowStockItems,
  getTransactions, createTransaction,
  getPurchaseOrders, createPurchaseOrder, autoGeneratePO, receivePurchaseOrder,
  getSuppliers, createSupplier,
  getDashboardStats
} from '../controllers/store.controller'

const router = Router()
router.use(authenticate)

// View dashboard/stats: admin, receptionist, housekeeping
router.get('/dashboard',       authorize('admin', 'receptionist', 'housekeeping'), getDashboardStats)

// Items: view for admin/recep/house, edit for admin/recep
router.get('/items',           authorize('admin', 'receptionist', 'housekeeping'), getItems)
router.get('/items/low-stock', authorize('admin', 'receptionist', 'housekeeping'), getLowStockItems)
router.get('/items/:id',       authorize('admin', 'receptionist', 'housekeeping'), getItem)
router.post('/items',          authorize('admin', 'receptionist'), createItem)
router.patch('/items/:id',     authorize('admin', 'receptionist'), updateItem)

// Transactions: admin, receptionist
router.get('/transactions',    authorize('admin', 'receptionist'), getTransactions)
router.post('/transactions',   authorize('admin', 'receptionist'), createTransaction)

// Purchase Orders: admin/recep can view/create, admin only for auto-generate (usually)
router.get('/purchase-orders',               authorize('admin', 'receptionist'), getPurchaseOrders)
router.post('/purchase-orders',              authorize('admin', 'receptionist'), createPurchaseOrder)
router.post('/purchase-orders/auto-generate',authorize('admin'), autoGeneratePO)
router.post('/purchase-orders/:id/receive',  authorize('admin', 'receptionist'), receivePurchaseOrder)

// Suppliers: admin, receptionist
router.get('/suppliers',       authorize('admin', 'receptionist'), getSuppliers)
router.post('/suppliers',      authorize('admin', 'receptionist'), createSupplier)

export default router