import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Resolve the canonical hotel ID for a single-hotel deployment.
 * Website bookings and dashboard users must all operate within the same hotel.
 * If the system admin exists, we use their hotel. Otherwise fall back to env/default.
 */
export async function getSystemHotelId(): Promise<string> {
  const admin = await prisma.user.findFirst({
    where: { email: 'admin@buffalo-hotel.co.tz' },
    select: { hotelId: true }
  })

  return admin?.hotelId || process.env.DEFAULT_HOTEL_ID || 'default-hotel-id'
}
