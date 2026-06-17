import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function checkLowStockAlerts() {
  const allItems = await prisma.storeItem.findMany({
    where: { isActive: true },
    include: { supplier: true }
  })

  const lowStockItems = allItems.filter(item => item.currentStock < item.minimumStock)

  if (lowStockItems.length > 0) {
    console.log(`[ALERT] ${lowStockItems.length} items are below minimum stock`)
    lowStockItems.forEach(item => {
      console.log(`  ⚠️  ${item.name}: ${item.currentStock} ${item.unit} (min: ${item.minimumStock})`)
    })
  }

  return lowStockItems
}