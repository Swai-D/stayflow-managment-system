# StayFlow System Guide

> **Version:** 1.0 — Production-ready  
> **Product:** StayFlow Reservation Management System (RMS)  
> **Client reference:** Buffalo Hotel  
> **Stack:** Next.js 16 + Express + PostgreSQL + Prisma  

This guide explains how StayFlow is built, what it can do, and how to run, test, and deploy it.

---

## 1. What is StayFlow?

StayFlow is a hotel reservation and operations management system designed for small-to-mid-size hotels, lodges, and guesthouses in East Africa (Tanzania-first). It covers the full guest lifecycle:

- Room availability and booking
- Check-in / check-out
- Point-of-sale (POS) room charges
- Payments and invoicing
- Guest self-service portal
- Store / inventory
- Staff, shifts, leave, and Tanzania payroll
- Company/corporate accounts
- AI assistant (Buffalo)
- Developer API & webhooks

---

## 2. Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                        Web Dashboard                         │
│              Next.js 16 (App Router) — Port 3000             │
│                  Tailwind CSS + shadcn/ui                    │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS / Axios
┌──────────────────────────▼──────────────────────────────────┐
│                        REST API                              │
│              Express + TypeScript — Port 5000                │
│                    Prisma ORM + PostgreSQL                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    PostgreSQL Database                       │
│        Single-tenant per hotel (systemHotel pattern)         │
└─────────────────────────────────────────────────────────────┘

Guest Portal (submodule: buffalo-guest/)  ←→  /api/guest endpoints
Public website / widget                   ←→  /api/v1/public & /api/v1/ext
Payment gateways (Snippe, etc.)           ←→  /api/v1/payments/*
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS, shadcn/ui, Zustand, React Query |
| Backend | Node.js 20 LTS, Express, TypeScript, Prisma, Zod |
| Database | PostgreSQL 15+ |
| Auth | JWT access token (15 min) + refresh token (7 days) |
| PDF | Server-side PDFKit |
| SMS | Africa's Talking / NextSMS integration (service layer) |
| Payments | Snippe API (primary), Pesapal fallback |
| Hosting | Vercel (web), Railway (API + DB) |

---

## 3. Project Structure

```text
stayflow/
├── apps/
│   ├── web/                    # Next.js dashboard
│   │   ├── app/(dashboard)/    # Staff/admin pages
│   │   ├── app/(guest-portal)/ # Self-service pages
│   │   ├── app/(auth)/         # Login
│   │   ├── components/         # Feature components
│   │   └── e2e/                # Playwright smoke tests
│   └── api/                    # Express API
│       ├── src/
│       │   ├── routes/         # API route modules
│       │   ├── controllers/    # Request handlers
│       │   ├── services/       # Business logic
│       │   ├── middleware/     # Auth, permissions, validation
│       │   ├── prisma/         # Schema + migrations + seed
│       │   ├── utils/          # Helpers (payroll, refs, PDF)
│       │   └── tests/          # Integration tests
│       └── package.json
├── buffalo-guest/              # Guest portal submodule
├── docs/                       # This guide + SOPs
├── instructions/               # Original build specifications
└── package.json                # Root workspace scripts
```

---

## 4. Getting Started (Local Development)

### 4.1 Prerequisites

- Node.js 20+
- PostgreSQL 15+ running locally
- Git (with submodules if you need the guest portal)

### 4.2 Environment Variables

Create `.env` files in both `apps/web` and `apps/api`.

**`apps/api/.env`** (minimum):

```bash
PORT=5000
DATABASE_URL=postgresql://postgres:<password>@localhost:5432/stayflow_db
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
APP_URL=http://localhost:3000
GUEST_PORTAL_URL=http://localhost:5501
# Optional: Snippe, Africa's Talking, SendGrid, Cloudinary
```

**`apps/web/.env.local`**:

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_GUEST_PORTAL_URL=http://localhost:5501
```

### 4.3 Database Setup

```bash
# Reset, migrate, and seed with production-like data
cd apps/api
npx prisma migrate reset
npm run db:seed:prod

# Or deploy migrations only
npx prisma migrate deploy
```

The seed creates:

- One hotel (`Buffalo Hotel`)
- Default admin user: `admin@buffalo-hotel.co.tz` / `Admin@2026!`
- Built-in roles: `admin`, `receptionist`, `housekeeping`, `waiter`
- Rooms, guests, bookings, store items, staff, companies, and sample data

### 4.4 Running the App

```bash
# Terminal 1 — API
cd apps/api
npm run dev

# Terminal 2 — Web dashboard
cd apps/web
npm run dev

# Terminal 3 — Guest portal (optional)
cd buffalo-guest
# follow its own README / serve static files on port 5501
```

Open the dashboard at `http://localhost:3000`.

---

## 5. Authentication & Authorization

### 5.1 Login Flow

1. User enters email and password on `/login`.
2. API validates credentials and returns:
   - `accessToken` (JWT, 15 min)
   - `refreshToken` (HTTP-only cookie, 7 days)
   - User object with `role`
3. Web stores the access token and attaches it to every API request.
4. Token refresh happens automatically via an Axios interceptor when the access token expires.

### 5.2 Roles & Permissions

StayFlow uses a permission-based system. Built-in roles are mapped to permission arrays; admins can also create custom roles.

| Built-in Role | Typical Use |
|---------------|-------------|
| `admin` | Owner / manager — full access |
| `receptionist` | Front desk — bookings, check-in/out, payments, POS, invoices |
| `housekeeping` | Room status, service requests, view store |
| `waiter` | POS charges, guest portal food orders |

Key permission codes:

```text
bookings:view / bookings:manage / bookings:checkin / bookings:checkout / bookings:extend
guests:view / guests:manage
rooms:view / rooms:manage
housekeeping:view / housekeeping:manage
pos:view / pos:charge / pos:checkout / pos:void
payments:record / payments:view
invoices:view / invoices:manage
companies:view / companies:manage
store:view / store:manage
staff:view / staff:manage
payroll:view / payroll:manage
reports:view
settings:view / settings:manage
guest_portal:orders / guest_portal:requests
developer:manage
```

Middleware `requirePermission(...)` guards each route. If a user lacks permission, the API returns `403 Forbidden` with message `Huna ruhusa kwa kitendo hiki`.

---

## 6. Database Highlights

### 6.1 Core Models

- `Hotel` — single hotel record per deployment (systemHotel pattern).
- `User` — staff accounts.
- `Role` — custom or built-in roles with JSON permission array.
- `Guest` — guest profiles.
- `GuestAccount` — guest portal credentials (email/password, optional).
- `Room` — room inventory.
- `Booking` — reservations, linked to room, guest, company.
- `Invoice` + `InvoiceBooking` — invoices linked to one or more bookings.
- `Payment` — payments recorded against bookings.
- `RoomCharge` + `RoomChargeItem` — POS/folio charges.
- `StoreItem`, `Supplier`, `PurchaseOrder`, `StoreTransaction` — inventory.
- `StaffProfile`, `Shift`, `LeaveRequest`, `PayrollRecord` — HR.
- `Company` — corporate clients.
- `Expense` — operational expenses.
- `Notification`, `Webhook`, `ApiKey`, `ApiLog` — notifications & developer tools.

### 6.2 Double-Booking Protection

A database-level exclusion constraint (`no_overlapping_bookings`) plus an application-level `availabilityService` check prevent two active bookings from overlapping the same room. The API returns a friendly Swahili message if a room is unavailable.

---

## 7. Feature Modules

### 7.1 Dashboard / Overview

**Path:** `/overview`

- KPI cards: total bookings, occupancy rate, revenue, due checkouts
- Today's checkouts list
- Recent activity feed
- Quick-action buttons for new booking, check-in, checkout

### 7.2 Rooms & Availability

**Paths:** `/rooms`, `/room/[roomNumber]`

- Room grid by floor
- Room details: amenities, pricing, current booking, QR code
- Room status workflow: `available` → `occupied` → `dirty` → `cleaning` → `available`
- Block/maintenance rooms
- **Availability check:** `/bookings/availability?checkIn=&checkOut=`

### 7.3 Bookings

**Paths:** `/reservations`, `/reservations/new`, `/reservations/[id]`

Booking types:

- **Individual** — one guest, one room
- **Company** — linked to a corporate account, supports guest lists
- **Conference** — same-day time slots, requires `startTime` and `endTime`

Lifecycle endpoints:

```text
POST   /api/v1/bookings
GET    /api/v1/bookings
GET    /api/v1/bookings/:id
PATCH  /api/v1/bookings/:id
POST   /api/v1/bookings/:id/check-in
POST   /api/v1/bookings/:id/check-out
POST   /api/v1/bookings/:id/extend
DELETE /api/v1/bookings/:id
```

On check-in, an invoice may be generated automatically. On check-out, the final balance is calculated and the room status is updated.

### 7.4 Guests & Guest Portal

**Path:** `/guests`

- Guest CRUD with contact info, ID, nationality
- Activate guest portal account (sends email/SMS credentials)
- View booking history

**Guest Portal (`/api/guest`):**

- `POST /login` — returns `token`
- `GET /booking` — current active booking
- `GET /orders` — room service + request history
- `POST /room-service` — order F&B or amenities
- `POST /request` — housekeeping / maintenance request
- `POST /extend` — request extra nights

### 7.5 Point of Sale (POS) / Room Charges

**Path:** `/store/pos`

Waiters and receptionists can post sellable store items to an in-house guest's room. Stock is deducted automatically and a `RoomCharge` is created.

```text
POST /api/v1/pos/charge
GET  /api/v1/pos/folio/:bookingId
```

### 7.6 Invoicing

**Path:** `/invoices`

- **Individual invoice** — linked to a single booking via `InvoiceBooking`
- **Company invoice** — aggregates multiple bookings for one company
- Statuses: `draft`, `sent`, `paid`, `overdue`, `cancelled`
- PDF generation per invoice
- Record invoice payments

```text
POST /api/v1/invoices
POST /api/v1/invoices/company/generate
POST /api/v1/invoices/:id/payment
GET  /api/v1/invoices/:id/pdf
```

### 7.7 Payments

**Path:** `/payments`

Methods supported: `cash`, `card`, `bank_transfer`, `mobile_money`, `mpesa`, `airtel_money`, `tigo_pesa`, `halo_pesa`, `mixx`, `other`.

Gateway references are stored in `gatewayName` + `gatewayRef` for reconciliation.

```text
POST /api/v1/payments
GET  /api/v1/payments/booking/:bookingId
```

### 7.8 Store / Inventory

**Paths:** `/store`, `/store/items`, `/store/suppliers`, `/store/purchase-orders`, `/store/transactions`

- Items: F&B and hotel inventory, with `isSellable` flag for POS
- Stock IN/OUT/ADJUSTMENT/WASTAGE transactions
- Suppliers and purchase orders
- Low-stock alerts

### 7.9 Staff Management

**Paths:** `/staff`, `/staff/leaves`, `/staff/payroll`, `/staff/roles`

- Staff accounts with `StaffProfile`
- Shift clock-in / clock-out
- Leave requests and approval
- Tanzania payroll calculation (PAYE, NSSF employee/employer, WCF)
- Payslip PDF

### 7.10 Companies

**Paths:** `/companies`, `/companies/[id]`

- Corporate client accounts
- Link bookings to a company
- Generate consolidated company invoices

### 7.11 Accounting

**Paths:** `/accounting/expenses`, `/accounting/revenue`

- Record operational expenses by category
- Revenue reporting from bookings and payments

### 7.12 Reports & Search

**Path:** `/overview`, `/reports/*`

- Dashboard summary: `/api/v1/reports/summary`
- Search across bookings, guests, rooms, companies: `/api/v1/search?q=`

### 7.13 AI Assistant — Buffalo

**Path:** `/advisor`

Buffalo provides natural-language help for staff. AI settings (model, prompt, API key) are configurable under `/settings`.

### 7.14 Developer Tools

**Path:** `/developer`

- API key management with scoped permissions
- Webhook subscriptions and delivery logs
- API request logs
- Metadata endpoint: `/api/v1/developer/metadata`

### 7.15 Public API & Website

- `GET /api/v1/public/hotels/:slug` — public hotel info
- `GET /api/v1/ext/*` — external/public endpoints for widgets and websites
- `POST /api/v1/payments/snippe/webhook` — payment gateway callbacks

---

## 8. Testing

StayFlow has three test layers:

### 8.1 API Unit Tests

```bash
cd apps/api
npx vitest run
```

Covers: roles, availability, auth, rooms, payroll, permission middleware.

### 8.2 API Integration Tests

```bash
# Make sure the API is running on localhost:5000
cd apps/api
npm run dev
npx vitest run src/tests/integration.test.ts
```

Integration tests exercise the full API surface: auth, bookings, payments, POS, invoices, store, staff, companies, expenses, search, AI, guest portal, webhooks, and role-based permissions.

### 8.3 Web E2E Tests

```bash
cd apps/web
# Start web (port 3000) and API (port 5000) first
npx playwright test
```

Smoke tests cover login, navigation, and theme toggle.

---

## 9. Deployment

### 9.1 Local Production Build

```bash
# API
cd apps/api
npm run build
npm start            # runs migrate deploy + dist/server.js

# Web
cd apps/web
npm run build
npm start            # serves on port 3000
```

### 9.2 Railway Production Checklist

1. Push code to GitHub.
2. Connect Railway project to the repo (separate services for web + API).
3. Set environment variables in Railway dashboard.
4. **Reset the production database** (one-time after the schema refactor):
   - Drop/create PostgreSQL database
   - Run `npx prisma migrate deploy`
   - Run `npm run db:seed:prod`
5. For subsequent deploys, `prisma migrate deploy` runs automatically via `npm start`.
6. Configure custom domains:
   - Web: `https://buffalo-hotel-managment-system.up.railway.app`
   - Guest portal: `https://guest-portal-production.up.railway.app`

### 9.3 Migration Notes

The project now uses a single fresh initial migration (`20260704170500_init_schema_refactor`). Do **not** restore old migrations. For any new schema change, create a new migration with:

```bash
npx prisma migrate dev --name <change_name>
```

---

## 10. Security & Operations

- All passwords are bcrypt-hashed.
- JWT access tokens are short-lived; refresh tokens are HTTP-only cookies.
- API routes are protected by authentication + permission checks.
- Helmet and CORS are configured.
- Guest passport/ID data should be hosted in an African region when legally required (AWS `af-south-1` recommended).
- Keep `.env` files out of Git; use Railway/CI secrets.
- Rotate API keys and webhook secrets regularly.

---

## 11. Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| `ECONNREFUSED ::1:5000` | API server not running | Start `apps/api` with `npm run dev` |
| `P5002` / migration errors | Old migrations conflict | Reset DB and re-run fresh migration + seed |
| `403 Forbidden` | Missing role permission | Check user's role permissions in `/staff/roles` |
| `409 Conflict` on booking | Room unavailable | Pick different dates or use availability endpoint |
| Guest portal login fails | Token key mismatch | Use `res.body.token`, not `accessToken` |
| Playwright timeout | Dev server slow | Retry with `--retries=1` |

---

## 12. Useful Commands

```bash
# Root
npm install                 # install all workspace dependencies
npm run db:seed:prod        # reset + seed API DB

# API
cd apps/api
npm run dev                 # ts-node dev server
npx prisma studio           # browse DB
npx prisma migrate deploy   # deploy migrations
npx vitest run              # run all API tests

# Web
cd apps/web
npm run dev                 # Next.js dev server
npm run build               # production build
npx playwright test         # E2E tests
```

---

*For step-by-step operational instructions, see `docs/SOP.md`.*
