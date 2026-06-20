import { Response } from 'express'
import { storeService } from '../services/store.service'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiResponse } from '../utils/ApiResponse'
import { AuthRequest } from '../middleware/authenticate'
import { getSystemHotelId } from '../utils/systemHotel'

export const getItems = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { category, subCategory, isActive } = req.query
  const hotelId = await getSystemHotelId()
  const items = await storeService.getItems(hotelId, {
    category: category as any,
    subCategory: subCategory as string,
    isActive: isActive === 'true' ? true : (isActive === 'false' ? false : undefined)
  })
  res.json(new ApiResponse(items))
})

export const getLowStockItems = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const items = await storeService.getLowStockItems(hotelId)
  res.json(new ApiResponse(items))
})

export const getItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const item = await storeService.getItem(req.params.id, hotelId)
  res.json(new ApiResponse(item))
})

export const createItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const item = await storeService.createItem(hotelId, req.body)
  res.status(201).json(new ApiResponse(item))
})

export const updateItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const item = await storeService.updateItem(req.params.id, hotelId, req.body)
  res.json(new ApiResponse(item))
})

export const getTransactions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { itemId, type } = req.query
  const hotelId = await getSystemHotelId()
  const transactions = await storeService.getTransactions(hotelId, {
    itemId: itemId as string,
    type: type as any
  })
  res.json(new ApiResponse(transactions))
})

export const createTransaction = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const transaction = await storeService.createTransaction(hotelId, req.user!.id, req.body)
  res.status(201).json(new ApiResponse(transaction))
})

export const getPurchaseOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const pos = await storeService.getPurchaseOrders(hotelId)
  res.json(new ApiResponse(pos))
})

export const createPurchaseOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const po = await storeService.createPurchaseOrder(hotelId, req.user!.id, req.body)
  res.status(201).json(new ApiResponse(po))
})

export const autoGeneratePO = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const pos = await storeService.autoGeneratePO(hotelId, req.user!.id)
  res.json(new ApiResponse(pos))
})

export const receivePurchaseOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const result = await storeService.receivePurchaseOrder(req.params.id, hotelId, req.user!.id)
  res.json(new ApiResponse(result))
})

export const getSuppliers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const suppliers = await storeService.getSuppliers(hotelId)
  res.json(new ApiResponse(suppliers))
})

export const createSupplier = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const supplier = await storeService.createSupplier(hotelId, req.body)
  res.status(201).json(new ApiResponse(supplier))
})

export const getDashboardStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const stats = await storeService.getDashboardStats(hotelId)
  res.json(new ApiResponse(stats))
})

export const updatePOStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const po = await storeService.updatePOStatus(req.params.id, hotelId, req.body.status)
  res.json(new ApiResponse(po))
})

export const updateSupplier = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const supplier = await storeService.updateSupplier(req.params.id, hotelId, req.body)
  res.json(new ApiResponse(supplier))
})