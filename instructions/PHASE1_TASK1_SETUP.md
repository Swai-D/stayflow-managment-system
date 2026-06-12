# ⚠️ DESIGN REFERENCE — READ BEFORE WRITING ANY UI CODE
> Design: YowStay Hotel Management Dashboard
> Link  : https://dribbble.com/shots/25764240-YowStay-Hotel-Management-Dashboard
> Designer: https://dribbble.com/yowdesain
>
> Key rules:
> - WHITE backgrounds only — no colored cards, no gradients, NO purple
> - Blue (#2563EB) is the ONLY accent color
> - Inter font, subtle shadows, clean spacing
> - Small status badges (light bg + colored text) — not filled/solid badges
> - Study the reference before building any component
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# STAYFLOW — PHASE 1, TASK 1: PROJECT SETUP
> Paste hii yote kwenye Gemini CLI au Claude Code
> Fuata hatua kwa hatua — usiruke hatua yoyote

---

## CONTEXT — Soma Kwanza

Tunatengeneza **StayFlow Reservation Management System** — mfumo wa kusimamia booking za hoteli Tanzania.

Tech stack:
- Frontend: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- Backend: Node.js + Express.js + TypeScript
- Database: PostgreSQL + Prisma ORM
- Cache: Redis
- Structure: Monorepo (npm workspaces)

OS: Windows | Editor: VS Code | Terminal: Windows Terminal / PowerShell

---

## TASK 1A — Initialize Monorepo

Fanya hii kwenye folder unayotaka project iwe (e.g. `C:\Projects\`):

```
Unda folder ya root:
  stayflow/
  ├── apps/
  │   ├── web/     (Next.js frontend)
  │   └── api/     (Express backend)
  └── package.json (root — npm workspaces)
```

### Root package.json
```json
{
  "name": "stayflow",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "apps/web",
    "apps/api"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev --workspace=apps/web\" \"npm run dev --workspace=apps/api\"",
    "dev:web": "npm run dev --workspace=apps/web",
    "dev:api": "npm run dev --workspace=apps/api",
    "build": "npm run build --workspace=apps/web && npm run build --workspace=apps/api",
    "test": "npm run test --workspace=apps/api",
    "test:e2e": "npm run test:e2e --workspace=apps/web"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

### .gitignore (root)
```
node_modules/
.env
.env.local
.env.production
dist/
.next/
*.log
.DS_Store
Thumbs.db
coverage/
prisma/migrations/*.sql.bak
```

---

## TASK 1B — Setup Frontend (Next.js)

```bash
cd apps
npx create-next-app@latest web --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
cd web
```

### Install frontend dependencies:
```bash
npm install @tanstack/react-query axios zustand date-fns react-hook-form zod @hookform/resolvers lucide-react recharts qrcode
npm install @types/qrcode --save-dev
npm install -D @playwright/test
npx playwright install
```

### Install shadcn/ui:
```bash
npx shadcn@latest init
```
Chagua hivi wakati wa setup:
- Style: Default
- Base color: Slate
- CSS variables: Yes

### Install shadcn components muhimu:
```bash
npx shadcn@latest add button input label card table badge dialog select textarea toast skeleton tabs dropdown-menu avatar separator sheet calendar popover command
```

### Folder structure ya web (unda folders hizi):
```
apps/web/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── overview/
│   │   │   └── page.tsx
│   │   ├── reservations/
│   │   │   ├── page.tsx
│   │   │   └── new/
│   │   │       └── page.tsx
│   │   ├── guests/
│   │   │   └── page.tsx
│   │   ├── rooms/
│   │   │   └── page.tsx
│   │   ├── housekeeping/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   ├── (guest-portal)/
│   │   ├── layout.tsx
│   │   ├── book/
│   │   │   └── page.tsx
│   │   └── room/
│   │       └── [roomNumber]/
│   │           └── page.tsx
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── ui/           (shadcn — DO NOT EDIT)
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   ├── reservations/
│   ├── rooms/
│   ├── payments/
│   ├── guests/
│   └── shared/
│       ├── LoadingSpinner.tsx
│       └── EmptyState.tsx
├── hooks/
│   ├── useAuth.ts
│   └── useLanguage.ts
├── lib/
│   ├── api.ts
│   ├── utils.ts
│   └── formatters.ts
├── store/
│   ├── authStore.ts
│   └── uiStore.ts
├── locales/
│   ├── sw.json
│   └── en.json
└── types/
    ├── booking.ts
    ├── room.ts
    ├── guest.ts
    └── user.ts
```

### tailwind.config.ts — Ongeza colors za StayFlow:
```typescript
import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // StayFlow Brand
        primary: {
          DEFAULT: "#2563EB",
          light: "#EFF6FF",
          foreground: "#FFFFFF",
        },
        teal: {
          DEFAULT: "#0F6E56",
          light: "#E1F5EE",
          mid: "#1D9E75",
        },
        // Booking Status Colors
        status: {
          "checked-in": "#10B981",
          "checked-in-bg": "#ECFDF5",
          arriving: "#2563EB",
          "arriving-bg": "#EFF6FF",
          pending: "#F59E0B",
          "pending-bg": "#FFFBEB",
          "late-co": "#EF4444",
          "late-co-bg": "#FEF2F2",
          cancelled: "#6B7280",
          "cancelled-bg": "#F9FAFB",
        },
        // Room Status
        room: {
          available: "#FFFFFF",
          occupied: "#DBEAFE",
          dirty: "#FEF3C7",
          cleaning: "#E0E7FF",
          maintenance: "#FEE2E2",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      borderRadius: {
        lg: "12px",
        md: "8px",
        sm: "6px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
```

### app/globals.css — Ongeza Inter font:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --sidebar-width: 220px;
    --header-height: 56px;
  }
  * { @apply border-border; }
  body { @apply bg-background font-sans antialiased; }
}
```

### .env.local (web):
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_APP_NAME=StayFlow
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## TASK 1C — Setup Backend (Express API)

```bash
cd ../api
npm init -y
```

### Install backend dependencies:
```bash
npm install express cors helmet morgan dotenv bcryptjs jsonwebtoken prisma @prisma/client redis ioredis zod multer axios node-cron
npm install -D typescript ts-node nodemon @types/express @types/cors @types/morgan @types/bcryptjs @types/jsonwebtoken @types/multer @types/node vitest supertest @types/supertest
```

### tsconfig.json (api):
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### package.json scripts (api):
```json
{
  "scripts": {
    "dev": "nodemon --watch src --ext ts --exec ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:seed": "ts-node src/prisma/seed.ts",
    "db:studio": "prisma studio"
  }
}
```

### Folder structure ya api (unda folders hizi):
```
apps/api/
├── src/
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── bookings.routes.ts
│   │   ├── rooms.routes.ts
│   │   ├── guests.routes.ts
│   │   ├── payments.routes.ts
│   │   └── housekeeping.routes.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── bookings.controller.ts
│   │   ├── rooms.controller.ts
│   │   ├── guests.controller.ts
│   │   └── housekeeping.controller.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── bookings.service.ts
│   │   ├── availability.service.ts
│   │   ├── rooms.service.ts
│   │   ├── guests.service.ts
│   │   ├── snippe.service.ts
│   │   ├── efd.service.ts
│   │   └── smartlock.service.ts
│   ├── middleware/
│   │   ├── authenticate.ts
│   │   ├── authorize.ts
│   │   ├── validate.ts
│   │   ├── auditLog.ts
│   │   └── errorHandler.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── utils/
│   │   ├── asyncHandler.ts
│   │   ├── ApiError.ts
│   │   ├── ApiResponse.ts
│   │   └── generateRef.ts
│   ├── types/
│   │   └── index.ts
│   ├── app.ts
│   └── server.ts
├── .env
└── tsconfig.json
```

---

## TASK 1D — Prisma Schema

### Fanya hii:
```bash
cd apps/api
npx prisma init --datasource-provider postgresql
```

### Badilisha `src/prisma/schema.prisma` na content hii YOTE:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── ENUMS ───────────────────────────────────────────

enum UserRole {
  admin
  receptionist
  housekeeping
}

enum RoomType {
  standard
  deluxe
  family
  suite
  presidential
  superior
  conference
}

enum RoomStatus {
  available
  occupied
  dirty
  cleaning
  maintenance
  blocked
}

enum BookingStatus {
  pending
  confirmed
  checked_in
  checked_out
  cancelled
  no_show
  late_checkout
}

enum BookingSource {
  online_self
  staff_entry
  walk_in
}

enum PaymentMethod {
  mpesa
  tigo_pesa
  airtel_money
  halo_pesa
  cash
  bank_transfer
  visa
  mastercard
}

enum PaymentStatus {
  pending
  completed
  failed
  refunded
  partial
}

enum NotificationType {
  booking_confirmation
  payment_receipt
  check_in_reminder
  checkout_reminder
  review_request
  cancellation
}

enum NotificationChannel {
  email
  sms
  both
}

enum AddonCategory {
  food
  beverage
  transport
  laundry
  other
}

enum HousekeepingStatus {
  clean
  dirty
  cleaning
  inspected
}

enum IdType {
  national_id
  passport
  drivers_license
  voter_id
}

// ─── MODELS ──────────────────────────────────────────

model Hotel {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  address   String?
  phone     String?
  email     String?
  logoUrl   String?
  wifiName      String?
  wifiPassword  String?
  restaurantHours String?
  emergencyPhone  String?
  checkInTime   String  @default("14:00")
  checkOutTime  String  @default("11:00")
  defaultLanguage String @default("sw")
  snippeApiKey    String?
  snippeWebhookSecret String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())

  users    User[]
  rooms    Room[]
  bookings Booking[]

  @@map("hotels")
}

model User {
  id           String    @id @default(uuid())
  hotelId      String
  fullName     String
  email        String    @unique
  passwordHash String
  role         UserRole  @default(receptionist)
  phone        String?
  avatarUrl    String?
  isActive     Boolean   @default(true)
  lastLoginAt  DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  hotel            Hotel            @relation(fields: [hotelId], references: [id])
  bookingsCreated  Booking[]        @relation("CreatedBy")
  paymentsReceived Payment[]        @relation("ReceivedBy")
  housekeepingLogs HousekeepingLog[]
  receiptsIssued   Receipt[]
  auditLogs        AuditLog[]

  @@map("users")
}

model Guest {
  id          String   @id @default(uuid())
  fullName    String
  email       String?
  phone       String
  idType      IdType?
  idNumber    String?
  nationality String?
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  bookings Booking[]
  reviews  Review[]

  @@map("guests")
}

model Room {
  id            String     @id @default(uuid())
  hotelId       String
  roomNumber    String
  name          String
  floor         Int        @default(1)
  type          RoomType
  status        RoomStatus @default(available)
  pricePerNight Decimal    @db.Decimal(10, 2)
  pricePerHour  Decimal?   @db.Decimal(10, 2)
  capacity      Int        @default(2)
  description   String?
  amenities     Json       @default("[]")
  images        Json       @default("[]")
  lockId        String?
  lockProvider  String?
  isActive      Boolean    @default(true)
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  hotel            Hotel             @relation(fields: [hotelId], references: [id])
  bookings         Booking[]
  housekeepingLogs HousekeepingLog[]

  @@unique([hotelId, roomNumber])
  @@map("rooms")
}

model Booking {
  id          String        @id @default(uuid())
  bookingRef  String        @unique
  hotelId     String
  guestId     String
  roomId      String
  createdById String
  source      BookingSource @default(staff_entry)
  status      BookingStatus @default(pending)

  checkIn        DateTime
  checkOut       DateTime
  startTime      String?
  endTime        String?
  actualCheckIn  DateTime?
  actualCheckOut DateTime?

  adults   Int @default(1)
  children Int @default(0)

  roomTotal      Decimal  @db.Decimal(10, 2)
  addonsTotal    Decimal  @db.Decimal(10, 2) @default(0)
  discountAmount Decimal  @db.Decimal(10, 2) @default(0)
  taxRate        Decimal  @db.Decimal(5, 2)  @default(0)
  taxAmount      Decimal  @db.Decimal(10, 2) @default(0)
  totalAmount    Decimal  @db.Decimal(10, 2)
  paidAmount     Decimal  @db.Decimal(10, 2) @default(0)
  balanceDue     Decimal  @db.Decimal(10, 2)

  specialRequests String?
  internalNotes   String?
  cancelReason    String?

  lockAccessCode  String?
  lockGrantedAt   DateTime?
  lockRevokedAt   DateTime?

  efdSerial     String?
  efdReceiptNo  String?
  efdQrCode     String?
  efdSyncedAt   DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  hotel         Hotel          @relation(fields: [hotelId], references: [id])
  guest         Guest          @relation(fields: [guestId], references: [id])
  room          Room           @relation(fields: [roomId], references: [id])
  createdBy     User           @relation("CreatedBy", fields: [createdById], references: [id])
  payments      Payment[]
  receipts      Receipt[]
  addons        BookingAddon[]
  notifications Notification[]
  review        Review?

  @@map("bookings")
}

model Payment {
  id           String        @id @default(uuid())
  bookingId    String
  receivedById String?
  amount       Decimal       @db.Decimal(10, 2)
  method       PaymentMethod
  status       PaymentStatus @default(pending)

  snippeRef    String?
  pesapalRef   String?
  mpesaRef     String?
  phoneNumber  String?
  bankRef      String?

  notes     String?
  paidAt    DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  booking    Booking  @relation(fields: [bookingId], references: [id])
  receivedBy User?    @relation("ReceivedBy", fields: [receivedById], references: [id])
  receipt    Receipt?

  @@map("payments")
}

model Receipt {
  id            String   @id @default(uuid())
  bookingId     String
  paymentId     String   @unique
  issuedById    String?
  receiptNumber String   @unique
  pdfUrl        String
  issuedAt      DateTime @default(now())

  booking  Booking @relation(fields: [bookingId], references: [id])
  payment  Payment @relation(fields: [paymentId], references: [id])
  issuedBy User?   @relation(fields: [issuedById], references: [id])

  @@map("receipts")
}

model AddonService {
  id          String        @id @default(uuid())
  name        String
  nameEn      String
  description String?
  price       Decimal       @db.Decimal(10, 2)
  category    AddonCategory
  isActive    Boolean       @default(true)
  createdAt   DateTime      @default(now())

  bookingAddons BookingAddon[]

  @@map("addon_services")
}

model BookingAddon {
  id        String  @id @default(uuid())
  bookingId String
  addonId   String
  quantity  Int     @default(1)
  unitPrice Decimal @db.Decimal(10, 2)
  subtotal  Decimal @db.Decimal(10, 2)

  booking Booking      @relation(fields: [bookingId], references: [id])
  addon   AddonService @relation(fields: [addonId], references: [id])

  @@map("booking_addons")
}

model HousekeepingLog {
  id          String             @id @default(uuid())
  roomId      String
  updatedById String?
  status      HousekeepingStatus
  notes       String?
  checklist   Json               @default("[]")
  updatedAt   DateTime           @default(now())

  room      Room  @relation(fields: [roomId], references: [id])
  updatedBy User? @relation(fields: [updatedById], references: [id])

  @@map("housekeeping_logs")
}

model Notification {
  id        String              @id @default(uuid())
  bookingId String?
  type      NotificationType
  channel   NotificationChannel
  recipient String
  subject   String?
  body      String
  status    String              @default("pending")
  sentAt    DateTime?
  error     String?
  createdAt DateTime            @default(now())

  booking Booking? @relation(fields: [bookingId], references: [id])

  @@map("notifications")
}

model Review {
  id          String   @id @default(uuid())
  bookingId   String   @unique
  guestId     String
  rating      Int
  comment     String?
  isApproved  Boolean  @default(false)
  isPublished Boolean  @default(false)
  createdAt   DateTime @default(now())

  booking Booking @relation(fields: [bookingId], references: [id])
  guest   Guest   @relation(fields: [guestId], references: [id])

  @@map("reviews")
}

model AuditLog {
  id        String   @id @default(uuid())
  userId    String?
  action    String
  entity    String
  entityId  String?
  changes   Json?
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())

  user User? @relation(fields: [userId], references: [id])

  @@map("audit_logs")
}
```

---

## TASK 1E — Core Backend Files

### src/utils/ApiResponse.ts
```typescript
export class ApiResponse<T> {
  success: boolean
  data: T | null
  message: string
  meta?: object

  constructor(data: T | null, message = 'Success', meta?: object) {
    this.success = true
    this.data = data
    this.message = message
    if (meta) this.meta = meta
  }
}
```

### src/utils/ApiError.ts
```typescript
export class ApiError extends Error {
  statusCode: number
  code: string
  details?: object

  constructor(statusCode: number, code: string, message: string, details?: object) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }

  static badRequest(message: string, details?: object) {
    return new ApiError(400, 'BAD_REQUEST', message, details)
  }
  static unauthorized(message = 'Haujaidhinishwa') {
    return new ApiError(401, 'UNAUTHORIZED', message)
  }
  static forbidden(message = 'Huna ruhusa ya kufanya hivi') {
    return new ApiError(403, 'FORBIDDEN', message)
  }
  static notFound(message = 'Haikupatikana') {
    return new ApiError(404, 'NOT_FOUND', message)
  }
  static conflict(message: string) {
    return new ApiError(409, 'CONFLICT', message)
  }
  static internal(message = 'Hitilafu ya mfumo') {
    return new ApiError(500, 'INTERNAL_ERROR', message)
  }
}
```

### src/utils/asyncHandler.ts
```typescript
import { Request, Response, NextFunction } from 'express'

type AsyncFn = (req: Request, res: Response, next: NextFunction) => Promise<void>

export const asyncHandler = (fn: AsyncFn) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
```

### src/utils/generateRef.ts
```typescript
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
  return `SF-${year}-${num}`
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
```

### src/middleware/errorHandler.ts
```typescript
import { Request, Response, NextFunction } from 'express'
import { ApiError } from '../utils/ApiError'

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(`[ERROR] ${err.message}`, err.stack)

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      }
    })
  }

  // Prisma errors
  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    return res.status(409).json({
      success: false,
      error: { code: 'DB_ERROR', message: 'Database operation failed' }
    })
  }

  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Hitilafu ya mfumo — jaribu tena' }
  })
}
```

### src/middleware/authenticate.ts
```typescript
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { ApiError } from '../utils/ApiError'

export interface AuthRequest extends Request {
  user?: { id: string; role: string; hotelId: string; email: string }
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) throw ApiError.unauthorized()

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as {
      id: string; role: string; hotelId: string; email: string
    }
    req.user = decoded
    next()
  } catch {
    throw ApiError.unauthorized('Token imekwisha au si sahihi')
  }
}
```

### src/middleware/authorize.ts
```typescript
import { Response, NextFunction } from 'express'
import { AuthRequest } from './authenticate'
import { ApiError } from '../utils/ApiError'

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) throw ApiError.unauthorized()
    if (!roles.includes(req.user.role)) throw ApiError.forbidden()
    next()
  }
}
```

### src/app.ts
```typescript
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { errorHandler } from './middleware/errorHandler'

// Routes
import authRoutes from './routes/auth.routes'
import bookingRoutes from './routes/bookings.routes'
import roomRoutes from './routes/rooms.routes'
import guestRoutes from './routes/guests.routes'
import housekeepingRoutes from './routes/housekeeping.routes'

const app = express()

// Middleware
app.use(helmet())
app.use(cors({ origin: process.env.APP_URL || 'http://localhost:3000', credentials: true }))
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'StayFlow API', time: new Date().toISOString() })
})

// API Routes
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/bookings', bookingRoutes)
app.use('/api/v1/rooms', roomRoutes)
app.use('/api/v1/guests', guestRoutes)
app.use('/api/v1/housekeeping', housekeepingRoutes)

// Error handler (must be last)
app.use(errorHandler)

export default app
```

### src/server.ts
```typescript
import 'dotenv/config'
import app from './app'

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════╗
  ║   StayFlow API — Running      ║
  ║   Port: ${PORT}                   ║
  ║   Env:  ${process.env.NODE_ENV || 'development'}            ║
  ╚═══════════════════════════════╝
  `)
})
```

### .env (api):
```env
NODE_ENV=development
PORT=5000
APP_URL=http://localhost:3000

# Database — Tumia PostgreSQL ya local au Railway
DATABASE_URL=postgresql://postgres:password@localhost:5432/stayflow_db

# JWT
JWT_ACCESS_SECRET=stayflow_access_secret_change_this_in_production_min32chars
JWT_REFRESH_SECRET=stayflow_refresh_secret_change_this_in_production_min32chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Snippe (Primary Payment Gateway)
SNIPPE_API_KEY=
SNIPPE_WEBHOOK_SECRET=
SNIPPE_ENV=sandbox

# Default Hotel ID (v1.0 single tenant)
DEFAULT_HOTEL_ID=default-hotel-id
HOTEL_NAME=StayFlow Hotel
```

---

## TASK 1F — Database Setup (Windows)

### Option 1 — Docker (Rahisi zaidi, Windows)
```bash
# Install Docker Desktop kwanza: https://docker.com/products/docker-desktop
docker run --name stayflow-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=stayflow_db -p 5432:5432 -d postgres:15
docker run --name stayflow-redis -p 6379:6379 -d redis:7-alpine
```

### Option 2 — PostgreSQL Direct (Windows)
```
Download: https://www.postgresql.org/download/windows/
Install na default settings
Password: password (au chaguo lako — update DATABASE_URL)
Create database: stayflow_db
```

### Run migrations:
```bash
cd apps/api
npx prisma generate
npx prisma migrate dev --name init
```

---

## TASK 1G — Seed ya Kwanza

### src/prisma/seed.ts
```typescript
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding StayFlow database...')

  // 1. Create default hotel
  const hotel = await prisma.hotel.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      id: 'default-hotel-id',
      name: 'G4 Homez',
      slug: 'default',
      address: 'Kilakala, Morogoro, Tanzania',
      phone: '+255 XXX XXX XXX',
      email: 'booking@g4homez.com',
      wifiName: 'G4Homez_WiFi',
      wifiPassword: 'welcome2024',
      checkInTime: '14:00',
      checkOutTime: '11:00',
      defaultLanguage: 'sw',
      isActive: true,
    }
  })
  console.log('✅ Hotel created:', hotel.name)

  // 2. Create admin user
  const adminPassword = await bcrypt.hash('Admin@2026!', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@g4homez.com' },
    update: {},
    create: {
      hotelId: hotel.id,
      fullName: 'Administrator',
      email: 'admin@g4homez.com',
      passwordHash: adminPassword,
      role: 'admin',
      isActive: true,
    }
  })
  console.log('✅ Admin created:', admin.email)

  // 3. Create receptionist
  const recepPassword = await bcrypt.hash('Recep@2026!', 12)
  await prisma.user.upsert({
    where: { email: 'reception@g4homez.com' },
    update: {},
    create: {
      hotelId: hotel.id,
      fullName: 'Receptionist',
      email: 'reception@g4homez.com',
      passwordHash: recepPassword,
      role: 'receptionist',
      isActive: true,
    }
  })
  console.log('✅ Receptionist created')

  // 4. Create rooms
  const rooms = [
    {
      hotelId: hotel.id,
      roomNumber: '111',
      name: 'New Cottage Room',
      floor: 1,
      type: 'deluxe' as const,
      status: 'available' as const,
      pricePerNight: 80000,
      capacity: 2,
      amenities: ['WiFi', 'AC', 'Smart TV (DSTV)', 'Breakfast', 'Balcony', 'Bafu binafsi'],
    },
    {
      hotelId: hotel.id,
      roomNumber: '108',
      name: 'Mountain View Room',
      floor: 1,
      type: 'superior' as const,
      status: 'available' as const,
      pricePerNight: 75000,
      capacity: 2,
      amenities: ['WiFi', 'AC', 'Smart TV', 'Buffet Breakfast', 'Balcony', 'Mtazamo wa Milima', 'Bafu binafsi'],
    },
    {
      hotelId: hotel.id,
      roomNumber: '109',
      name: 'Mountain View Room',
      floor: 1,
      type: 'superior' as const,
      status: 'available' as const,
      pricePerNight: 75000,
      capacity: 2,
      amenities: ['WiFi', 'AC', 'Smart TV', 'Buffet Breakfast', 'Balcony', 'Mtazamo wa Milima', 'Bafu binafsi'],
    },
    {
      hotelId: hotel.id,
      roomNumber: 'CONF',
      name: 'Main Conference Room',
      floor: 1,
      type: 'conference' as const,
      status: 'available' as const,
      pricePerNight: 70000,
      pricePerHour: 10000,
      capacity: 25,
      amenities: ['WiFi', 'AC', 'TV', 'Parking', 'Ulinzi', 'Mgahawa'],
    },
  ]

  for (const room of rooms) {
    await prisma.room.upsert({
      where: { hotelId_roomNumber: { hotelId: hotel.id, roomNumber: room.roomNumber } },
      update: {},
      create: room,
    })
    console.log(`✅ Room ${room.roomNumber} created: ${room.name}`)
  }

  // 5. Create addon services
  const addons = [
    { name: 'Chakula cha Asubuhi (Ziada)', nameEn: 'Extra Breakfast', price: 15000, category: 'food' as const },
    { name: 'Chakula cha Mchana', nameEn: 'Lunch', price: 20000, category: 'food' as const },
    { name: 'Chakula cha Jioni', nameEn: 'Dinner', price: 25000, category: 'food' as const },
    { name: 'Kinywaji (Bar)', nameEn: 'Beverage (Bar)', price: 5000, category: 'beverage' as const },
    { name: 'Usafiri wa Uwanja wa Ndege', nameEn: 'Airport Transfer', price: 50000, category: 'transport' as const },
    { name: 'Dobi (Laundry)', nameEn: 'Laundry Service', price: 10000, category: 'laundry' as const },
  ]

  for (const addon of addons) {
    await prisma.addonService.create({ data: addon }).catch(() => {})
    console.log(`✅ Addon: ${addon.name}`)
  }

  console.log('\n🎉 Seeding completed!')
  console.log('\n📋 Login credentials:')
  console.log('   Admin:       admin@g4homez.com / Admin@2026!')
  console.log('   Receptionist: reception@g4homez.com / Recep@2026!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

```bash
# Run seed
npm run db:seed
```

---

## TASK 1H — Verify Setup

Run hii yote na angalia hakuna errors:

```bash
# Terminal 1 — API
cd apps/api
npm run dev
# Unapaswa kuona: StayFlow API — Running on Port 5000

# Terminal 2 — Test health
curl http://localhost:5000/health
# Expected: {"status":"OK","service":"StayFlow API"}

# Terminal 3 — Web
cd apps/web
npm run dev
# Unapaswa kuona: Next.js running on http://localhost:3000
```

---

## CHECKPOINT — Kabla ya Kuendelea na Task 2

Angalia hivi vyote vimefanya kazi:
- [ ] `npm run dev` kwenye api inafanya kazi bila errors
- [ ] `npm run dev` kwenye web inafanya kazi
- [ ] `http://localhost:5000/health` inarudisha JSON
- [ ] `http://localhost:3000` inafungua Next.js
- [ ] Database ina tables (angalia kwa `npx prisma studio`)
- [ ] Seed ilifanya kazi — rooms 4 zipo kwenye DB

Ukikwama mahali — rudi kwa Claude na niambie error unayoona.

---

*StayFlow Phase 1 Task 1 — Version 2.0*
*Next: Task 2 — Authentication (Login + JWT)*
