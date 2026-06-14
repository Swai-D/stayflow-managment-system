const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Seeding 50 rooms for G4 Homez...')

  const hotel = await prisma.hotel.findFirst({ where: { slug: 'default' } })
  if (!hotel) {
    console.error('❌ Hotel not found. Please run main seed first.')
    return
  }

  const roomTypes = ['standard', 'deluxe', 'superior', 'suite', 'family']
  const amenitiesPool = ['WiFi', 'AC', 'Smart TV', 'Breakfast', 'Balcony', 'Room Service', 'Mini Bar', 'Sea View']
  
  // Get current room count
  const currentCount = await prisma.room.count({ where: { hotelId: hotel.id } })
  const roomsToCreate = 50 - currentCount

  if (roomsToCreate <= 0) {
    console.log(`✅ Already have ${currentCount} rooms. No seeding needed.`)
    return
  }

  console.log(`Creating ${roomsToCreate} more rooms...`)

  for (let i = 1; i <= roomsToCreate; i++) {
    const floor = Math.ceil(i / 10) + 1 // Start from floor 2
    const roomNum = (floor * 100) + (i % 10 === 0 ? 10 : i % 10)
    const type = roomTypes[Math.floor(Math.random() * roomTypes.length)]
    
    // Pick 3-5 random amenities
    const shuffled = [...amenitiesPool].sort(() => 0.5 - Math.random())
    const amenities = shuffled.slice(0, 3 + Math.floor(Math.random() * 3))

    const price = type === 'standard' ? 50000 : 
                  type === 'deluxe' ? 80000 :
                  type === 'superior' ? 120000 :
                  type === 'suite' ? 250000 : 150000

    await prisma.room.upsert({
      where: { 
        hotelId_roomNumber: { 
          hotelId: hotel.id, 
          roomNumber: String(roomNum) 
        } 
      },
      update: {},
      create: {
        hotelId: hotel.id,
        roomNumber: String(roomNum),
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} Unit ${roomNum}`,
        floor: floor,
        type: type,
        status: 'available',
        pricePerNight: price,
        capacity: type === 'family' ? 4 : (type === 'suite' ? 3 : 2),
        amenities: amenities,
        isActive: true
      }
    })
    
    if (i % 10 === 0) console.log(`... ${i} rooms created`)
  }

  console.log(`\n🎉 Success! Total rooms in DB: ${await prisma.room.count({ where: { hotelId: hotel.id } })}`)
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
