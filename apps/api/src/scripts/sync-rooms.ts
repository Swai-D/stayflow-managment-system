import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const roomsData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'rooms_info.json'), 'utf8'))

const prisma = new PrismaClient()

type RoomRow = {
  'ROOM NUMBER': number
  'OLD NUMBER': number
  'ROOM TYPE': string
  'STO/SPECIAL RATE': number
  'PRICE': number
  'NON RESIDENT': string
  'FULL BOARD': number
  'NO OF BEDS'?: number
}

function normalizeType(type: string): string {
  const t = type.trim().toLowerCase()
  if (t === 'standard') return 'standard'
  if (t === 'deluxe') return 'deluxe'
  if (t === 'twin') return 'twin'
  if (t === 'tripple' || t === 'triple') return 'triple'
  return 'standard'
}

function floorFromRoomNumber(num: number): number {
  if (num >= 100 && num < 200) return 1
  if (num >= 200 && num < 300) return 2
  if (num >= 300 && num < 400) return 3
  if (num >= 400 && num < 500) return 4
  if (num >= 500 && num < 600) return 5
  return 0
}

async function main() {
  const hotel = await prisma.hotel.findFirst()
  if (!hotel) {
    console.error('❌ No hotel found. Please run main seed first.')
    process.exit(1)
  }

  const rows: RoomRow[] = roomsData.sheets['HOTEL STOCK'].rows
  console.log(`🚀 Syncing ${rows.length} rooms from BUFFALO HOTEL.xlsx into hotel "${hotel.name}"...`)

  // Deactivate all existing rooms first so the app only shows real rooms from the sheet
  const existingCount = await prisma.room.count({ where: { hotelId: hotel.id } })
  if (existingCount > 0) {
    console.log(`🧹 Deactivating ${existingCount} existing mock rooms...`)
    await prisma.room.updateMany({
      where: { hotelId: hotel.id },
      data: { isActive: false }
    })
  }

  let created = 0
  let updated = 0

  for (const row of rows) {
    const roomNumber = String(row['ROOM NUMBER'])
    const type = normalizeType(row['ROOM TYPE'])
    const floor = floorFromRoomNumber(row['ROOM NUMBER'])
    const beds = row['NO OF BEDS'] ?? 1
    const capacity = type === 'triple' ? 3 : type === 'twin' ? 2 : 1

    const payload = {
      hotelId: hotel.id,
      roomNumber,
      name: `${row['ROOM TYPE']} Room ${roomNumber}`,
      floor,
      type: type as any,
      pricePerNight: row['PRICE'],
      specialRate: row['STO/SPECIAL RATE'],
      fullBoardRate: row['FULL BOARD'],
      nonResidentRate: String(row['NON RESIDENT']).trim(),
      beds,
      capacity,
      amenities: ['WiFi', 'AC', 'TV'],
      isActive: true,
      status: 'available' as any
    }

    const existing = await prisma.room.findUnique({
      where: { hotelId_roomNumber: { hotelId: hotel.id, roomNumber } }
    })

    if (existing) {
      await prisma.room.update({
        where: { id: existing.id },
        data: payload
      })
      updated++
    } else {
      await prisma.room.create({ data: payload })
      created++
    }
  }

  console.log(`✅ Sync complete: ${created} created, ${updated} updated. Total active rooms: ${rows.length}`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
