import 'dotenv/config'
import app from './app'
import { initJobs } from './jobs/cron'

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  initJobs()
  console.log(`
  ╔═══════════════════════════════╗
  ║   StayFlow API — Running      ║
  ║   Port: ${PORT}                   ║
  ║   Env:  ${process.env.NODE_ENV || 'development'}            ║
  ╚═══════════════════════════════╝
  `)
})
