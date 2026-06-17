import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function generateBookingRef(): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.booking.count({
    where: {
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`)
      }
    }
  })
  const num = String(count + 1).padStart(3, '0')
  return `BUF-${year}-${num}`
}

export async function generateReceiptNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.receipt.count({
    where: {
      issuedAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`)
      }
    }
  })
  const num = String(count + 1).padStart(3, '0')
  return `RCP-${year}-${num}`
}
