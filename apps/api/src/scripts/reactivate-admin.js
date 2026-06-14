const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    where: { role: 'admin', isActive: false }
  })
  
  if (users.length === 0) {
    console.log('Hakuna admin aliyezimwa aliyepatikana.')
    return
  }

  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: true }
    })
    console.log(`Mtumiaji ${user.fullName} (${user.email}) amewashwa tena!`)
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
