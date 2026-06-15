# STAYFLOW RMS — MASTER PROJECT RULES
> Version 2.0 | Juni 2026 | APPROVED — Development starts  
> Hati hii inasimamia maendeleo yote ya mfumo wa StayFlow.  
> AI yoyote, developer yoyote anayefanya kazi kwenye mradi huu LAZIMA afuate rules zote zilizomo hapa.

---

## TABLE OF CONTENTS
1. [Project Overview](#1-project-overview)
2. [Tech Stack — Final Decisions](#2-tech-stack--final-decisions)
3. [Folder & File Structure](#3-folder--file-structure)
4. [Database Schema — Full Definition](#4-database-schema--full-definition)
5. [Design System & UI Rules](#5-design-system--ui-rules)
6. [Feature Specifications](#6-feature-specifications)
7. [API Structure & Naming Conventions](#7-api-structure--naming-conventions)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Payment Integration Rules](#9-payment-integration-rules)
10. [Notification System](#10-notification-system)
11. [PDF Receipt Rules](#11-pdf-receipt-rules)
12. [Environment Variables](#12-environment-variables)
13. [Development Phases & Checklist](#13-development-phases--checklist)
14. [Code Quality Rules](#14-code-quality-rules)
15. [Deployment Rules](#15-deployment-rules)

---

## 1. PROJECT OVERVIEW

```
Product Name  : StayFlow
Type          : Reservation Management System (RMS)
Target        : Hotels, Lodges, Guesthouses — East Africa (Tanzania focus)
Languages     : Swahili (default) + English (toggle)
Currency      : TZS (Tanzania Shillings) — no decimal display (e.g. TZS 80,000)
Date Format   : DD/MM/YYYY
Time Format   : 24hr (e.g. 14:00)
Timezone      : Africa/Dar_es_Salaam (UTC+3)
```

### Business Model
```
Type          : SaaS — Software as a Service (License model)
Client pays   : Setup fee (one-time) + Monthly subscription
Setup fee     : TZS 3,000,000 (first client) — increases with portfolio
Subscription  : TZS 150,000/mwezi (includes hosting, maintenance, updates, support)
IP Ownership  : Code belongs to StayFlow developer — client gets LICENSE to use
Data Ownership: Client owns their hotel/guest data — developer never sells or shares it
SLA Uptime    : 99% monthly | Response time: 4hrs business hours | Payments: 8hrs any time
```

### User Roles (3 types)
| Role | Access Level | Description |
|------|-------------|-------------|
| `admin` | Full access | Mmiliki / Meneja — manages everything |
| `receptionist` | Operational | Check-in, check-out, bookings, payments |
| `housekeeping` | Limited | Room status updates only |

---

## 2. TECH STACK — FINAL DECISIONS

> ⚠️ NEVER suggest changing the tech stack without updating this file first.

### Frontend
```
Framework     : Next.js 14 (App Router)
Language      : TypeScript (strict mode)
Styling       : Tailwind CSS v3
UI Components : shadcn/ui (base components)
Icons         : Lucide React
Charts        : Recharts
PDF Viewer    : @react-pdf/renderer
Forms         : React Hook Form + Zod validation
State         : Zustand (global) + React Query (server state)
Date handling : date-fns (NOT moment.js)
HTTP Client   : Axios with interceptors
```

### Backend
```
Runtime       : Node.js v20 LTS
Framework     : Express.js
Language      : TypeScript
ORM           : Prisma
Validation    : Zod
Auth          : JWT (access token 15min + refresh token 7days)
File Upload   : Multer + Cloudinary
PDF Generator : Puppeteer (server-side PDF generation)
Email         : Nodemailer + SendGrid
SMS           : AfricasTalking API
```

### Database
```
Primary DB    : PostgreSQL 15
Cache         : Redis (sessions + rate limiting)
File Storage  : Cloudinary (images, PDF receipts)
```

### Payment Gateways
```
Primary       : Snippe API (snippe.sh) — M-Pesa, Airtel Money, Halo Pesa, Mixx by Yas, Visa, Mastercard
Fallback (B)  : Pesapal API v3 — activate ONLY if Snippe rejects client application OR Tigo Pesa required
Tigo Pesa     : Direct Tigo API (v2 plugin) — if client specifically needs Tigo support
```

### DevOps
```
Frontend Host : Vercel (Edge Network — closest to user)
Backend Host  : Railway (region: eu-west — closest available to Tanzania)
DB Host       : Railway PostgreSQL (eu-west) OR migrate to AWS af-south-1 (Cape Town) for data residency
Redis Host    : Railway Redis
Images        : Cloudinary
CI/CD         : GitHub Actions
Repo          : GitHub (mono-repo structure)
```
> ⚠️ DATA RESIDENCY: Guest passport/ID data should ideally stay on African servers.
> AWS af-south-1 (Cape Town) is the closest compliant option — TZS ~8,000/mwezi.
> Start with Railway eu-west (cheaper), migrate to af-south-1 when client asks or legal requires.

---

## 3. FOLDER & FILE STRUCTURE

```
stayflow/
├── apps/
│   ├── web/                          # Next.js Frontend
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── layout.tsx
│   │   │   ├── (dashboard)/          # Staff & Admin pages
│   │   │   │   ├── layout.tsx        # Sidebar + Header layout
│   │   │   │   ├── overview/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── reservations/
│   │   │   │   │   ├── page.tsx      # All reservations list
│   │   │   │   │   ├── new/
│   │   │   │   │   │   └── page.tsx  # New booking form
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx  # Booking detail
│   │   │   │   ├── guests/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── rooms/
│   │   │   │   │   ├── page.tsx      # Room grid (floor view)
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── housekeeping/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── accounting/
│   │   │   │   │   ├── expenses/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── revenue/
│   │   │   │   │       └── page.tsx
│   │   │   │   └── settings/
│   │   │   │       └── page.tsx
│   │   │   ├── (guest-portal)/       # Self-service guest pages
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── book/
│   │   │   │   │   └── page.tsx      # Public booking page
│   │   │   │   ├── my-bookings/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── receipt/
│   │   │   │       └── [id]/
│   │   │   │           └── page.tsx
│   │   │   ├── api/                  # Next.js API routes (webhooks only)
│   │   │   │   └── webhooks/
│   │   │   │       └── pesapal/
│   │   │   │           └── route.ts
│   │   │   └── layout.tsx            # Root layout
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn base components (DO NOT EDIT)
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   └── MobileNav.tsx
│   │   │   ├── reservations/
│   │   │   │   ├── BookingTable.tsx
│   │   │   │   ├── BookingCard.tsx
│   │   │   │   ├── NewBookingModal.tsx
│   │   │   │   ├── BookingStatusBadge.tsx
│   │   │   │   └── AvailabilityCalendar.tsx
│   │   │   ├── rooms/
│   │   │   │   ├── RoomGrid.tsx
│   │   │   │   ├── RoomCard.tsx
│   │   │   │   ├── RoomDetailModal.tsx
│   │   │   │   └── FloorSelector.tsx
│   │   │   ├── payments/
│   │   │   │   ├── PaymentForm.tsx
│   │   │   │   ├── PaymentMethodSelector.tsx
│   │   │   │   └── ReceiptPreview.tsx
│   │   │   ├── guests/
│   │   │   │   ├── GuestForm.tsx
│   │   │   │   └── GuestSearchInput.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── StatsCard.tsx
│   │   │   │   ├── OccupancyChart.tsx
│   │   │   │   ├── RevenueChart.tsx
│   │   │   │   └── ArrivalsTable.tsx
│   │   │   └── shared/
│   │   │       ├── LanguageToggle.tsx
│   │   │       ├── LoadingSpinner.tsx
│   │   │       ├── EmptyState.tsx
│   │   │       ├── ConfirmDialog.tsx
│   │   │       └── DataTable.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useBookings.ts
│   │   │   ├── useRooms.ts
│   │   │   ├── useGuests.ts
│   │   │   ├── usePayments.ts
│   │   │   └── useLanguage.ts
│   │   ├── lib/
│   │   │   ├── api.ts                # Axios instance + interceptors
│   │   │   ├── auth.ts               # Auth helpers
│   │   │   ├── utils.ts              # General utilities
│   │   │   ├── formatters.ts         # Date, currency, phone formatters
│   │   │   └── validators.ts         # Zod schemas (frontend)
│   │   ├── store/
│   │   │   ├── authStore.ts          # Zustand: user session
│   │   │   ├── uiStore.ts            # Zustand: sidebar, modals
│   │   │   └── bookingStore.ts       # Zustand: active booking flow
│   │   ├── locales/
│   │   │   ├── sw.json               # Kiswahili strings
│   │   │   └── en.json               # English strings
│   │   ├── types/
│   │   │   ├── booking.ts
│   │   │   ├── room.ts
│   │   │   ├── guest.ts
│   │   │   ├── payment.ts
│   │   │   └── user.ts
│   │   ├── public/
│   │   │   ├── logo.svg
│   │   │   └── favicon.ico
│   │   ├── .env.local                # ⚠️ NEVER commit this file
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   └── tsconfig.json
│   │
│   └── api/                          # Express Backend
│       ├── src/
│       │   ├── routes/
│       │   │   ├── auth.routes.ts
│       │   │   ├── bookings.routes.ts
│       │   │   ├── rooms.routes.ts
│       │   │   ├── guests.routes.ts
│       │   │   ├── payments.routes.ts
│       │   │   ├── housekeeping.routes.ts
│       │   │   ├── reports.routes.ts
│       │   │   ├── reviews.routes.ts
│       │   │   └── settings.routes.ts
│       │   ├── controllers/
│       │   │   ├── auth.controller.ts
│       │   │   ├── bookings.controller.ts
│       │   │   ├── rooms.controller.ts
│       │   │   ├── guests.controller.ts
│       │   │   ├── payments.controller.ts
│       │   │   ├── housekeeping.controller.ts
│       │   │   ├── reports.controller.ts
│       │   │   └── reviews.controller.ts
│       │   ├── services/
│       │   │   ├── auth.service.ts
│       │   │   ├── bookings.service.ts
│       │   │   ├── availability.service.ts   # Core overlap-check logic
│       │   │   ├── rooms.service.ts
│       │   │   ├── guests.service.ts
│       │   │   ├── payments.service.ts
│       │   │   ├── snippe.service.ts         # PRIMARY payment gateway
│       │   │   ├── pesapal.service.ts        # FALLBACK (B) — activate if needed
│       │   │   ├── mpesa.service.ts          # Daraja STK push
│       │   │   ├── pdf.service.ts            # Receipt PDF generation
│       │   │   ├── email.service.ts          # SendGrid
│       │   │   ├── sms.service.ts            # AfricasTalking
│       │   │   ├── housekeeping.service.ts
│       │   │   └── reports.service.ts
│       │   ├── middleware/
│       │   │   ├── authenticate.ts           # JWT verify
│       │   │   ├── authorize.ts              # Role check
│       │   │   ├── validate.ts               # Zod request validation
│       │   │   ├── rateLimiter.ts            # Redis rate limiting
│       │   │   ├── auditLog.ts               # Auto-log all mutations
│       │   │   └── errorHandler.ts           # Global error handler
│       │   ├── prisma/
│       │   │   ├── schema.prisma             # Single source of truth for DB
│       │   │   ├── migrations/               # Auto-generated by prisma migrate
│       │   │   └── seed.ts                   # Initial data seeding
│       │   ├── jobs/                         # Background jobs (cron)
│       │   │   ├── sendReviewLinks.job.ts    # Daily: send review links
│       │   │   ├── sendReminders.job.ts      # Day before check-in reminder
│       │   │   └── autoCheckout.job.ts       # Mark overdue as Late CO
│       │   ├── utils/
│       │   │   ├── asyncHandler.ts
│       │   │   ├── ApiError.ts
│       │   │   ├── ApiResponse.ts
│       │   │   ├── generateRef.ts            # Booking ref generator
│       │   │   └── formatters.ts
│       │   ├── types/
│       │   │   └── index.ts
│       │   ├── app.ts                        # Express app setup
│       │   └── server.ts                     # Entry point
│       ├── .env                              # ⚠️ NEVER commit this file
│       ├── package.json
│       └── tsconfig.json
│
├── .github/
│   └── workflows/
│       ├── deploy-web.yml
│       └── deploy-api.yml
├── .gitignore
├── package.json                      # Root package.json (workspaces)
├── README.md
└── STAYFLOW_MASTER_RULES.md          # This file — always at root
```

---

## 4. DATABASE SCHEMA — FULL DEFINITION

> Source of truth: `apps/api/src/prisma/schema.prisma`  
> Run `npx prisma migrate dev` after ANY schema change.  
> NEVER edit the database directly — always use migrations.

### 4.1 Enums

```prisma
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
  available      // Inapatikana
  occupied       // Imejazwa
  dirty          // Inahitaji kusafishwa
  cleaning       // Inasafishwa
  maintenance    // Matengenezo
  blocked        // Imezuiwa na admin
}

enum BookingStatus {
  pending        // Booking ipo, malipo hayajakamilika
  confirmed      // Malipo yamefanywa
  checked_in     // Mgeni amewasili
  checked_out    // Mgeni ameondoka
  cancelled      // Booking imefutwa
  no_show        // Mgeni hakuja
  late_checkout  // Checkout imechelewa
}

enum BookingSource {
  online_self    // Guest alihifadhi mwenyewe
  staff_entry    // Receptionist aliweka
  walk_in        // Walk-in bila advance booking
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
  partial        // Deposit tu imelipwa
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
  food           // Restaurant
  beverage       // Bar
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
```

### 4.2 Tables (Prisma Schema)

```prisma
model User {
  id           String    @id @default(uuid())
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
  email       String?  @unique
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
  id             String     @id @default(uuid())
  roomNumber     String     @unique  // e.g. "111", "108"
  name           String               // e.g. "Cottage Room", "Mountain View"
  floor          Int        @default(1)
  type           RoomType
  status         RoomStatus @default(available)
  pricePerNight  Decimal    @db.Decimal(10,2)
  pricePerHour   Decimal?   @db.Decimal(10,2)  // Conference rooms only
  capacity       Int        @default(2)
  description    String?
  amenities      Json       @default("[]")   // ["WiFi","AC","Smart TV","Breakfast"]
  images         Json       @default("[]")   // Array of Cloudinary URLs
  isActive       Boolean    @default(true)
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  bookings        Booking[]
  housekeepingLogs HousekeepingLog[]

  @@map("rooms")
}

model Booking {
  id             String        @id @default(uuid())
  bookingRef     String        @unique  // e.g. "SF-2026-001"
  guestId        String
  roomId         String
  createdById    String
  source         BookingSource @default(staff_entry)
  status         BookingStatus @default(pending)

  // Dates
  checkIn        DateTime      // Date only (midnight)
  checkOut       DateTime      // Date only (midnight)
  startTime      String?       // For conference: "09:00"
  endTime        String?       // For conference: "17:00"
  actualCheckIn  DateTime?     // Real timestamp when checked in
  actualCheckOut DateTime?     // Real timestamp when checked out

  // Guests count
  adults         Int           @default(1)
  children       Int           @default(0)

  // Financials
  roomTotal      Decimal       @db.Decimal(10,2)
  addonsTotal    Decimal       @db.Decimal(10,2)  @default(0)
  discountAmount Decimal       @db.Decimal(10,2)  @default(0)
  totalAmount    Decimal       @db.Decimal(10,2)  // Final amount
  paidAmount     Decimal       @db.Decimal(10,2)  @default(0)
  balanceDue     Decimal       @db.Decimal(10,2)  // totalAmount - paidAmount

  specialRequests String?
  internalNotes   String?
  cancelReason    String?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  guest        Guest          @relation(fields: [guestId], references: [id])
  room         Room           @relation(fields: [roomId], references: [id])
  createdBy    User           @relation("CreatedBy", fields: [createdById], references: [id])
  payments     Payment[]
  receipts     Receipt[]
  addons       BookingAddon[]
  notifications Notification[]
  review       Review?

  @@map("bookings")
}

model Payment {
  id            String        @id @default(uuid())
  bookingId     String
  receivedById  String?
  amount        Decimal       @db.Decimal(10,2)
  method        PaymentMethod
  status        PaymentStatus @default(pending)

  // Gateway references
  snippeRef     String?       // Snippe payment reference (primary)
  pesapalRef    String?       // Pesapal reference (fallback B)
  mpesaRef      String?       // M-Pesa confirmation code
  phoneNumber   String?       // Phone used for mobile payment
  bankRef       String?       // Bank transfer reference

  notes         String?
  paidAt        DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

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
  receiptNumber String   @unique  // e.g. "RCP-2026-001"
  pdfUrl        String   // Cloudinary URL
  issuedAt      DateTime @default(now())

  booking  Booking  @relation(fields: [bookingId], references: [id])
  payment  Payment  @relation(fields: [paymentId], references: [id])
  issuedBy User?    @relation(fields: [issuedById], references: [id])

  @@map("receipts")
}

model AddonService {
  id          String        @id @default(uuid())
  name        String
  nameEn      String        // English name
  description String?
  price       Decimal       @db.Decimal(10,2)
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
  unitPrice Decimal @db.Decimal(10,2)  // Snapshot of price at time of booking
  subtotal  Decimal @db.Decimal(10,2)

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
  checklist   Json               @default("[]")  // Array of {task, done}
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
  recipient String              // email or phone number
  subject   String?
  body      String
  status    String              @default("pending") // pending | sent | failed
  sentAt    DateTime?
  error     String?
  createdAt DateTime            @default(now())

  booking Booking? @relation(fields: [bookingId], references: [id])

  @@map("notifications")
}

model Review {
  id            String   @id @default(uuid())
  bookingId     String   @unique
  guestId       String
  rating        Int      // 1-5
  comment       String?
  isApproved    Boolean  @default(false)
  isPublished   Boolean  @default(false)
  reviewedAt    DateTime?
  createdAt     DateTime @default(now())

  booking Booking @relation(fields: [bookingId], references: [id])
  guest   Guest   @relation(fields: [guestId], references: [id])

  @@map("reviews")
}

model AuditLog {
  id         String   @id @default(uuid())
  userId     String?
  action     String   // e.g. "booking.created", "payment.recorded", "room.updated"
  entity     String   // e.g. "booking", "room", "user"
  entityId   String?
  changes    Json?    // { before: {}, after: {} }
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now())

  user User? @relation(fields: [userId], references: [id])

  @@map("audit_logs")
}

model SystemSettings {
  id              String  @id @default("singleton")
  hotelName       String  @default("StayFlow Hotel")
  hotelAddress    String?
  hotelPhone      String?
  hotelEmail      String?
  logoUrl         String?
  currency        String  @default("TZS")
  checkInTime     String  @default("14:00")
  checkOutTime    String  @default("11:00")
  defaultLanguage String  @default("sw")
  snippeApiKey    String?       // PRIMARY gateway
  snippeWebhookSecret String?
  pesapalKey      String?       // FALLBACK (B)
  pesapalSecret   String?
  updatedAt       DateTime @updatedAt

  @@map("system_settings")
}
```

### 4.3 Critical Database Rules
- NEVER delete records — use soft delete with `isActive = false` or `status = cancelled`
- ALWAYS use transactions (`prisma.$transaction`) when: creating booking + updating room status, recording payment + generating receipt
- Availability check MUST use this query pattern (overlap detection):
```sql
-- A room is unavailable if any booking overlaps the requested dates
WHERE roomId = :roomId
AND status NOT IN ('cancelled', 'no_show', 'checked_out')
AND checkIn < :requestedCheckOut
AND checkOut > :requestedCheckIn
```
- `balanceDue` on Booking MUST be recalculated after every payment: `balanceDue = totalAmount - paidAmount`
- `bookingRef` format: `SF-YYYY-XXX` (e.g. SF-2026-001) — sequential per year
- `receiptNumber` format: `RCP-YYYY-XXX` — sequential per year

---

## 5. DESIGN SYSTEM & UI RULES

> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> DESIGN REFERENCE — MANDATORY. Read before writing any UI code.
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
>
> Primary Reference : YowStay Hotel Management Dashboard
> Dribbble Link     : https://dribbble.com/shots/25764240-YowStay-Hotel-Management-Dashboard
> Designer Profile  : https://dribbble.com/yowdesain
>
> STUDY THE DESIGN BEFORE WRITING ANY COMPONENT.
> If you are unsure about a UI decision — go back to this reference.
>
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> WHAT THIS DESIGN IS:
>   ✅ Clean white/light-gray backgrounds
>   ✅ Blue (#2563EB) as the ONLY accent color
>   ✅ Subtle card shadows — not heavy borders
>   ✅ Inter font — professional, readable
>   ✅ Data-first layout — information is hero
>   ✅ Small, meaningful status badges
>   ✅ Room grid with visual floor plan feel
>   ✅ Natural, professional hotel PMS aesthetic
>
> WHAT THIS DESIGN IS NOT:
>   ❌ NO purple — not even a hint
>   ❌ NO gradients — anywhere
>   ❌ NO dark mode as default
>   ❌ NO heavy drop shadows
>   ❌ NO colorful backgrounds on cards
>   ❌ NO bold/thick borders on components
>   ❌ NO flashy animations or transitions > 200ms
>   ❌ NO AI-generic aesthetic (avoid generic SaaS look)
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 5.1 Color Palette
> Extracted from YowStay design reference — use EXACTLY these values
> Reference: https://dribbble.com/shots/25764240-YowStay-Hotel-Management-Dashboard

```css
/* ─── PRIMARY — Blue only. No purple. No gradient. ─── */
--color-primary:       #2563EB;   /* Blue — CTA buttons, active nav, links */
--color-primary-hover: #1D4ED8;   /* Darker blue on hover */
--color-primary-light: #EFF6FF;   /* Very light blue — active sidebar bg */
--color-primary-muted: #DBEAFE;   /* Light blue — occupied room cards */

/* ─── BACKGROUNDS ─── */
--color-bg-page:    #F8F9FA;      /* Page background — very light gray */
--color-bg-surface: #FFFFFF;      /* Cards, sidebar, modals — pure white */
--color-bg-subtle:  #F3F4F6;      /* Table header, input bg, hover rows */
--color-bg-muted:   #F9FAFB;      /* Cancelled status bg, empty states */

/* ─── BORDERS ─── */
--color-border:       #E5E7EB;    /* Default border — cards, inputs, dividers */
--color-border-light: #F3F4F6;    /* Subtle border — table rows */

/* ─── TEXT ─── */
--color-text-primary:   #111827;  /* Headings, important data */
--color-text-secondary: #6B7280;  /* Labels, subtext, descriptions */
--color-text-muted:     #9CA3AF;  /* Placeholders, disabled, timestamps */
--color-text-link:      #2563EB;  /* Links, clickable text */

/* ─── BOOKING STATUS BADGES ─── */
/* Small pill badges — light background, colored text */
--color-status-checkedin:    #10B981; /* Green text */
--color-status-checkedin-bg: #ECFDF5; /* Green light bg */
--color-status-arriving:     #2563EB; /* Blue text */
--color-status-arriving-bg:  #EFF6FF; /* Blue light bg */
--color-status-pending:      #D97706; /* Amber text */
--color-status-pending-bg:   #FFFBEB; /* Amber light bg */
--color-status-lateco:       #DC2626; /* Red text */
--color-status-lateco-bg:    #FEF2F2; /* Red light bg */
--color-status-cancelled:    #6B7280; /* Gray text */
--color-status-cancelled-bg: #F9FAFB; /* Gray light bg */
--color-status-confirmed:    #2563EB; /* Blue text */
--color-status-confirmed-bg: #EFF6FF; /* Blue light bg */

/* ─── ROOM STATUS COLORS (Grid view) ─── */
--color-room-available:    #ECFDF5;   /* Light green — empty, clean */
--color-room-occupied:     #DBEAFE;   /* Light blue — guest inside */
--color-room-dirty:        #FFFBEB;   /* Light amber — needs cleaning */
--color-room-cleaning:     #E0E7FF;   /* Light indigo — being cleaned */
--color-room-maintenance:  #FEF2F2;   /* Light red — out of order */
--color-room-dnd:          #374151;   /* Dark gray text — Do Not Disturb */
--color-room-booked:       #EFF6FF;   /* Light blue — upcoming booking */

/* ─── SEMANTIC COLORS ─── */
--color-success: #10B981;
--color-warning: #F59E0B;
--color-danger:  #EF4444;
--color-info:    #2563EB;

/* ─── SHADOWS (subtle — YowStay style) ─── */
--shadow-card: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
--shadow-modal: 0 10px 25px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.04);
--shadow-dropdown: 0 4px 6px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.04);

/* Neutrals */
--color-bg: #F8F9FA;             /* Page background */
--color-surface: #FFFFFF;        /* Cards, sidebar */
--color-border: #E5E7EB;         /* Borders */
--color-text-primary: #111827;   /* Headings */
--color-text-secondary: #6B7280; /* Subtext, labels */
--color-text-muted: #9CA3AF;     /* Placeholders */

/* Status Colors — Booking Status */
--color-checked-in: #10B981;    /* Green */
--color-checked-in-bg: #ECFDF5;
--color-arriving: #2563EB;      /* Blue */
--color-arriving-bg: #EFF6FF;
--color-pending: #F59E0B;       /* Amber */
--color-pending-bg: #FFFBEB;
--color-late-co: #EF4444;       /* Red */
--color-late-co-bg: #FEF2F2;
--color-cancelled: #6B7280;     /* Gray */
--color-cancelled-bg: #F9FAFB;

/* Room Status Colors */
--color-room-available: #FFFFFF;
--color-room-occupied: #DBEAFE;   /* Light blue */
--color-room-dirty: #FEF3C7;      /* Light amber */
--color-room-cleaning: #E0E7FF;   /* Light purple */
--color-room-maintenance: #FEE2E2; /* Light red */
--color-room-dnd: #4B5563;        /* Dark gray — Do Not Disturb */
```

### 5.2 Typography
> YowStay uses Inter throughout — clean, no serif, no display fonts
```css
Font Family  : Inter (Google Fonts) — ONLY font allowed
Font Import  : https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap

--font-size-xs:   11px;  /* Timestamps, meta labels */
--font-size-sm:   12px;  /* Table cell secondary info, badges */
--font-size-base: 13px;  /* Table cells, sidebar items, form labels */
--font-size-md:   14px;  /* Default body text, descriptions */
--font-size-lg:   15px;  /* Section labels, card titles */
--font-size-xl:   16px;  /* Page subtitles */
--font-size-2xl:  18px;  /* Page titles */
--font-size-3xl:  22px;  /* Stat card numbers */
--font-size-4xl:  28px;  /* Dashboard hero numbers */

/* Font weights */
--font-normal:  400;  /* Body text */
--font-medium:  500;  /* Labels, nav items, table headers */
--font-semibold: 600; /* Card titles, section headers */
--font-bold:    700;  /* Page titles, stat numbers */

/* Line heights */
--leading-tight:  1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
```

### 5.3 Layout Rules
> Measured from YowStay reference design screenshots
```
/* ─── STRUCTURAL ─── */
Sidebar width          : 220px fixed | collapsed: 64px (icon only)
Sidebar bg             : #FFFFFF (white) — NOT gray
Header height          : 56px
Header bg              : #FFFFFF with bottom border #E5E7EB
Content area padding   : 24px all sides
Content max-width      : 1280px (centered on large screens)
Page title margin-bottom: 24px

/* ─── CARDS ─── */
Card border-radius     : 12px
Card background        : #FFFFFF
Card border            : 1px solid #E5E7EB (subtle)
Card shadow            : 0 1px 3px rgba(0,0,0,0.06)
Card padding           : 20px 24px
Stats card height      : 100px

/* ─── FORMS & INPUTS ─── */
Input border-radius    : 8px
Input border           : 1px solid #E5E7EB
Input focus border     : #2563EB (blue)
Input padding          : 8px 12px
Input font-size        : 14px

/* ─── BUTTONS ─── */
Button border-radius   : 8px
Primary button bg      : #2563EB
Primary button text    : #FFFFFF
Secondary button bg    : #F3F4F6
Secondary button text  : #374151
Button padding         : 8px 16px (default), 6px 12px (sm)

/* ─── MODALS ─── */
Modal border-radius    : 16px
Modal shadow           : 0 10px 25px rgba(0,0,0,0.08)
Modal max-width sm     : 480px
Modal max-width md     : 560px
Modal max-width lg     : 720px
Modal padding          : 24px

/* ─── TABLES ─── */
Table header bg        : #F9FAFB
Table header text      : #6B7280, font-weight: 500, font-size: 12px, UPPERCASE
Table row height       : 52px
Table row hover        : #F9FAFB
Table border           : 1px solid #F3F4F6 (very subtle)
Table cell font-size   : 14px
Table cell color       : #111827

/* ─── ROOM GRID ─── */
Room card size         : ~100px x 80px
Room card radius       : 10px
Room card number       : font-size 15px, font-weight 600
Room card guest name   : font-size 11px, truncated
Grid gap               : 8px
Floor selector         : top-right dropdown
```

### 5.4 Sidebar Navigation Structure
```
[Logo / Brand]
[User Avatar + Name + Role]
─────────────────────
DAILY OPERATION
  📊 Overview
  📋 Reservations   [badge: pending count]
  👥 Guests
  🚪 Rooms
  🧹 Housekeeping
─────────────────────
ACCOUNTING
  💰 Expense Tracking
  📈 Revenue Management
─────────────────────
SYSTEM OPTION
  ⚙️ Settings
  🚪 Log out
```

### 5.5 Booking Status Badges
| Status | Label (SW) | Label (EN) | Color |
|--------|-----------|-----------|-------|
| `pending` | Inasubiri | Pending | Amber |
| `confirmed` | Imethibitishwa | Confirmed | Blue |
| `checked_in` | Amewasili | Checked In | Green |
| `arriving_today` | Anafika Leo | Arriving Today | Blue (pulse) |
| `checked_out` | Ameondoka | Checked Out | Gray |
| `late_checkout` | CO Marehemu | Late CO | Red |
| `cancelled` | Imefutwa | Cancelled | Gray |
| `no_show` | Hakuja | No Show | Red |

### 5.5b Stat Cards (Dashboard) — YowStay Style
```
Layout        : 4 cards in a row (grid-cols-4)
Each card     : White bg, subtle border, 12px radius
Content       : Icon (top-left, 32px, light colored bg circle)
                Label (gray, 12px, uppercase)
                Number (28px, bold, dark)
                Trend (green ↑ or red ↓, 12px, vs last period)
                Sparkline chart (small, right side — recharts)
NO            : Colored card backgrounds, gradients, heavy shadows
```

### 5.5c Booking Table — YowStay Style
```
Columns       : Full Name | Order No. | Room | Check In | Day | Guests | Origins | Status
Row height    : 52px
Name cell     : Avatar (32px circle, initials) + Full name
Order No      : Monospace-style, gray
Status badge  : Small pill — colored text on light bg (NO filled badges)
Arriving today: Blue badge with subtle pulse dot
Late CO       : Red badge — "Late CO" text
Search        : Top-right, with floor/filter dropdown
New booking   : Blue button top-right "+ New Booking"
```

### 5.5d Sidebar Navigation — YowStay Style
```
Background    : #FFFFFF (pure white)
Width         : 220px
User section  : Top — avatar (40px) + name + role + chevron
Section labels: "DAILY OPERATION", "ACCOUNTING" — 10px, uppercase, gray, font-weight 500
Nav items     : Icon (18px, gray) + Label (14px, gray-700)
Active item   : Blue-light bg (#EFF6FF) + blue text (#2563EB) + blue left border (2px)
Hover item    : #F9FAFB bg
Badge         : Small red circle number (pending count) — top-right of nav item
Bottom items  : "Settings", "Log out" — separated by divider
Logo area     : Top — "StayFlow" wordmark or hotel logo
```

### 5.6 Room Grid View Rules (Rooms page)
- Display as grid — 6 columns desktop, 4 tablet, 2 mobile
- Each room card shows: Room number (large), Guest name (if occupied), Check-in/out dates, Status color, Action icons (check-in, checkout, housekeeping)
- Filter by floor using dropdown (matches reference design)
- Click room card → opens Room Detail Modal
- Room Detail Modal shows: Room info, Current guest, Housekeeping checklist, Assigned staff

### 5.7 UI Component Rules
- ALWAYS use shadcn/ui as base — never write custom input/button/dialog from scratch
- Loading states: Use skeleton loaders, not spinners, for table data
- Empty states: Always show illustration + helpful message, never blank
- Forms: Inline validation on blur, submit validation on attempt
- Modals: Always trap focus, ESC to close, backdrop click to close
- Tables: Sortable columns, search/filter, pagination (20 rows default)
- Mobile: All pages must work on 375px+ screens (sidebar collapses to hamburger)

---

## 6. FEATURE SPECIFICATIONS

### 6.1 Availability Check (CRITICAL)
```typescript
// This function is the heart of the system — must be bulletproof
async function checkAvailability(
  roomId: string,
  checkIn: Date,      // Start of day UTC
  checkOut: Date,     // Start of day UTC
  excludeBookingId?: string  // For editing existing bookings
): Promise<boolean>

// Rules:
// 1. checkOut must be > checkIn
// 2. For conference rooms, also check time overlap
// 3. Exclude cancelled, no_show, checked_out bookings from conflict check
// 4. Return false if room status is 'maintenance' or 'blocked'
```

### 6.2 Booking Reference Generator
```typescript
// Format: SF-YYYY-XXX (zero-padded to 3 digits, then 4, etc.)
// Examples: SF-2026-001, SF-2026-042, SF-2026-153
// Reset counter at start of each year
// Use database sequence or Redis counter — NEVER use random IDs for booking refs
```

### 6.3 Conference Room Booking (Special Case)
- Conference rooms can be booked by the hour OR full day
- `pricePerHour` used when duration < 8 hours
- `pricePerNight` (full day rate) used when duration ≥ 8 hours or overnight
- `startTime` and `endTime` fields are required for conference bookings
- Overlap check must consider both date AND time

### 6.4 Partial Payment (Deposit) Flow
1. Guest pays deposit (any amount < total)
2. Booking status → `confirmed` (even with partial payment)
3. `paidAmount` updated, `balanceDue` recalculated
4. Receipt generated for deposit amount only
5. Remaining balance collected at check-in or check-out
6. Final receipt generated when `balanceDue = 0`

### 6.5 Check-in Process
1. Receptionist searches booking by ref or guest name
2. Verifies guest ID (idType + idNumber recorded if not already)
3. Confirms room is clean and available
4. Records `actualCheckIn` timestamp
5. Updates booking status → `checked_in`
6. Updates room status → `occupied`
7. If balance due: collect remaining payment before or after check-in
8. Prints/sends check-in confirmation

### 6.6 Check-out Process
1. Receptionist opens booking
2. System shows: nights stayed, total amount, paid amount, balance due
3. Collect any remaining balance
4. Record `actualCheckOut` timestamp
5. Update booking status → `checked_out`
6. Update room status → `dirty` (triggers housekeeping notification)
7. Generate final receipt if not already done
8. Schedule review request email/SMS for +24 hours

### 6.7 Auto Jobs (Cron — run daily at 07:00 EAT)
```
sendReviewLinks.job : Find bookings where status=checked_out AND actualCheckOut = yesterday → send review link
sendReminders.job   : Find bookings where checkIn = tomorrow AND status=confirmed → send reminder SMS/email
autoCheckout.job    : Find bookings where checkOut < today AND status=checked_in → mark as late_checkout, alert receptionist
```

---

## 7. API STRUCTURE & NAMING CONVENTIONS

### 7.1 Base URL
```
Development : http://localhost:5000/api/v1
Production  : https://api.stayflow.app/api/v1
```

### 7.2 Endpoints

```
AUTH
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
GET    /auth/me

BOOKINGS
GET    /bookings                    ?status=&page=&limit=&search=&dateFrom=&dateTo=
POST   /bookings                    Create new booking
GET    /bookings/:id
PATCH  /bookings/:id
DELETE /bookings/:id                Soft cancel only
POST   /bookings/:id/check-in
POST   /bookings/:id/check-out
GET    /bookings/availability       ?roomId=&checkIn=&checkOut=

ROOMS
GET    /rooms                       ?status=&floor=&type=
POST   /rooms                       Admin only
GET    /rooms/:id
PATCH  /rooms/:id                   Admin only
PATCH  /rooms/:id/status            Update room status

GUESTS
GET    /guests                      ?search=
POST   /guests
GET    /guests/:id
PATCH  /guests/:id
GET    /guests/:id/bookings

PAYMENTS
POST   /payments                    Record a payment
GET    /payments/:id
POST   /payments/snippe/initiate    Initiate Snippe payment (PRIMARY)
POST   /payments/snippe/webhook     Snippe webhook handler
POST   /payments/pesapal/initiate   Initiate Pesapal payment (FALLBACK B)
POST   /payments/pesapal/verify     Verify Pesapal callback (FALLBACK B)

HOUSEKEEPING
GET    /housekeeping                Current status all rooms
PATCH  /housekeeping/:roomId        Update room status + checklist

REPORTS
GET    /reports/revenue             ?period=daily|weekly|monthly|yearly
GET    /reports/occupancy           ?dateFrom=&dateTo=
GET    /reports/bookings-summary
GET    /reports/export              ?type=pdf|excel&period=

REVIEWS
GET    /reviews                     ?approved=true|false
POST   /reviews/:token              Guest submits review via token link
PATCH  /reviews/:id/approve         Admin only
PATCH  /reviews/:id/publish

SETTINGS
GET    /settings
PATCH  /settings                    Admin only
POST   /settings/users              Create staff account
GET    /settings/users
PATCH  /settings/users/:id
DELETE /settings/users/:id          Soft delete (isActive = false)
GET    /settings/audit-log
```

### 7.3 Response Format (ALWAYS follow this)
```typescript
// Success
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "meta": {              // For paginated responses only
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "ROOM_NOT_AVAILABLE",
    "message": "Chumba hakipatikani kwa tarehe uliyochagua",
    "messageEn": "Room is not available for the selected dates",
    "details": {}        // Validation errors, etc.
  }
}
```

### 7.4 HTTP Status Codes
```
200 - OK (GET, PATCH success)
201 - Created (POST success)
400 - Bad Request (validation error)
401 - Unauthorized (no/invalid token)
403 - Forbidden (insufficient role)
404 - Not Found
409 - Conflict (e.g. room already booked)
422 - Unprocessable Entity (business logic error)
429 - Too Many Requests (rate limited)
500 - Internal Server Error
```

---

## 8. AUTHENTICATION & AUTHORIZATION

### 8.1 JWT Strategy
```
Access Token  : 15 minutes expiry — stored in memory (Zustand)
Refresh Token : 7 days expiry — stored in httpOnly cookie
```

### 8.2 Role Permissions Matrix
| Action | admin | receptionist | housekeeping |
|--------|-------|-------------|-------------|
| View all bookings | ✅ | ✅ | ❌ |
| Create booking | ✅ | ✅ | ❌ |
| Edit booking | ✅ | ✅ | ❌ |
| Cancel booking | ✅ | ❌ | ❌ |
| Record payment | ✅ | ✅ | ❌ |
| Issue receipt | ✅ | ✅ | ❌ |
| View guests | ✅ | ✅ | ❌ |
| Manage rooms | ✅ | ❌ | ❌ |
| Update room status | ✅ | ✅ | ✅ |
| Update housekeeping | ✅ | ✅ | ✅ |
| View reports | ✅ | ❌ | ❌ |
| Manage staff | ✅ | ❌ | ❌ |
| System settings | ✅ | ❌ | ❌ |
| View audit log | ✅ | ❌ | ❌ |
| Approve reviews | ✅ | ❌ | ❌ |

### 8.3 Guest Portal (No auth required)
- Public booking page — no login needed
- Guest receives magic link for managing their booking (email/SMS)
- Review submission via one-time token link

---

## 9. PAYMENT INTEGRATION RULES

### 9.1 Snippe (PRIMARY Gateway)
```
Provider      : Snippe — snippe.sh | Built for Tanzania
Base URL      : https://api.snippe.sh
Auth          : Bearer API Key (Authorization: Bearer your_api_key)
SDK           : @snippe/sdk (official TypeScript/Node.js SDK)
Docs          : https://docs.snippe.sh
Webhook URL   : /api/v1/payments/snippe/webhook
Idempotency   : ALWAYS send Idempotency-Key header on every request
Rate limit    : 60 requests/minute
```

**Mobile Money fees:** 0.5% per transaction — Instant settlement
**Card fees:** 3.0% per transaction — instant to next business day
**Supported:** M-Pesa, Airtel Money, Halo Pesa, Mixx by Yas, Visa, Mastercard, Dynamic QR
**NOT supported:** Tigo Pesa (use direct Tigo API as plugin if needed)

```typescript
// apps/api/src/services/snippe.service.ts
import Snippe from '@snippe/sdk'

const snippe = new Snippe({ apiKey: process.env.SNIPPE_API_KEY! })

export class SnippeService {
  // Initiate mobile money payment (USSD push)
  async initiateMobileMoney(params: {
    amount: number
    phone: string           // +255XXXXXXXXX format
    network: 'mpesa' | 'airtel' | 'halopesa' | 'mixx'
    bookingRef: string
    description: string
  }) {
    return await snippe.payments.create({
      amount: params.amount,
      currency: 'TZS',
      type: 'mobile',
      phone_number: params.phone,
      network: params.network,
      reference: params.bookingRef,
      description: params.description,
    }, {
      headers: { 'Idempotency-Key': `${params.bookingRef}-${params.network}` }
    })
  }

  // Initiate card payment (redirect to hosted page)
  async initiateCard(params: {
    amount: number
    bookingRef: string
    callbackUrl: string
  }) {
    return await snippe.payments.create({
      amount: params.amount,
      currency: 'TZS',
      type: 'card',
      callback_url: params.callbackUrl,
      reference: params.bookingRef,
    }, {
      headers: { 'Idempotency-Key': `${params.bookingRef}-card` }
    })
    // Returns payment_url → redirect guest to this URL
  }

  // Verify webhook signature
  verifyWebhook(payload: string, signature: string): boolean {
    // Implement HMAC verification using SNIPPE_WEBHOOK_SECRET
    const crypto = require('crypto')
    const expected = crypto
      .createHmac('sha256', process.env.SNIPPE_WEBHOOK_SECRET!)
      .update(payload)
      .digest('hex')
    return expected === signature
  }
}

export const snippeService = new SnippeService()
```

### 9.2 Pesapal (FALLBACK Gateway B)
> ⚠️ Activate ONLY if: (a) Snippe rejects client application, OR (b) Tigo Pesa is mandatory
```
API Version   : v3
Sandbox URL   : https://cybqa.pesapal.com/pesapalv3
Live URL      : https://pay.pesapal.com/v3
Auth          : OAuth2 (consumer_key + consumer_secret)
Token expiry  : 5 minutes — cache and refresh automatically
Callback URL  : /api/v1/payments/pesapal/verify
IPN URL       : /api/v1/payments/pesapal/ipn
```

### 9.3 Tigo Pesa (Direct API — v2 Plugin)
```
Activate when : Client specifically requires Tigo Pesa support
Approach      : Implement TigoService as separate plugin (same PaymentProvider interface)
Docs          : Contact Tigo Tanzania directly for API access
```

### 9.4 Future Bank Plugins (v2/v3 — Plug-and-Play)
```
CRDBProvider       : CRDB Bank API — Tanzania's largest bank
NMBProvider        : NMB PesaLink — interbank transfers
SelcomProvider     : Selcom Pay — local gateway alternative
FlutterwaveProvider: Pan-Africa — USD payments for diaspora/international guests
```
Each provider implements the same PaymentProvider interface:
```typescript
interface PaymentProvider {
  initiate(params: PaymentParams): Promise<PaymentResult>
  verify(reference: string): Promise<VerifyResult>
  refund(reference: string, amount: number): Promise<RefundResult>
}
// Adding a new bank = write one class implementing this interface
// Zero changes to booking logic, database, or other services
```

### 9.3 Cash Payment Flow
```
1. Receptionist enters amount received
2. System calculates change if overpaid
3. Payment recorded immediately (no gateway)
4. Receipt generated instantly
5. Audit log records: amount, receivedBy, timestamp
```

### 9.4 Payment Security Rules
- NEVER store full card numbers
- NEVER log payment credentials
- ALWAYS verify payment status from gateway before updating booking
- ALWAYS use idempotency keys for payment requests
- Payment webhooks MUST verify signature before processing

---

## 10. NOTIFICATION SYSTEM

### 10.1 SendGrid Templates (Email)
```
booking_confirmation  : Subject: "Booking Confirmed — {bookingRef}"
payment_receipt       : Subject: "Receipt {receiptNumber} — StayFlow"
check_in_reminder     : Subject: "Reminder: Your arrival tomorrow — {hotelName}"
review_request        : Subject: "How was your stay? Share your experience"
cancellation          : Subject: "Booking Cancelled — {bookingRef}"
```

### 10.2 AfricasTalking (SMS)
```
Max length    : 160 characters per SMS (avoid multi-part SMS)
Sender ID     : "STAYFLOW" (register with AfricasTalking)
Phone format  : +255XXXXXXXXX (Tanzania) — always normalize to E.164
```

### 10.3 SMS Templates (Short — max 160 chars)
```
Confirmation : "StayFlow: Booking {ref} confirmed. Room {room}, {checkIn}. Total: TZS {amount}. For help: {phone}"
Receipt      : "StayFlow: Receipt {receiptNumber}. Paid: TZS {amount}. Ref: {ref}. Download: {url}"
Reminder     : "StayFlow: Reminder! Check-in tomorrow {checkIn}. {hotelName}. Questions? {phone}"
Review       : "StayFlow: Hi {name}, rate your stay at {hotelName}: {reviewUrl}"
```

### 10.4 Notification Queue Rules
- NEVER send notifications synchronously in the request-response cycle
- Use async processing (setTimeout or Bull queue if scaling)
- Log all notification attempts in `notifications` table
- Retry failed notifications max 3 times with exponential backoff

---

## 11. PDF RECEIPT RULES

### 11.1 Receipt Content (Required Fields)
```
Header        : Hotel logo + name + address + phone + email
Receipt No    : RCP-YYYY-XXX
Booking Ref   : SF-YYYY-XXX
Issue Date    : DD/MM/YYYY HH:MM
─────────────────────────────
Guest Info    : Full name, phone, email, ID number
Room Info     : Room number, type, floor
Stay Info     : Check-in date, Check-out date, Nights/Hours
─────────────────────────────
Itemized      :
  Room charges: X nights × TZS X,XXX = TZS XXX,XXX
  Add-ons     : [list each addon + quantity + subtotal]
  Discount    : -TZS X,XXX (if applicable)
  ─────────────────────────────
  TOTAL       : TZS XXX,XXX
  Paid        : TZS XXX,XXX
  Balance Due : TZS XXX,XXX (0 if fully paid)
─────────────────────────────
Payment Method: M-Pesa / Cash / etc.
Payment Ref   : [gateway ref or CASH]
Received by   : [staff name]
─────────────────────────────
Footer        : "Asante kwa kuchagua {hotelName}"
               "Thank you for choosing {hotelName}"
               Watermark: "PAID" in green diagonal if balanceDue = 0
               Watermark: "DEPOSIT" in amber if balanceDue > 0
```

### 11.2 PDF Generation Process
1. Data fetched from DB (booking + payment + guest + room)
2. HTML template rendered with data (Puppeteer)
3. PDF generated server-side
4. Uploaded to Cloudinary → get permanent URL
5. URL saved to `receipts.pdfUrl`
6. URL sent via email/SMS
7. Available for download on guest portal

---

## 12. ENVIRONMENT VARIABLES

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_APP_NAME=StayFlow
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Backend (.env)
```env
# Server
NODE_ENV=development
PORT=5000
APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/stayflow_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=          # min 32 chars random string
JWT_REFRESH_SECRET=         # different min 32 chars random string
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Snippe (PRIMARY gateway)
SNIPPE_API_KEY=
SNIPPE_WEBHOOK_SECRET=
SNIPPE_ENV=sandbox                # Change to 'live' for production

# Pesapal (FALLBACK B — leave empty unless activating)
PESAPAL_CONSUMER_KEY=
PESAPAL_CONSUMER_SECRET=
PESAPAL_IPN_URL=
PESAPAL_CALLBACK_URL=

# SendGrid
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=noreply@stayflow.app
SENDGRID_FROM_NAME=StayFlow

# AfricasTalking
AT_API_KEY=
AT_USERNAME=
AT_SENDER_ID=STAYFLOW

# Cron
CRON_SECRET=                # Secret for triggering cron jobs securely
```

---

## 13. DEVELOPMENT PHASES & CHECKLIST

### PHASE 1 — Foundation (Wiki 1–2)
**Goal: Working auth, rooms, and basic booking CRUD**

#### Setup
- [ ] Initialize monorepo with npm workspaces
- [ ] Setup Next.js 14 with TypeScript + Tailwind + shadcn/ui
- [ ] Setup Express.js with TypeScript
- [ ] Initialize Prisma with PostgreSQL
- [ ] Run initial migrations
- [ ] Setup Redis
- [ ] Configure ESLint + Prettier (shared config)
- [ ] Create GitHub repo + push initial commit
- [ ] Setup Railway for backend + DB + Redis
- [ ] Setup Vercel for frontend
- [ ] Configure GitHub Actions for CI/CD

#### Auth
- [ ] POST /auth/login — JWT access + refresh token
- [ ] POST /auth/refresh — refresh access token
- [ ] POST /auth/logout — invalidate refresh token
- [ ] GET /auth/me — current user
- [ ] Login page UI
- [ ] Auth middleware (authenticate + authorize)
- [ ] Zustand auth store
- [ ] Protected route wrapper

#### Rooms
- [ ] Seed initial rooms from StayFlow data
- [ ] GET /rooms API
- [ ] POST /rooms API (admin only)
- [ ] PATCH /rooms/:id API
- [ ] Room grid page UI (floor view — matches reference design)
- [ ] Room card component with status colors
- [ ] Room detail modal with housekeeping checklist
- [ ] Floor selector dropdown

#### Bookings — Basic
- [ ] GET /bookings API with filters
- [ ] POST /bookings API with availability check
- [ ] PATCH /bookings/:id API
- [ ] Availability check service (overlap detection)
- [ ] Booking reference generator (SF-YYYY-XXX)
- [ ] All Reservations page — table view (matches reference design)
- [ ] New booking modal/form
- [ ] Booking status badge component

#### Sidebar & Layout
- [ ] Sidebar navigation (matches reference design exactly)
- [ ] Header with user info, date, notifications, dark mode toggle
- [ ] Responsive mobile layout

---

### PHASE 2 — Payments & Receipts (Wiki 3–4)
**Goal: Full payment processing + automatic PDF receipts**

- [ ] Install @snippe/sdk — npm install @snippe/sdk
- [ ] SnippeService — initiateMobileMoney(), initiateCard(), verifyWebhook()
- [ ] POST /payments — record cash/bank payment
- [ ] POST /payments/snippe/initiate — initiate Snippe payment
- [ ] POST /payments/snippe/webhook — handle Snippe webhook
- [ ] Webhook signature verification (HMAC)
- [ ] Idempotency-Key on every Snippe request
- [ ] Puppeteer setup for PDF generation
- [ ] Receipt HTML template (all fields from Section 11.1)
- [ ] PDF upload to Cloudinary
- [ ] Receipt record in DB
- [ ] Payment form UI (method selector + amount input)
- [ ] Receipt preview component
- [ ] POST /auth/check-in — check-in flow
- [ ] POST /auth/check-out — check-out flow
- [ ] Update booking + room status on check-in/out
- [ ] Partial payment support (deposit flow)

---

### PHASE 3 — Guest Portal + Notifications (Wiki 5–6)
**Goal: Self-service booking + automated notifications**

- [ ] Public booking page (no auth)
- [ ] Live availability calendar component
- [ ] Room selection with photos and amenities
- [ ] Add-on services selection
- [ ] Guest info form with validation
- [ ] Payment method selection + Snippe redirect (card) / USSD push (mobile)
- [ ] Booking confirmation page
- [ ] My Bookings page (magic link access)
- [ ] Receipt download page
- [ ] SendGrid email integration + templates
- [ ] AfricasTalking SMS integration
- [ ] Notification service with queue
- [ ] Notification logging
- [ ] Language toggle (SW/EN) — locales system
- [ ] Review submission page (token-based)
- [ ] Cron jobs: review links, reminders, auto-checkout

---

### PHASE 4 — Dashboard + Reports + Polish (Wiki 7–8)
**Goal: Complete management tools + deployment ready**

- [ ] Overview dashboard page
  - [ ] Stats cards (check-ins today, checkouts, occupancy %, revenue today)
  - [ ] Occupancy chart (weekly/monthly)
  - [ ] Revenue chart
  - [ ] Arrivals & departures list
  - [ ] Quick room status overview
- [ ] Housekeeping page — all rooms status grid
- [ ] Expense tracking module
- [ ] Revenue management page
- [ ] Reports API + PDF/Excel export
- [ ] Audit log viewer (admin only)
- [ ] Staff management (create/edit/deactivate)
- [ ] System settings page (hotel info, logo upload)
- [ ] Review management (approve/publish)
- [ ] End-to-end testing (main booking flow)
- [ ] Performance audit (Lighthouse > 90)
- [ ] Security audit (OWASP basics)
- [ ] Staff training documentation
- [ ] Production deployment + DNS setup
- [ ] Monitor first week of live usage

---

## 14. CODE QUALITY RULES

### 14.1 TypeScript Rules
```
- strict: true in tsconfig.json — NO any types allowed
- All API responses must have typed interfaces
- All Zod schemas must match Prisma types
- No implicit returns in async functions
```

### 14.2 Naming Conventions
```
Files         : kebab-case (booking-table.tsx)
Components    : PascalCase (BookingTable)
Functions     : camelCase (getAvailableRooms)
Constants     : SCREAMING_SNAKE_CASE (MAX_RETRY_COUNT)
DB tables     : snake_case (booking_addons) — Prisma @@map handles this
Types/Interfaces: PascalCase (BookingStatus)
API routes    : kebab-case (/check-in, /room-status)
```

### 14.3 Git Commit Convention
```
feat: add payment receipt generation
fix: resolve availability check overlap bug
chore: update dependencies
docs: update API documentation
refactor: simplify booking service
style: fix sidebar alignment on mobile
test: add booking availability unit tests
```

### 14.4 Error Handling Rules
```typescript
// Backend: Always use asyncHandler wrapper
export const getBookings = asyncHandler(async (req, res) => {
  // No try-catch needed — asyncHandler handles it
});

// Never expose internal errors to client
// Always log full error server-side
// Return user-friendly messages in both SW + EN
```

### 14.5 Security Rules
- Sanitize all user inputs (express-validator + Zod)
- Rate limit all auth endpoints: 5 attempts per 15 minutes
- Rate limit all public endpoints: 100 requests per 15 minutes
- CORS: whitelist only your frontend domain
- Helmet.js for security headers
- NEVER log sensitive data (passwords, payment credentials, full card numbers)
- All file uploads: validate type + size (max 5MB per image)

---

## 15. DEPLOYMENT RULES

### 15.1 Environment Setup
```
Branch Strategy:
  main    → production (auto-deploy)
  develop → staging (auto-deploy)
  feature/* → PR to develop
```

### 15.2 Pre-deployment Checklist
- [ ] All .env variables set in Railway + Vercel dashboards
- [ ] DATABASE_URL pointing to production DB
- [ ] SNIPPE_ENV changed from 'sandbox' to 'live'
- [ ] SNIPPE_API_KEY set to production key
- [ ] CORS updated to production domain
- [ ] Snippe webhook URL registered in Snippe dashboard
- [ ] SNIPPE_WEBHOOK_SECRET set to production secret
- [ ] AfricasTalking sender ID approved
- [ ] SendGrid domain verified
- [ ] SSL certificates active
- [ ] Run `npx prisma migrate deploy` on production DB
- [ ] Run seed for initial rooms and settings
- [ ] Create first admin account via seed or direct DB

### 15.3 Monitoring
- Railway dashboard: CPU, Memory, Logs
- Vercel dashboard: Build logs, Performance
- Cloudinary: Storage usage
- SendGrid: Email delivery rates
- AfricasTalking: SMS delivery reports


---

## 23. TESTING STRATEGY

> Testing ni sehemu ya kila phase — si afterthought ya Phase 4
> Mfumo unaohusu fedha za watu LAZIMA uwe na tests

### 23.1 Testing Pyramid

```
E2E Tests (Playwright)     ← Kidogo — main user journeys tu
    Integration Tests      ← Kati — API endpoints + DB
        Unit Tests         ← Wengi — services + utils + validators
```

### 23.2 Unit Tests (Vitest — backend)

```typescript
// Faili zote za test zinaishi karibu na code: booking.service.test.ts
// Minimum coverage: 80% kwa services zote

// MUHIMU SANA — test hizi lazima zipite kabla ya merge:
describe('AvailabilityService', () => {
  test('should return false when room is already booked', ...)
  test('should allow booking after checkout date', ...)
  test('should handle conference room time overlap', ...)
  test('should exclude cancelled bookings from conflict check', ...)
})

describe('PaymentService', () => {
  test('should calculate correct balance after partial payment', ...)
  test('should not mark booking confirmed before payment verified', ...)
  test('should handle Snippe webhook idempotency', ...)
})

describe('BookingRefGenerator', () => {
  test('should generate SF-2026-001 format', ...)
  test('should increment correctly', ...)
  test('should reset at new year', ...)
})
```

### 23.3 Integration Tests (Supertest)

```typescript
// Test API endpoints na actual DB (test database — separate from dev)
describe('POST /bookings', () => {
  test('should create booking and return 201', ...)
  test('should return 409 if room not available', ...)
  test('should return 400 if checkOut before checkIn', ...)
  test('should require authentication', ...)
})

describe('POST /payments/snippe/webhook', () => {
  test('should verify signature before processing', ...)
  test('should return 200 even if processing fails (idempotency)', ...)
  test('should generate receipt after successful payment', ...)
})
```

### 23.4 E2E Tests (Playwright — critical paths only)

```typescript
// Test hizi zinaendesha browser ya kweli
test('Complete booking flow — guest self-service', async ({ page }) => {
  // 1. Visit booking page
  // 2. Select dates + room
  // 3. Fill guest info
  // 4. Complete payment (Snippe sandbox)
  // 5. Verify confirmation page + SMS received
})

test('Staff check-in flow', async ({ page }) => {
  // 1. Login as receptionist
  // 2. Find booking
  // 3. Check in guest
  // 4. Verify room status changes to Occupied
  // 5. Print receipt
})
```

### 23.5 Testing Commands

```bash
npm run test              # Unit tests (vitest)
npm run test:coverage     # Coverage report (must be >80%)
npm run test:integration  # Integration tests (requires test DB)
npm run test:e2e          # E2E tests (requires running app)
npm run test:all          # Everything — run before every deployment
```

### 23.6 Testing Checklist (Add to each Phase)

**Phase 1 — Add:**
- [ ] Unit tests: availability overlap detection (minimum 8 test cases)
- [ ] Unit tests: booking ref generator
- [ ] Integration tests: auth endpoints
- [ ] Integration tests: booking CRUD

**Phase 2 — Add:**
- [ ] Unit tests: payment state transitions
- [ ] Unit tests: balance calculation after partial payment
- [ ] Integration tests: Snippe webhook handling + idempotency
- [ ] Integration tests: PDF receipt generation

**Phase 3 — Add:**
- [ ] E2E: Complete guest self-booking flow
- [ ] Integration tests: notification sending

**Phase 4 — Add:**
- [ ] E2E: Staff check-in/check-out flow
- [ ] E2E: Admin report generation
- [ ] Performance: booking page loads < 2s
- [ ] Security: run OWASP ZAP basic scan

---

## APPENDIX — QUICK REFERENCE

### Booking Ref Format
```
SF-2026-001  (year resets counter)
```

### Receipt Number Format  
```
RCP-2026-001
```

### Date/Time Standards
```
Store in DB  : UTC (PostgreSQL handles this)
Display      : Africa/Dar_es_Salaam (UTC+3)
Format       : DD/MM/YYYY for dates, HH:MM for time
```

### Currency Display
```
Always display as: TZS 80,000 (no decimals — TZS has no cents in practice)
Store in DB as   : DECIMAL(10,2) — Prisma handles precision
```

### Phone Number Format
```
Input   : Accept 0712345678 or +255712345678 or 255712345678
Normalize to: +255712345678 (E.164) before saving to DB
Display : 0712 345 678 (local format for readability)
```

---

*This document is the single source of truth for StayFlow development.*  
*Last updated: Juni 2026 | Version 1.0*  
*Any changes to architecture, tech stack, or database schema MUST be updated here first.*


---

## 16. TRA / EFD INTEGRATION READINESS

> ⚠️ TRA/EFD integration si sehemu ya scope ya v1.0  
> Lakini mfumo umejengwa tayari kuruhusu integration bila kubadilisha architecture

### 16.1 Maamuzi ya Architecture

**EFD integration haitafanywa kwenye v1.0** — iko nje ya scope na mkataba wa sasa.  
Clause imeongezwa kwenye mkataba: *"TRA/EFD compliance si sehemu ya mradi huu wa awali."*

Hata hivyo, mfumo umejengwa kwa "EFD-ready" design — maana yake:
- Data yote inayohitajika na TRA tayari inahifadhiwa vizuri
- Service layer imetenganishwa — kuongeza EFD ni kuandika service mpya tu
- Receipt system inaweza kutoa data kwa EFD format bila kubadilisha logic ya msingi

### 16.2 Data Zinazohifadhiwa Kwa Ajili ya TRA (tayari kwenye schema)

```
Booking     : bookingRef, checkIn, checkOut, totalAmount, taxAmount
Payment     : method, amount, paidAt, snippeRef (primary) / pesapalRef (fallback B)
Guest       : fullName, idType, idNumber, nationality
Receipt     : receiptNumber, issuedAt, pdfUrl
Room        : roomNumber, type, pricePerNight
```

TRA inahitaji haya yote — na yote yapo tayari kwenye database schema yetu.

### 16.3 Tax Field — Ongeza kwenye Database

Ongeza fields hizi kwenye `Booking` model (zitakuwa 0 kwenye v1.0 — ready kwa v2):

```prisma
// Ongeza kwenye model Booking katika schema.prisma
taxRate        Decimal  @db.Decimal(5,2)  @default(0)    // e.g. 18.00 for VAT 18%
taxAmount      Decimal  @db.Decimal(10,2) @default(0)    // Calculated: totalAmount * taxRate/100
taxableAmount  Decimal  @db.Decimal(10,2) @default(0)    // Amount before tax
efdSerial      String?                                    // EFD machine serial number
efdReceiptNo   String?                                    // EFD receipt number (from TRA)
efdQrCode      String?                                    // QR code from EFD
efdSyncedAt    DateTime?                                  // When synced with TRA
```

### 16.4 EFD Service — Placeholder (Plug-and-Play)

Faili hili litawepo lakini **haitafanya kazi** kwenye v1.0 — ni placeholder tu:

```
apps/api/src/services/efd.service.ts   ← PLACEHOLDER — ready for v2
```

```typescript
// apps/api/src/services/efd.service.ts
// EFD Integration Service — StayFlow v2 (Placeholder)
// Tanzania Revenue Authority — Electronic Fiscal Device
// Docs: https://www.tra.go.tz/index.php/efd-system
//
// TO ACTIVATE: Implement the methods below using TRA API credentials
// All data structures are already defined and ready

export interface EFDReceiptData {
  bookingRef: string
  receiptNumber: string
  guestName: string
  guestIdNumber: string
  roomNumber: string
  checkIn: Date
  checkOut: Date
  taxableAmount: number
  taxRate: number           // e.g. 18 for 18% VAT
  taxAmount: number
  totalAmount: number
  paymentMethod: string
  issuedAt: Date
}

export interface EFDResponse {
  success: boolean
  efdReceiptNo?: string
  efdSerial?: string
  efdQrCode?: string
  error?: string
}

class EFDService {
  private readonly isEnabled: boolean

  constructor() {
    // Only active when TRA credentials are configured
    this.isEnabled = !!(
      process.env.TRA_EFD_SERIAL &&
      process.env.TRA_EFD_PIN &&
      process.env.TRA_API_URL
    )
  }

  // Called after every payment — does nothing in v1.0
  async syncReceipt(data: EFDReceiptData): Promise<EFDResponse> {
    if (!this.isEnabled) {
      console.log('[EFD] Service not configured — skipping EFD sync')
      return { success: false, error: 'EFD not configured' }
    }
    // TODO v2: Implement TRA API call here
    throw new Error('EFD integration not yet implemented — coming in v2')
  }

  async getEFDStatus(): Promise<{ connected: boolean; serial?: string }> {
    if (!this.isEnabled) return { connected: false }
    // TODO v2: Ping TRA API to check EFD status
    return { connected: false }
  }
}

export const efdService = new EFDService()
```

### 16.5 Hook kwenye Payment Service (Tayari)

Kwenye `payments.service.ts`, baada ya payment kukamilika:

```typescript
// Tayari ipo kwenye payment flow — v1.0 inaskip, v2 itafanya kazi
import { efdService } from './efd.service'

// After successful payment + receipt generation:
const efdResult = await efdService.syncReceipt(receiptData)
if (efdResult.success) {
  // Update booking with EFD details
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      efdReceiptNo: efdResult.efdReceiptNo,
      efdSerial: efdResult.efdSerial,
      efdQrCode: efdResult.efdQrCode,
      efdSyncedAt: new Date()
    }
  })
}
// If EFD fails — LOG but don't block payment (business continues)
```

### 16.6 Environment Variables za TRA (Ziongezwe kwenye .env — empty kwa sasa)

```env
# TRA / EFD Integration (v2 — leave empty for now)
TRA_EFD_SERIAL=
TRA_EFD_PIN=
TRA_API_URL=
TRA_TAXPAYER_TIN=
TRA_TAXPAYER_VRN=       # VAT Registration Number
```

### 16.7 Receipt Template — EFD Section (Hidden kwa sasa)

Kwenye PDF receipt template, ongeza section hii (inaonekana tu kama efdReceiptNo ipo):

```
─────────────────────────────
TRA FISCAL RECEIPT           ← Inaonekana tu kama EFD imeactivate
EFD Serial  : {efdSerial}
EFD Receipt : {efdReceiptNo}
[QR Code]
─────────────────────────────
```

---

## 17. SMART LOCK INTEGRATION READINESS

> ⚠️ Smart lock integration si sehemu ya scope ya v1.0  
> Mfumo umejengwa tayari kuruhusu integration bila kubadilisha booking logic

### 17.1 Concept — Jinsi Inavyofanya Kazi (v2)

```
Mgeni anafika → Check-in inafanywa → Mfumo unatoa PIN/Code ya chumba
Mgeni anaondoka → Check-out inafanywa → PIN/Code inafutwa automatically
Admin anaweza ku-generate code mpya wakati wowote
Housekeeping wana code yao tofauti (permanent au daily rotating)
```

### 17.2 Smart Lock Service — Placeholder

```
apps/api/src/services/smartlock.service.ts   ← PLACEHOLDER — ready for v2
```

```typescript
// apps/api/src/services/smartlock.service.ts
// Smart Lock Integration Service — StayFlow v2 (Placeholder)
// Supports: TTLock, Yale, Salto, Dormakaba, and most API-based lock systems
//
// TO ACTIVATE: Set SMARTLOCK_PROVIDER and credentials in .env
// Then implement the provider-specific methods below

export type SmartLockProvider = 'ttlock' | 'yale' | 'salto' | 'dormakaba' | 'custom'

export interface LockAccessCode {
  code: string              // PIN or card number
  type: 'pin' | 'card' | 'fingerprint' | 'nfc'
  validFrom: Date
  validUntil: Date
  roomNumber: string
  guestName: string
  bookingRef: string
}

export interface LockOperationResult {
  success: boolean
  code?: string             // The generated access code
  lockId?: string
  error?: string
}

class SmartLockService {
  private readonly provider: SmartLockProvider | null
  private readonly isEnabled: boolean

  constructor() {
    this.provider = (process.env.SMARTLOCK_PROVIDER as SmartLockProvider) || null
    this.isEnabled = !!(this.provider && process.env.SMARTLOCK_API_KEY)
  }

  // Called at CHECK-IN — generates guest access code
  async grantAccess(params: {
    roomNumber: string
    bookingRef: string
    guestName: string
    checkIn: Date
    checkOut: Date
  }): Promise<LockOperationResult> {
    if (!this.isEnabled) {
      console.log('[SmartLock] Not configured — skipping lock grant')
      return { success: false, error: 'Smart lock not configured' }
    }
    // TODO v2: Call provider API based on this.provider
    throw new Error('Smart lock integration not yet implemented — coming in v2')
  }

  // Called at CHECK-OUT — revokes guest access
  async revokeAccess(params: {
    roomNumber: string
    bookingRef: string
  }): Promise<LockOperationResult> {
    if (!this.isEnabled) return { success: false, error: 'Smart lock not configured' }
    // TODO v2: Revoke access via provider API
    throw new Error('Smart lock integration not yet implemented — coming in v2')
  }

  // Called when room needs cleaning — grants housekeeping temporary access
  async grantHousekeepingAccess(params: {
    roomNumber: string
    staffName: string
    validMinutes?: number   // Default: 120 minutes
  }): Promise<LockOperationResult> {
    if (!this.isEnabled) return { success: false, error: 'Smart lock not configured' }
    // TODO v2: Grant time-limited access to housekeeping staff
    throw new Error('Smart lock integration not yet implemented — coming in v2')
  }

  // Emergency override — admin unlocks any room
  async emergencyUnlock(roomNumber: string): Promise<LockOperationResult> {
    if (!this.isEnabled) return { success: false, error: 'Smart lock not configured' }
    // TODO v2: Emergency unlock via provider API
    throw new Error('Smart lock integration not yet implemented — coming in v2')
  }

  // Get current lock status for a room
  async getLockStatus(roomNumber: string): Promise<{
    isLocked: boolean
    batteryLevel?: number
    lastActivity?: Date
  }> {
    if (!this.isEnabled) return { isLocked: true }
    // TODO v2: Get lock status from provider API
    return { isLocked: true }
  }
}

export const smartLockService = new SmartLockService()
```

### 17.3 Database — Lock Fields (Ongeza kwenye Schema)

```prisma
// Ongeza kwenye model Room
lockId          String?    // Lock device ID from provider
lockProvider    String?    // "ttlock" | "yale" | "salto" etc.
lockIsOnline    Boolean    @default(false)
lockBattery     Int?       // Battery percentage 0-100

// Ongeza kwenye model Booking
lockAccessCode  String?    // Generated PIN/code for this booking
lockAccessSentAt DateTime? // When code was sent to guest
lockGrantedAt   DateTime?  // When lock access was actually granted
lockRevokedAt   DateTime?  // When lock access was revoked
```

### 17.4 Hooks kwenye Booking Service

```typescript
// Kwenye check-in flow — apps/api/src/services/bookings.service.ts
import { smartLockService } from './smartlock.service'

// After successful check-in:
const lockResult = await smartLockService.grantAccess({
  roomNumber: booking.room.roomNumber,
  bookingRef: booking.bookingRef,
  guestName: booking.guest.fullName,
  checkIn: booking.checkIn,
  checkOut: booking.checkOut
})

if (lockResult.success && lockResult.code) {
  // Save code to booking
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      lockAccessCode: lockResult.code,
      lockGrantedAt: new Date()
    }
  })
  // Send code to guest via SMS
  // "Msimbo wa chumba chako {roomNumber}: {code}. Halali hadi {checkOut}"
  await smsService.send(booking.guest.phone, 
    `StayFlow: Msimbo wa chumba ${booking.room.roomNumber}: ${lockResult.code}. Halali hadi ${formatDate(booking.checkOut)}`
  )
}
// If lock fails — LOG but don't block check-in (receptionist gives physical key)

// Kwenye check-out flow:
await smartLockService.revokeAccess({
  roomNumber: booking.room.roomNumber,
  bookingRef: booking.bookingRef
})

// Kwenye housekeeping status update (room → dirty):
await smartLockService.grantHousekeepingAccess({
  roomNumber: room.roomNumber,
  staffName: updatedBy.fullName,
  validMinutes: 120
})
```

### 17.5 Admin UI — Lock Management (v2 Placeholder)

Kwenye Room Detail Modal, ongeza section hii (inaonekana tu kama lock imeactivate):

```
[Lock Status]          ← Inaonekana kama SMARTLOCK_PROVIDER imewekwa
🔒 Locked | Battery: 87%
[Generate New Code]  [Emergency Unlock]  [View Access Log]
```

Kwenye v1.0 — section hii haionyeshwi. UI component tayari ipo, inacheck `isSmartLockEnabled` flag.

### 17.6 Environment Variables za Smart Lock

```env
# Smart Lock Integration (v2 — leave empty for now)
SMARTLOCK_PROVIDER=           # ttlock | yale | salto | dormakaba | custom
SMARTLOCK_API_KEY=
SMARTLOCK_API_SECRET=
SMARTLOCK_API_URL=
SMARTLOCK_DEFAULT_CODE_LENGTH=6    # PIN digits
SMARTLOCK_ACCESS_BUFFER_MINUTES=30 # Grant access 30min before check-in
```

### 17.7 Supported Providers (v2 — investigate client's specific lock brand)

```
TTLock    : Most common in East Africa hotels — REST API available
Yale      : Yale Access API
Salto     : SALTO KS Cloud API
Dormakaba : Ambiance API
Custom    : Any lock with REST API or Webhook support
```

> 📌 **Action Required:** Client amesema atanunua smart locks — pata jina la brand/model  
> kabla ya v2 development ili uconfirm API compatibility. Tuma folder ya software  
> ili tuangalie documentation ya integration yao.

---

## 18. MULTI-TENANCY — INAANZA SASA (v1.0 Foundation)

> ✅ UAMUZI ULIOBADILISHWA: Multi-tenancy inaanza v1.0 — si "v2 baadaye"
> Sababu: StayFlow inauzwa kwa hoteli nyingi — architecture lazima iwe tayari tangu siku ya kwanza
> Kazi ya ziada: masaa 6 tu. Faida: hoteli ya 2, 3, 10 bila kuandika mfumo upya.
> v1.0 = hoteli moja (default). v2 = dashboard ya multi-hotel + subdomain routing.

### 18.1 Ongeza `hotelId` kwenye Tables Zote

```prisma
// Ongeza model mpya
model Hotel {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique   // e.g. "g4homez" — used in URLs
  address     String?
  phone       String?
  email       String?
  logoUrl     String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())

  users    User[]
  rooms    Room[]
  bookings Booking[]
  settings SystemSettings?

  @@map("hotels")
}

// Kwenye kila table muhimu, ongeza:
hotelId  String
hotel    Hotel  @relation(fields: [hotelId], references: [id])
```

### 18.2 Seed ya v1.0 — Hotel Moja

```typescript
// apps/api/src/prisma/seed.ts
await prisma.hotel.upsert({
  where: { slug: 'default' },
  create: {
    id: 'default-hotel-id',    // Fixed ID kwa v1.0
    name: process.env.HOTEL_NAME || 'StayFlow Hotel',
    slug: 'default',
    isActive: true
  },
  update: {}
})
```

### 18.3 Middleware — Auto-inject hotelId (v1.0)

```typescript
// Kwenye v1.0, kila request automatically inapata hotelId ya default
// Kwenye v2 (multi-tenant), hii itabadilika kuangalia subdomain au JWT claim

export const injectHotelContext = (req, res, next) => {
  req.hotelId = process.env.DEFAULT_HOTEL_ID || 'default-hotel-id'
  // v2: req.hotelId = getHotelFromSubdomain(req.hostname) || req.user.hotelId
  next()
}
```

---

## 19. BACKUP STRATEGY

### 19.1 Automated Backups
```
Railway PostgreSQL  : Daily automatic backup (7 days retention) — included
Cloudinary          : Files stored permanently — no backup needed
```

### 19.2 Weekly Manual Backup Script

```bash
# apps/api/scripts/backup.sh
# Run every Sunday 02:00 EAT via cron
#!/bin/bash
DATE=$(date +%Y%m%d)
BACKUP_FILE="stayflow_backup_$DATE.sql"

pg_dump $DATABASE_URL > /tmp/$BACKUP_FILE
gzip /tmp/$BACKUP_FILE

# Upload to Google Drive (using rclone)
rclone copy /tmp/$BACKUP_FILE.gz gdrive:StayFlow-Backups/

echo "Backup completed: $BACKUP_FILE.gz"
```

### 19.3 Backup Cron (Railway)
```
Schedule : 0 23 * * 0  (Sunday 23:00 UTC = Monday 02:00 EAT)
Retention: Keep last 12 weekly backups (3 months)
Alert    : Send email to admin if backup fails
```

---

## 20. OFFLINE / POOR INTERNET STRATEGY

> PWA offline mode si kwenye scope ya v1.0  
> Badala yake: SOP + UI indicators

### 20.1 UI — Connection Status Indicator

```typescript
// Onyesha indicator ya connection status kwenye header
// Green dot = Online | Red dot = Offline

// components/shared/ConnectionStatus.tsx
const ConnectionStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  
  // Show banner when offline
  if (!isOnline) return (
    <div className="bg-red-500 text-white text-center py-2 text-sm">
      ⚠️ Hakuna mtandao — Tafadhali angalia connection yako. 
      Data mpya haitahifadhiwa hadi uunganike tena.
    </div>
  )
  return null
}
```

### 20.2 SOP — Kama Internet Imekatika

```
Document hii itapewa client kama mwongozo wa dharura:

1. BOOKING mpya   → Andika kwenye daftari la dharura (template imetolewa)
2. MALIPO         → Chukua pesa taslimu, toa risiti ya karatasi (template imetolewa)  
3. CHECK-IN       → Piga picha ya ID ya mgeni kwa simu
4. Mtandao urudi  → Inainisha kila kitu kwenye mfumo ndani ya masaa 2
5. Receipts       → Tengeneza PDF receipts kwa bookings zilizoinishwa offline
```

---

*Sehemu 16–20 ziliongezwa: Juni 2026 | Version 1.1*  
*TRA/EFD Readiness, Smart Lock Readiness, Multi-tenancy, Backup, Offline Strategy*



---

## 22. QR CODE — ROOM INFORMATION PAGES

> Scope: v1.0 — Phase 3 (Wiki 5-6)
> QR codes zinaonekana ndani ya kila chumba (physical frame kwenye ukuta)
> Scan → ukurasa wa chumba unafunguka bila login yoyote

### 22.1 Concept

```
Physical QR frame ndani ya chumba → Mgeni ascan → /room/111 inafunguka
Content: WiFi, amenities, rules, checkout time, emergency contacts, restaurant info
```

- QR codes 2 kwa vyumba vya aina 2 (Cottage na Mountain View)
- QR ya 3 kwa Conference Room (rules za ukumbi, WiFi, setup instructions)
- Content inabadilika — admin akisasisha WiFi password kwenye settings, ukurasa unasasishwa papo hapo
- URL ni static forever — QR inachapishwa mara moja tu

### 22.2 Folder Structure — Ongeza kwenye web app

```
apps/web/app/
└── (guest-portal)/
    ├── room/
    │   └── [roomNumber]/
    │       └── page.tsx        # Public QR landing page — NO auth required
    └── ...
```

### 22.3 URL Structure

```
/room/111     → Cottage Room 111
/room/108     → Mountain View Room 108
/room/109     → Mountain View Room 109
/room/conf    → Conference Room
```

### 22.4 Page Content (inayoweza kubadilishwa na admin)

```typescript
// Data inatoka SystemSettings + Room model
interface RoomQRPageData {
  roomNumber    : string      // "111"
  roomName      : string      // "Cottage Room"
  floor         : number
  wifiName      : string      // kutoka SystemSettings.wifiName
  wifiPassword  : string      // kutoka SystemSettings.wifiPassword
  checkInTime   : string      // "14:00"
  checkOutTime  : string      // "11:00"
  amenities     : string[]    // ["WiFi", "AC", "Smart TV", "Breakfast"]
  rules         : string[]    // ["Hakuna sigara", "Pumzika 22:00-07:00"]
  restaurantHours: string     // "07:00 - 22:00"
  emergencyPhone : string     // Reception number
  hotelPhone    : string
}
```

### 22.5 Admin Panel — QR Management

Kwenye Room settings page, ongeza:
- **Preview** ya QR code (live)
- **Download PNG** — print-ready, high resolution (300dpi)
- **Download PDF** — A5 frame-ready na branding ya hoteli
- **Regenerate** — generate QR mpya (URL haibadiliki — content inabadilika tu)

### 22.6 Package

```bash
npm install qrcode        # QR generation
npm install @types/qrcode # TypeScript types
```

```typescript
// Generating QR PNG for download — admin panel
import QRCode from 'qrcode'

const qrDataUrl = await QRCode.toDataURL(
  `https://yourdomain.com/room/${roomNumber}`,
  {
    width: 800,
    margin: 2,
    color: { dark: '#0F6E56', light: '#FFFFFF' }  // Brand colors
  }
)
// Return as downloadable PNG
```

### 22.7 Phase 3 Checklist (Ongeza)

- [ ] /room/[roomNumber] public page — mobile-optimized, no auth
- [ ] RoomQRPage component — WiFi, amenities, rules, contacts
- [ ] SystemSettings — add wifiName, wifiPassword, restaurantHours, emergencyPhone fields
- [ ] Admin panel — QR preview + PNG download + PDF download
- [ ] QR generation API: GET /rooms/:id/qr → returns PNG buffer
- [ ] Bilingual content (SW/EN toggle kwenye QR page)
- [ ] Test: scan QR kwenye simu → ukurasa unafunguka vizuri

---

## 21. SMART LOCK — SPECIFIC INTEGRATION ANALYSIS
> Based on: HotelLockSystem v9.27C — analyzed Juni 2026

### 21.1 Matokeo ya Uchambuzi wa Software

Baada ya kuchanganua software ya lock iliyotolewa na client, hii ndiyo tuliyogundua:

```
Software      : RF Card Lock Management System v9.27C
File kuu      : CardLock.Exe (Delphi/Windows application, 4MB)
Database      : CardLock.mdb (Microsoft Access Database)
Interface     : USB Encoder device (RFID card encoder)
Technology    : RF/MIFARE card-based (physical key cards)
Communication : LOCAL ONLY — hakuna REST API, hakuna network API
Architecture  : Windows Desktop App + MS Access DB + USB hardware
Built with    : Delphi (confirmed via strings analysis)
DB Layer      : ADO Connection → MS Access (.mdb file)
```

### 21.2 Uhalisi Muhimu — Tatizo la Integration

> ⚠️ **CRITICAL FINDING:** Mfumo huu HAUNA REST API wala network interface.

Hii si mfumo wa kisasa wa API-based smart locks (kama TTLock, Yale Connect, Salto KS). Ni mfumo wa **zamani wa card-based** ambapo:

- Kadi za RF/MIFARE zinaandikwa na **USB Encoder** (hardware dongle)
- Software inafanya kazi **locally** kwenye Windows PC ya reception tu
- Hakuna HTTP endpoints, hakuna webhooks, hakuna cloud API
- Data inahifadhiwa kwenye **MS Access database** (.mdb file) locally
- Kufungua mlango = kutumia kadi ya plastic iliyoandikwa na encoder

**Hii inamaanisha:** Integration ya moja kwa moja kati ya StayFlow API na mfumo huu haiwezekani kwa njia ya kawaida ya REST API.

### 21.3 Card Types Zinazojulikana (kutoka interface.txt)

```
Guest Card      : Kadi ya kawaida ya mgeni — inafungua chumba chake tu
Master Card     : Inafungua vyumba vyote
Floor Card      : Inafungua vyumba vyote kwenye floor moja
Building Card   : Inafungua vyumba vyote kwenye building
Emergency Card  : Inafungua vyote + mlango unabaki wazi
Check-Out Card  : Inafuta/kukomesha kadi za mgeni
Record Card     : Inasoma history ya ufunguaji wa mlango
Lost Card       : Kuripoti kadi iliyopotea (inazuiwa)
```

### 21.4 Room Status kwenye Lock System

```
Vacancy (VC)          : Chumba kipo wazi
Hourly Use (OH)       : Inatumiwa kwa saa
Reservation (OT)      : Imehifadhiwa
Payment Remind (TO)   : Kumbusho la malipo
Cleaning (VD)         : Inasafishwa
Maintenance (OO)      : Matengenezo
Guest/Walk-in (OC)    : Mgeni yumo
Guest Group (Team)    : Kikundi cha wageni
```

### 21.5 Njia 3 za Integration — Chaguo na Mapendekezo

---

#### OPTION A: MS Access Database Bridge (Inayopendekezwa — v2)
```
StayFlow API ←→ MS Access (.mdb) ←→ CardLock.Exe ←→ USB Encoder ←→ Card
```

**Jinsi inavyofanya kazi:**
1. StayFlow API inaandika booking data moja kwa moja kwenye `CardLock.mdb`
2. Staff wanaendelea kutumia CardLock.Exe kwa encoding tu
3. Data ya guest, check-in/out dates ipo tayari — hawahitaji kuiinisha tena

**Tables za MS Access zinazohusika** (kutoka kwa database analysis):
```
Guests table  : GuestName, CheckIn, CheckOut, RoomNo, CardType, Deposit
Cards table   : CardID, RoomNo, GuestID, IssueDate, ExpiredDate, Status
Rooms table   : RoomNo, BuildingNo, FloorNo, Type, Price, Status
```

**Integration code** (Node.js → MS Access via ODBC):
```typescript
// apps/api/src/services/smartlock.service.ts — OPTION A Implementation
import odbc from 'odbc'  // npm install odbc

const MDB_PATH = process.env.CARDLOCK_MDB_PATH  
// e.g. "C:/HotelLockSystem/CardLock.mdb" — path kwenye Windows PC ya reception

class SmartLockService {
  private connectionString: string

  constructor() {
    this.connectionString = 
      `Driver={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=${MDB_PATH}`
  }

  // Sync guest data to CardLock database after booking confirmed
  async syncGuestToCardLock(params: {
    guestName: string
    roomNumber: string
    checkIn: Date
    checkOut: Date
    bookingRef: string
  }) {
    const conn = await odbc.connect(this.connectionString)
    try {
      await conn.query(`
        INSERT INTO Guests (GuestName, RoomNo, CheckInDate, CheckOutDate, Memo)
        VALUES (?, ?, ?, ?, ?)
      `, [
        params.guestName,
        params.roomNumber,
        params.checkIn.toLocaleDateString(),
        params.checkOut.toLocaleDateString(),
        params.bookingRef
      ])
    } finally {
      await conn.close()
    }
  }

  // Read room status from CardLock DB
  async getRoomStatusFromLock(roomNumber: string) {
    const conn = await odbc.connect(this.connectionString)
    try {
      const result = await conn.query(
        `SELECT Status FROM Rooms WHERE RoomNo = ?`, 
        [roomNumber]
      )
      return result[0]?.Status || null
    } finally {
      await conn.close()
    }
  }
}
```

**Limitations:** 
- MS Access ODBC inafanya kazi Windows tu — backend lazima iwe Windows server au local
- Staff bado wanahitaji ku-encode kadi kwa mkono kwenye USB encoder
- Hakuna automation ya ufunguaji wa mlango — bado inahitaji kadi ya plastic

**Gharama ya kutekeleza:** ~Wiki 1 ya kazi (v2)

---

#### OPTION B: Screen Automation / RPA (Ngumu — si inapendekezwa)
```
StayFlow API → Windows Task Scheduler → AutoHotkey script → CardLock.Exe GUI
```
**Tatizo:** Brittle sana — kama CardLock.Exe ikibadilisha layout, automation inashindwa. Hii si njia ya professional.

---

#### OPTION C: Badilisha Lock System (Bora zaidi — long-term)
```
StayFlow API ←→ TTLock Cloud API ←→ Smart Lock (WiFi/BLE)
```
**Njia bora kabisa** kwa hoteli ya kisasa — locks za TTLock zinapatikana Tanzania (AliExpress, karibu TZS 80,000-150,000/mlango) na zina **REST API kamili** ya bure.

**Faida:**
- Integration kamili — check-in → code inatumwa kwa mgeni kwa SMS/email automatically
- Hakuna kadi za plastic — mgeni anatumia PIN au smartphone
- Admin anaweza kufungua/kufunga mlango wowote remotely
- Battery level monitoring
- Access history kwa kila mlango

**Mapendekezo kwa client:** Eleza hili kama investment ya muda mrefu — locks za zamani za kadi zinaweza kubadilishwa polepole.

---

### 21.6 Mapendekezo ya Mwisho — Jinsi ya Kuendelea

```
v1.0 (Sasa)  : Hakuna lock integration — staff wanafanya manually kama kawaida
               StayFlow inafanya kila kitu kingine (booking, payment, receipt)
               Lock system inafanya kazi yake independently kama ilivyo sasa

v2.0 (Baadaye Option A) : MS Access bridge — sync guest data tu, encoding bado manual
                           Inapunguza double-entry ya data (mfumo mmoja → mwingine)

v3.0 (Long-term Option C): Badilisha na TTLock au similar — integration kamili
                            Guest anapata PIN kwa SMS baada ya check-in moja kwa moja
```

### 21.7 Mazungumzo na Client

**Mambo ya kumwambia client sasa hivi:**

1. **Mfumo wake wa lock (RF Card system) hauna API** — integration ya moja kwa moja haiwezekani kwa v1.0

2. **Kwa v1.0:** Staff watafanya kazi kwa mfumo wote mawili kama kawaida. StayFlow itashughulikia booking + payment + receipts. Lock system inafanya kazi yake kando.

3. **Kwa v2:** Tunaweza kuandika bridge ndogo inayosync guest data kutoka StayFlow kwenda CardLock database — staff hawatahitaji kuiinisha tena mara mbili.

4. **Pendekezo la muda mrefu:** Fikiria kubadilisha na TTLock (WiFi smart locks) — integration itakuwa kamili na automatic.

5. **Hii haathiri mkataba wa sasa** — clause ya "Smart Lock si sehemu ya scope ya v1.0" bado inasimama.

### 21.8 Action Items

- [ ] Mwambie client matokeo ya analysis hii kwa lugha rahisi
- [ ] Omba akuambie brand ya exact ya lock (manufacturer) — kuna uwezekano wa documentation ya ziada
- [ ] Angalia kama CardLock.mdb ina table structure — tuma database schema kama utapata
- [ ] Ongeza clause kwenye mkataba: "Smart lock integration (v2) itahitaji makubaliano mapya ya bei na scope"
- [ ] Kama client anataka TTLock integration badala yake — bei ya ziada na muda wa ziada

