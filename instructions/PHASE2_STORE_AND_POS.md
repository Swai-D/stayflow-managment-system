# STAYFLOW RMS — PHASE 2: STORE MANAGEMENT & POS
## Full Technical Specification for Gemini CLI Implementation

---

## OVERVIEW

Add two deeply integrated modules to StayFlow RMS:
1. **Store & Inventory Management** — F&B stock + Hotel supplies
2. **Point of Sale (POS)** — Post charges to guest room, checkout with invoice

These modules connect with the existing Booking/Guest/Room system built in Phase 1.

---

## ROLES & PERMISSIONS

Use the existing `UserRole` enum. Extend it:

```prisma
enum UserRole {
  admin           // full access everywhere
  receptionist    // full access including POS + checkout
  housekeeping    // view stock only (hotel inventory)
  waiter          // NEW: POS only — post F&B charges to rooms
}
```

**Permission matrix:**

| Feature                  | admin | receptionist | waiter | housekeeping |
|--------------------------|-------|--------------|--------|--------------|
| View store dashboard     | ✅    | ✅           | ❌     | ✅ (read)    |
| Add/Edit store items     | ✅    | ✅           | ❌     | ❌           |
| Post charge to room (POS)| ✅    | ✅           | ✅     | ❌           |
| Approve purchase orders  | ✅    | ❌           | ❌     | ❌           |
| Create purchase orders   | ✅    | ✅           | ❌     | ❌           |
| View guest folio         | ✅    | ✅           | ❌     | ❌           |
| Process checkout         | ✅    | ✅           | ❌     | ❌           |

---

## PART 1 — DATABASE SCHEMA

Add to `prisma/schema.prisma`:

```prisma
// ─── STORE ────────────────────────────────────────────────

model Supplier {
  id            String    @id @default(cuid())
  name          String
  phone         String
  email         String?
  address       String?
  paymentTerms  String?   // e.g. "30 days net"
  notes         String?
  isActive      Boolean   @default(true)
  items         StoreItem[]
  purchaseOrders PurchaseOrder[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model StoreItem {
  id            String        @id @default(cuid())
  name          String
  sku           String?       @unique
  category      StoreCategory // FB or HOTEL
  subCategory   String        // e.g. "Beverages", "Linen"
  unit          StockUnit     // KG, LTR, PCS, BOX, DOZEN, BOTTLE
  currentStock  Float         @default(0)
  minimumStock  Float         // triggers low stock alert
  maximumStock  Float
  unitCost      Float         // TZS — cost price
  sellingPrice  Float?        // TZS — for POS (F&B items)
  supplierId    String?
  supplier      Supplier?     @relation(fields: [supplierId], references: [id])
  location      String?       // "Kitchen", "Bar", "Housekeeping Store"
  isActive      Boolean       @default(true)
  isSellable    Boolean       @default(false) // true = appears in POS
  transactions  StoreTransaction[]
  orderItems    PurchaseOrderItem[]
  roomChargeItems RoomChargeItem[]
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}

model StoreTransaction {
  id            String            @id @default(cuid())
  itemId        String
  item          StoreItem         @relation(fields: [itemId], references: [id])
  type          TransactionType   // STOCK_IN, STOCK_OUT, ADJUSTMENT, WASTAGE
  quantity      Float
  unitCost      Float?            // cost at time of transaction
  balanceBefore Float             // stock before
  balanceAfter  Float             // stock after
  reference     String?           // PO number, booking ref, etc
  notes         String?
  performedById String
  performedBy   User              @relation(fields: [performedById], references: [id])
  createdAt     DateTime          @default(now())
}

model PurchaseOrder {
  id              String          @id @default(cuid())
  poNumber        String          @unique // PO-2025-001
  status          POStatus        @default(DRAFT)
  supplierId      String
  supplier        Supplier        @relation(fields: [supplierId], references: [id])
  items           PurchaseOrderItem[]
  totalAmount     Float
  notes           String?
  expectedDelivery DateTime?
  receivedAt      DateTime?
  createdById     String
  createdBy       User            @relation(fields: [createdById], references: [id])
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
}

model PurchaseOrderItem {
  id              String        @id @default(cuid())
  purchaseOrderId String
  purchaseOrder   PurchaseOrder @relation(fields: [purchaseOrderId], references: [id])
  itemId          String
  item            StoreItem     @relation(fields: [itemId], references: [id])
  quantityOrdered Float
  quantityReceived Float        @default(0)
  unitCost        Float
  totalCost       Float
}

// ─── POS / ROOM CHARGES ──────────────────────────────────

model RoomCharge {
  id          String            @id @default(cuid())
  bookingId   String
  booking     Booking           @relation(fields: [bookingId], references: [id])
  items       RoomChargeItem[]
  totalAmount Float
  status      ChargeStatus      @default(OPEN)  // OPEN | SETTLED
  notes       String?
  postedById  String
  postedBy    User              @relation(fields: [postedById], references: [id])
  settledAt   DateTime?
  createdAt   DateTime          @default(now())
}

model RoomChargeItem {
  id            String      @id @default(cuid())
  roomChargeId  String
  roomCharge    RoomCharge  @relation(fields: [roomChargeId], references: [id])
  itemId        String
  item          StoreItem   @relation(fields: [itemId], references: [id])
  itemName      String      // snapshot at time of charge
  quantity      Float
  unitPrice     Float       // selling price at time of charge
  totalPrice    Float
}

// ─── ENUMS ────────────────────────────────────────────────

enum StoreCategory {
  FB      // Food & Beverage
  HOTEL   // Hotel Inventory
}

enum StockUnit {
  KG
  LTR
  PCS
  BOX
  DOZEN
  BOTTLE
  PACK
  ROLL
}

enum TransactionType {
  STOCK_IN      // received delivery
  STOCK_OUT     // issued to department
  ADJUSTMENT    // stock count correction
  WASTAGE       // spoilage / damage
}

enum POStatus {
  DRAFT
  SUBMITTED
  APPROVED
  SENT_TO_SUPPLIER
  RECEIVED
  CLOSED
}

enum ChargeStatus {
  OPEN        // on guest tab, not yet paid
  SETTLED     // paid at checkout
}
```

**Also add to existing Booking model:**
```prisma
// Inside model Booking { ... }
roomCharges   RoomCharge[]
balanceDue    Float   @default(0)  // if not already present
```

**Also add to existing User model:**
```prisma
// Inside model User { ... }
storeTransactions StoreTransaction[]
purchaseOrders    PurchaseOrder[]
roomChargesPosted RoomCharge[]
```

---

## PART 2 — SEED DATA

Add to `prisma/seed.ts`:

```typescript
// ── Suppliers ────────────────────────────────────────────
const suppliers = await Promise.all([
  prisma.supplier.create({ data: {
    name: 'Morogoro General Supplies',
    phone: '+255712000001',
    email: 'supplies@mgs.co.tz',
    paymentTerms: '30 days net',
  }}),
  prisma.supplier.create({ data: {
    name: 'Tanzania Breweries Ltd',
    phone: '+255712000002',
    paymentTerms: '14 days net',
  }}),
  prisma.supplier.create({ data: {
    name: 'Karibu Textiles',
    phone: '+255712000003',
    paymentTerms: 'Cash on delivery',
  }}),
])

// ── F&B Items ─────────────────────────────────────────────
const fbItems = [
  // Beverages — sellable (appear in POS)
  { name: 'Serengeti Beer (500ml)', subCategory: 'Bar Stock', unit: 'BOTTLE',
    currentStock: 48, minimumStock: 24, maximumStock: 120,
    unitCost: 1800, sellingPrice: 3500, isSellable: true,
    supplierId: suppliers[1].id, location: 'Bar' },
  { name: 'Kilimanjaro Beer (500ml)', subCategory: 'Bar Stock', unit: 'BOTTLE',
    currentStock: 36, minimumStock: 24, maximumStock: 120,
    unitCost: 1800, sellingPrice: 3500, isSellable: true,
    supplierId: suppliers[1].id, location: 'Bar' },
  { name: 'Coca Cola (300ml)', subCategory: 'Beverages', unit: 'BOTTLE',
    currentStock: 60, minimumStock: 30, maximumStock: 150,
    unitCost: 600, sellingPrice: 1500, isSellable: true,
    supplierId: suppliers[0].id, location: 'Bar' },
  { name: 'Mineral Water (500ml)', subCategory: 'Beverages', unit: 'BOTTLE',
    currentStock: 80, minimumStock: 40, maximumStock: 200,
    unitCost: 400, sellingPrice: 1000, isSellable: true,
    supplierId: suppliers[0].id, location: 'Bar' },
  { name: 'Fresh Juice (Orange)', subCategory: 'Beverages', unit: 'PCS',
    currentStock: 20, minimumStock: 10, maximumStock: 50,
    unitCost: 1500, sellingPrice: 4000, isSellable: true,
    supplierId: suppliers[0].id, location: 'Kitchen' },
  // Food
  { name: 'Breakfast Plate (Full)', subCategory: 'Food', unit: 'PCS',
    currentStock: 999, minimumStock: 0, maximumStock: 999,
    unitCost: 3000, sellingPrice: 8000, isSellable: true,
    supplierId: suppliers[0].id, location: 'Kitchen' },
  { name: 'Chips (Portion)', subCategory: 'Food', unit: 'PCS',
    currentStock: 999, minimumStock: 0, maximumStock: 999,
    unitCost: 1000, sellingPrice: 3000, isSellable: true,
    supplierId: suppliers[0].id, location: 'Kitchen' },
  { name: 'Rice (25kg bag)', subCategory: 'Dry Foods', unit: 'KG',
    currentStock: 75, minimumStock: 25, maximumStock: 200,
    unitCost: 2200, sellingPrice: null, isSellable: false,
    supplierId: suppliers[0].id, location: 'Kitchen Store' },
  { name: 'Cooking Oil (20L)', subCategory: 'Dry Foods', unit: 'LTR',
    currentStock: 40, minimumStock: 20, maximumStock: 100,
    unitCost: 4500, sellingPrice: null, isSellable: false,
    supplierId: suppliers[0].id, location: 'Kitchen Store' },
]

// ── Hotel Inventory Items ─────────────────────────────────
const hotelItems = [
  { name: 'Bath Towel (Large)', subCategory: 'Linen & Towels', unit: 'PCS',
    currentStock: 20, minimumStock: 16, maximumStock: 40,
    unitCost: 8000, sellingPrice: null, isSellable: false,
    supplierId: suppliers[2].id, location: 'Housekeeping Store' },
  { name: 'Bed Sheet (King)', subCategory: 'Linen & Towels', unit: 'PCS',
    currentStock: 12, minimumStock: 8, maximumStock: 24,
    unitCost: 15000, sellingPrice: null, isSellable: false,
    supplierId: suppliers[2].id, location: 'Housekeeping Store' },
  { name: 'Pillow Case', subCategory: 'Linen & Towels', unit: 'PCS',
    currentStock: 24, minimumStock: 16, maximumStock: 48,
    unitCost: 4000, sellingPrice: null, isSellable: false,
    supplierId: suppliers[2].id, location: 'Housekeeping Store' },
  { name: 'Shower Gel (50ml)', subCategory: 'Bathroom Amenities', unit: 'PCS',
    currentStock: 8, minimumStock: 20, maximumStock: 80,
    unitCost: 1200, sellingPrice: null, isSellable: false,
    supplierId: suppliers[0].id, location: 'Housekeeping Store' },
  { name: 'Toilet Soap (bar)', subCategory: 'Bathroom Amenities', unit: 'PCS',
    currentStock: 15, minimumStock: 20, maximumStock: 80,
    unitCost: 800, sellingPrice: null, isSellable: false,
    supplierId: suppliers[0].id, location: 'Housekeeping Store' },
  { name: 'Toilet Paper (roll)', subCategory: 'Bathroom Amenities', unit: 'ROLL',
    currentStock: 30, minimumStock: 24, maximumStock: 100,
    unitCost: 500, sellingPrice: null, isSellable: false,
    supplierId: suppliers[0].id, location: 'Housekeeping Store' },
  { name: 'Floor Cleaner (5L)', subCategory: 'Cleaning Supplies', unit: 'LTR',
    currentStock: 10, minimumStock: 10, maximumStock: 40,
    unitCost: 3500, sellingPrice: null, isSellable: false,
    supplierId: suppliers[0].id, location: 'Housekeeping Store' },
  { name: 'Garbage Bags (roll)', subCategory: 'Cleaning Supplies', unit: 'ROLL',
    currentStock: 5, minimumStock: 6, maximumStock: 24,
    unitCost: 2000, sellingPrice: null, isSellable: false,
    supplierId: suppliers[0].id, location: 'Housekeeping Store' },
]

// Create all items
for (const item of [...fbItems, ...hotelItems]) {
  await prisma.storeItem.create({
    data: { ...item, category: fbItems.includes(item) ? 'FB' : 'HOTEL' }
  })
}
```

---

## PART 3 — API ROUTES

### 3A. Store Items — `apps/api/src/routes/store.router.ts`

```
GET    /api/store/items              — list all (filter: category, subCategory, status)
POST   /api/store/items              — create item
GET    /api/store/items/:id          — get single
PATCH  /api/store/items/:id          — update item
DELETE /api/store/items/:id          — soft delete (isActive = false)
GET    /api/store/items/low-stock    — items below minimumStock
GET    /api/store/items/:id/history  — transaction history for item
```

### 3B. Transactions

```
GET    /api/store/transactions       — list (filter: type, itemId, date range)
POST   /api/store/transactions       — create (STOCK_IN / STOCK_OUT / ADJUSTMENT / WASTAGE)
```

**POST /api/store/transactions logic:**
```typescript
// Must be atomic — update stock + create transaction record together
await prisma.$transaction([
  prisma.storeItem.update({
    where: { id: body.itemId },
    data: {
      currentStock: {
        increment: type === 'STOCK_IN' ? quantity : -quantity
      }
    }
  }),
  prisma.storeTransaction.create({ data: { ...body, balanceBefore, balanceAfter } })
])
```

### 3C. Purchase Orders

```
GET    /api/store/purchase-orders          — list all POs
POST   /api/store/purchase-orders          — create new PO
GET    /api/store/purchase-orders/:id      — get single PO
PATCH  /api/store/purchase-orders/:id/status — update status
POST   /api/store/purchase-orders/auto-generate — auto-create draft PO from all low-stock items
POST   /api/store/purchase-orders/:id/receive   — mark as received (triggers STOCK_IN transactions)
```

**Auto-generate PO logic:**
```typescript
// Group low-stock items by supplier
// Create one PO per supplier
// quantity to order = maximumStock - currentStock
const lowStockItems = await prisma.storeItem.findMany({
  where: { currentStock: { lt: prisma.storeItem.fields.minimumStock } }
})
// Group by supplierId → create PO per supplier
```

### 3D. Suppliers

```
GET    /api/store/suppliers     — list all
POST   /api/store/suppliers     — create
PATCH  /api/store/suppliers/:id — update
```

### 3E. POS — Room Charges

```
GET    /api/pos/items                    — sellable items only (isSellable: true)
GET    /api/pos/active-bookings          — checked-in bookings for room selector
POST   /api/pos/charge                   — post charge to room
GET    /api/pos/folio/:bookingId         — get all charges for a booking
DELETE /api/pos/charge/:chargeId         — void a charge (admin only)
POST   /api/pos/checkout/:bookingId      — settle all charges + generate invoice
```

**POST /api/pos/charge body:**
```typescript
{
  bookingId: string
  items: Array<{
    itemId: string
    quantity: number
  }>
  notes?: string
}
```

**POST /api/pos/charge logic:**
```typescript
// 1. Validate booking is checked_in
// 2. Calculate totals
// 3. Create RoomCharge + RoomChargeItems
// 4. Create STOCK_OUT transactions for each item
// 5. Update booking.balanceDue += totalAmount
// All in prisma.$transaction([...])
```

### 3F. Dashboard Stats

```
GET /api/store/dashboard
```

**Returns:**
```typescript
{
  totalItems: number
  lowStockCount: number
  outOfStockCount: number
  monthlySpend: number          // sum of STOCK_IN costs this month
  topUsedItems: Array<{         // top 5 by STOCK_OUT quantity this month
    item: StoreItem
    totalUsed: number
  }>
  recentTransactions: StoreTransaction[]  // last 10
  lowStockItems: StoreItem[]              // below minimum
  pendingPOs: number
}
```

### 3G. Invoice Generation

```
GET /api/pos/invoice/:bookingId   — generate invoice data (JSON)
GET /api/pos/invoice/:bookingId/pdf — generate PDF invoice
```

**Invoice structure:**
```typescript
{
  invoiceNumber: string      // INV-2025-001
  hotel: {
    name: 'Buffalo Hotel'
    address: 'Morogoro, Tanzania'
    phone: string
    email: string
  }
  guest: {
    name: string
    phone: string
    nationality: string
  }
  booking: {
    ref: string
    room: string
    roomType: string
    checkIn: string
    checkOut: string
    nights: number
  }
  charges: {
    accommodation: number     // nights × pricePerNight
    roomCharges: Array<{      // F&B and other charges
      date: string
      description: string
      quantity: number
      unitPrice: number
      total: number
    }>
  }
  summary: {
    subtotal: number
    tax: number               // 0 for now — can add later
    total: number
    amountPaid: number
    balanceDue: number
  }
  paymentMethod: string       // Cash | M-Pesa | Airtel | Bank Transfer
  issuedAt: string
  issuedBy: string
}
```

---

## PART 4 — FRONTEND ROUTES

Add these pages to `apps/web/app/(dashboard)/`:

```
store/
  page.tsx                    ← Store Dashboard
  items/
    page.tsx                  ← Items list + modals
  transactions/
    page.tsx                  ← Transaction log
  purchase-orders/
    page.tsx                  ← PO list + create/receive
  suppliers/
    page.tsx                  ← Suppliers list
  pos/
    page.tsx                  ← POS screen (post to room)
```

**IMPORTANT for UI developer:** Leave all pages with this placeholder — UI will be built separately:

```typescript
// store/page.tsx (and all store pages)
export default function StoreDashboardPage() {
  return (
    <div>
      <h1>Store Dashboard</h1>
      {/* UI — coming from design team */}
    </div>
  )
}
```

---

## PART 5 — REACT QUERY HOOKS

Create `apps/web/hooks/useStore.ts`:

```typescript
// Items
export function useStoreItems(filters?: StoreItemFilters)
export function useStoreItem(id: string)
export function useCreateStoreItem()
export function useUpdateStoreItem()
export function useLowStockItems()

// Transactions
export function useStoreTransactions(filters?: TransactionFilters)
export function useCreateTransaction()

// Purchase Orders
export function usePurchaseOrders()
export function useCreatePurchaseOrder()
export function useUpdatePOStatus()
export function useAutoGeneratePO()
export function useReceivePO()

// Suppliers
export function useSuppliers()
export function useCreateSupplier()

// Dashboard
export function useStoreDashboard()
```

Create `apps/web/hooks/usePOS.ts`:

```typescript
export function usePOSItems()            // sellable items for POS grid
export function useActiveBookings()      // checked-in bookings for room selector
export function usePostCharge()          // post charge to room
export function useGuestFolio(bookingId) // all charges for booking
export function useVoidCharge()          // admin only
export function useCheckout()            // settle + generate invoice
export function useInvoice(bookingId)    // invoice data
```

---

## PART 6 — TYPESCRIPT TYPES

Create `apps/web/types/store.ts`:

```typescript
export type StoreCategory = 'FB' | 'HOTEL'
export type StockUnit = 'KG' | 'LTR' | 'PCS' | 'BOX' | 'DOZEN' | 'BOTTLE' | 'PACK' | 'ROLL'
export type TransactionType = 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT' | 'WASTAGE'
export type POStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'SENT_TO_SUPPLIER' | 'RECEIVED' | 'CLOSED'
export type ChargeStatus = 'OPEN' | 'SETTLED'

export interface StoreItem {
  id: string
  name: string
  sku?: string
  category: StoreCategory
  subCategory: string
  unit: StockUnit
  currentStock: number
  minimumStock: number
  maximumStock: number
  unitCost: number
  sellingPrice?: number
  supplierId?: string
  supplier?: Supplier
  location?: string
  isActive: boolean
  isSellable: boolean
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstocked'
  createdAt: string
}

export interface StoreTransaction {
  id: string
  itemId: string
  item: StoreItem
  type: TransactionType
  quantity: number
  unitCost?: number
  balanceBefore: number
  balanceAfter: number
  reference?: string
  notes?: string
  performedBy: { id: string; fullName: string }
  createdAt: string
}

export interface PurchaseOrder {
  id: string
  poNumber: string
  status: POStatus
  supplier: Supplier
  items: PurchaseOrderItem[]
  totalAmount: number
  notes?: string
  expectedDelivery?: string
  receivedAt?: string
  createdBy: { id: string; fullName: string }
  createdAt: string
}

export interface PurchaseOrderItem {
  id: string
  item: StoreItem
  quantityOrdered: number
  quantityReceived: number
  unitCost: number
  totalCost: number
}

export interface Supplier {
  id: string
  name: string
  phone: string
  email?: string
  address?: string
  paymentTerms?: string
  notes?: string
  isActive: boolean
}

export interface RoomCharge {
  id: string
  bookingId: string
  booking: { bookingRef: string; room: { roomNumber: string }; guest: { fullName: string } }
  items: RoomChargeItem[]
  totalAmount: number
  status: ChargeStatus
  notes?: string
  postedBy: { fullName: string }
  createdAt: string
}

export interface RoomChargeItem {
  id: string
  itemName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  item: StoreItem
}

export interface StoreDashboardStats {
  totalItems: number
  lowStockCount: number
  outOfStockCount: number
  monthlySpend: number
  topUsedItems: Array<{ item: StoreItem; totalUsed: number }>
  recentTransactions: StoreTransaction[]
  lowStockItems: StoreItem[]
  pendingPOs: number
}

export interface Invoice {
  invoiceNumber: string
  hotel: { name: string; address: string; phone: string; email: string }
  guest: { name: string; phone: string; nationality?: string }
  booking: { ref: string; room: string; roomType: string; checkIn: string; checkOut: string; nights: number }
  charges: {
    accommodation: number
    roomCharges: Array<{ date: string; description: string; quantity: number; unitPrice: number; total: number }>
  }
  summary: { subtotal: number; tax: number; total: number; amountPaid: number; balanceDue: number }
  paymentMethod: string
  issuedAt: string
  issuedBy: string
}

// Stock status helper
export const STOCK_STATUS_CONFIG = {
  in_stock:    { label: 'In Stock',     bg: 'bg-green-50',  text: 'text-green-600',  border: 'border-green-100' },
  low_stock:   { label: 'Low Stock',    bg: 'bg-amber-50',  text: 'text-amber-600',  border: 'border-amber-100' },
  out_of_stock:{ label: 'Out of Stock', bg: 'bg-red-50',    text: 'text-red-500',    border: 'border-red-100' },
  overstocked: { label: 'Overstocked', bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-100' },
}

export const TRANSACTION_TYPE_CONFIG = {
  STOCK_IN:    { label: 'Stock In',    bg: 'bg-green-50',  text: 'text-green-600',  icon: '📦' },
  STOCK_OUT:   { label: 'Stock Out',   bg: 'bg-blue-50',   text: 'text-blue-600',   icon: '📤' },
  ADJUSTMENT:  { label: 'Adjustment',  bg: 'bg-gray-100',  text: 'text-gray-600',   icon: '🔧' },
  WASTAGE:     { label: 'Wastage',     bg: 'bg-red-50',    text: 'text-red-500',    icon: '🗑️' },
}

export const PO_STATUS_CONFIG = {
  DRAFT:            { label: 'Draft',              bg: 'bg-gray-100',   text: 'text-gray-500'  },
  SUBMITTED:        { label: 'Submitted',          bg: 'bg-blue-50',    text: 'text-blue-600'  },
  APPROVED:         { label: 'Approved',           bg: 'bg-indigo-50',  text: 'text-indigo-600'},
  SENT_TO_SUPPLIER: { label: 'Sent to Supplier',   bg: 'bg-amber-50',   text: 'text-amber-600' },
  RECEIVED:         { label: 'Received',           bg: 'bg-green-50',   text: 'text-green-600' },
  CLOSED:           { label: 'Closed',             bg: 'bg-gray-100',   text: 'text-gray-400'  },
}
```

---

## PART 7 — SIDEBAR UPDATE

Update `apps/web/components/layout/Sidebar.tsx`.

Add new nav group after ACCOUNTING:

```typescript
{
  section: 'STORE & INVENTORY',
  items: [
    { label: 'Store Dashboard',   href: '/store',                    icon: LayoutGrid },
    { label: 'Items & Stock',     href: '/store/items',              icon: Package },
    { label: 'Transactions',      href: '/store/transactions',       icon: ArrowLeftRight },
    { label: 'Purchase Orders',   href: '/store/purchase-orders',    icon: ShoppingCart },
    { label: 'Suppliers',         href: '/store/suppliers',          icon: Truck },
    { label: 'POS — Post to Room',href: '/store/pos',                icon: CreditCard },
  ]
}
```

Import from lucide-react: `LayoutGrid, Package, ArrowLeftRight, ShoppingCart, Truck, CreditCard`

---

## PART 8 — ALERT SYSTEM

Create `apps/api/src/services/alerts.service.ts`:

```typescript
// Run on a schedule (every day at 7:00 AM)
// Check all items below minimumStock
// Log to console (v1) — email/SMS in v2

export async function checkLowStockAlerts() {
  const lowStockItems = await prisma.storeItem.findMany({
    where: {
      isActive: true,
      currentStock: { lt: prisma.storeItem.fields.minimumStock }
    },
    include: { supplier: true }
  })

  if (lowStockItems.length > 0) {
    console.log(`[ALERT] ${lowStockItems.length} items are below minimum stock`)
    lowStockItems.forEach(item => {
      console.log(`  ⚠️  ${item.name}: ${item.currentStock} ${item.unit} (min: ${item.minimumStock})`)
    })
  }

  return lowStockItems
}
```

Add to `apps/api/src/index.ts`:
```typescript
// Run low stock check every day at 7am
import cron from 'node-cron'
cron.schedule('0 7 * * *', checkLowStockAlerts)
```

Install: `npm install node-cron @types/node-cron --workspace=apps/api`

---

## IMPLEMENTATION ORDER

Gemini should implement in this exact order:

```
Step 1:  Update prisma/schema.prisma — add all new models
Step 2:  Run: npx prisma migrate dev --name add_store_and_pos
Step 3:  Update prisma/seed.ts — add suppliers + store items
Step 4:  Run: npx prisma db seed
Step 5:  Create apps/api/src/services/store.service.ts
Step 6:  Create apps/api/src/services/pos.service.ts
Step 7:  Create apps/api/src/routes/store.router.ts
Step 8:  Create apps/api/src/routes/pos.router.ts
Step 9:  Register routes in apps/api/src/index.ts
Step 10: Create apps/web/types/store.ts
Step 11: Create apps/web/hooks/useStore.ts
Step 12: Create apps/web/hooks/usePOS.ts
Step 13: Create all placeholder store pages (apps/web/app/(dashboard)/store/...)
Step 14: Update Sidebar.tsx — add STORE & INVENTORY section
Step 15: Create apps/api/src/services/alerts.service.ts
Step 16: Add cron job to apps/api/src/index.ts
Step 17: Run full test — npm run dev, test all endpoints
```

---

## TESTING CHECKLIST

After implementation, verify:

```
□ POST /api/store/items — can create item
□ GET /api/store/items/low-stock — returns items below minimum
□ POST /api/store/transactions (STOCK_IN) — stock increases correctly
□ POST /api/store/transactions (STOCK_OUT) — stock decreases correctly
□ Cannot STOCK_OUT more than currentStock (validation error)
□ POST /api/store/purchase-orders/auto-generate — creates POs grouped by supplier
□ POST /api/pos/charge — creates charge, decreases stock, updates booking.balanceDue
□ GET /api/pos/folio/:bookingId — returns all open charges
□ GET /api/pos/invoice/:bookingId — returns complete invoice data
□ POST /api/pos/checkout/:bookingId — settles all charges, status → SETTLED
□ Sidebar shows STORE & INVENTORY section
□ All store routes return 401 if not authenticated
□ Waiter role can only access /api/pos/* endpoints
```

---

## NOTES FOR GEMINI

1. **Prisma atomic transactions** — always use `prisma.$transaction([...])` when updating stock + creating transaction record together. Never update stock without creating a transaction record.

2. **Stock validation** — before STOCK_OUT, check `currentStock >= quantity`. Return 400 if not enough stock.

3. **balanceDue on Booking** — when posting a room charge, always update `booking.balanceDue += totalAmount`. When settling at checkout, `booking.balanceDue = 0` and `roomCharge.status = SETTLED`.

4. **Invoice numbers** — generate sequentially: `INV-2025-001`, `INV-2025-002`. Use a counter in DB or query last invoice number.

5. **PO numbers** — same pattern: `PO-2025-001`.

6. **stockStatus computed field** — calculate in service layer, not stored in DB:
   ```typescript
   const stockStatus = item.currentStock === 0 ? 'out_of_stock'
     : item.currentStock < item.minimumStock ? 'low_stock'
     : item.currentStock > item.maximumStock ? 'overstocked'
     : 'in_stock'
   ```

7. **UI pages** — leave as placeholders only. Design team builds UI separately.

8. **Do not modify** existing booking, room, guest, or auth logic. Only ADD new relations and new routes.
