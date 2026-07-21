// Diagnostic: prints row counts for the tables that feed the
// Accounting → Expenses / Revenue pages, plus a few related tables.
// Run this against the SAME DATABASE_URL your frontend's API is using,
// to confirm whether the data you're seeing in the browser really
// comes from that database (vs a different environment, or a stale
// cached response in the browser).

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const [expenses, payments, bookings, invoices, rooms, users] = await Promise.all([
    prisma.expense.count(),
    prisma.payment.count(),
    prisma.booking.count(),
    prisma.invoice.count(),
    prisma.room.count(),
    prisma.user.count(),
  ])
  console.log('expenses:', expenses)
  console.log('payments:', payments)
  console.log('bookings:', bookings)
  console.log('invoices:', invoices)
  console.log('rooms:', rooms)
  console.log('users:', users)

  if (expenses > 0) {
    const sample = await prisma.expense.findMany({ take: 3, orderBy: { createdAt: 'desc' } })
    console.log('\nMost recent expense rows:')
    console.log(sample.map(e => ({ id: e.id, category: e.category, amount: e.amount, description: e.description, createdAt: e.createdAt })))
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
