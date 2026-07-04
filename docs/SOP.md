# StayFlow Standard Operating Procedures (SOP)

> **Audience:** Hotel staff, managers, and system administrators  
> **Goal:** Step-by-step instructions for every common operation, organized by role.

---

## 1. Roles & Access Summary

| Role | Who | Can Do | Cannot Do |
|------|-----|--------|-----------|
| **Admin** | Owner / Manager | Everything: users, roles, settings, payroll, reports, developer tools | — |
| **Receptionist** | Front desk | Bookings, check-in/out, payments, POS, invoices, guests, companies, reports | Payroll approval, settings, role management |
| **Housekeeping** | Room attendants | Update room status, view service requests, view store | Bookings, payments, POS, invoices |
| **Waiter** | F&B staff | Post POS charges to rooms, view guest portal orders | Bookings, payments, invoices, settings |

Always log in at `/login`. If you see `Huna ruhusa kwa kitendo hiki`, your role does not have permission — ask an Admin.

---

## 2. Universal Rules

1. **Verify the guest's identity** before checking them in, recording payments, or posting charges.
2. **Never share your password.** Admins can reset staff passwords from `/staff`.
3. **Record every payment immediately** to keep the guest folio accurate.
4. **Check room availability** before creating or extending a booking.
5. **Close the cash drawer / end shift** after recording all payments.
6. **Mark rooms dirty** after checkout so housekeeping knows to clean them.

---

## 3. Admin SOPs

### 3.1 First-Time Hotel Setup

1. Log in as the seeded admin: `admin@buffalo-hotel.co.tz` / `Admin@2026!`.
2. Go to **Settings** (`/settings`).
   - Confirm hotel name, address, phone, email, currency (TZS), timezone.
   - Upload logo.
3. Go to **Staff > Roles** (`/staff/roles`).
   - Review built-in roles and permissions.
   - Create custom roles if needed (e.g., "Night Manager").
4. Go to **Staff** (`/staff`).
   - Add every employee with correct role, department, position, and salary.
5. Go to **Rooms** (`/rooms`).
   - Add/verify all rooms, floors, room types, capacity, and pricing.
6. Go to **Store** (`/store/items`).
   - Add sellable POS items and hotel inventory items.
7. Go to **Companies** (`/companies`).
   - Add regular corporate clients.

### 3.2 Create or Edit a User / Role

**Path:** `/staff` or `/staff/roles`

1. Click **Add Staff** / **Add Role**.
2. Fill required fields:
   - Staff: full name, email, password, role, department, position, start date, basic salary.
   - Role: name, description, permissions.
3. Click **Save**.
4. To deactivate a user, open the staff record and toggle **Active** off.

### 3.3 Manage Payroll

**Path:** `/staff/payroll`

1. Select month and year.
2. Click **Generate Payroll**.
3. Review each payslip:
   - Basic salary + allowances
   - Deductions: NSSF employee, WCF, PAYE tax
   - Net salary
4. Approve each record.
5. Mark as **Paid** after disbursement.
6. Download payslip PDF if needed.

### 3.4 Configure AI Assistant (Buffalo)

**Path:** `/settings`

1. Open **AI Settings**.
2. Enter the AI provider API key and model name.
3. Customize the system prompt (optional).
4. Save. Staff can now use `/advisor`.

### 3.5 Manage Developer Integrations

**Path:** `/developer`

1. **API Keys** (`/developer/api-keys`):
   - Click **Create Key**, name it, choose scopes, set expiry.
   - Copy the key immediately — it is shown only once.
2. **Webhooks** (`/developer/webhooks`):
   - Click **Create Webhook**, enter URL, choose events (`booking.created`, `invoice.paid`, etc.), set secret.
   - Use delivery logs to debug failed calls.
3. **Logs** (`/developer/logs`) — review recent API requests.

### 3.6 End-of-Day Review

1. Open **Overview** (`/overview`).
2. Check:
   - Total revenue
   - Occupancy rate
   - Due checkouts
   - Pending invoices
3. Open **Accounting > Revenue** (`/accounting/revenue`) for breakdown.
4. Open **Accounting > Expenses** (`/accounting/expenses`) and record any missing expenses.
5. Reconcile payments with physical cash / bank statements.

---

## 4. Receptionist SOPs

### 4.1 Create a New Booking

**Path:** `/reservations` → **New Booking**, or `/reservations/new`

1. Search availability:
   - Select check-in and check-out dates.
   - Click **Check Availability**.
2. Select an available room.
3. Choose booking type:
   - **Individual** — select existing guest or create new guest.
   - **Company** — select company, then add at least one guest.
   - **Conference** — select conference room, enter start/end time.
4. Enter guest details, number of adults/children, and special requests.
5. Review pricing breakdown.
6. Click **Create Booking**.
7. Give the guest the booking reference (e.g., `BUF-2026-123`).

### 4.2 Record a Payment

**Path:** `/payments` or inside a booking detail

1. Open the booking.
2. Click **Record Payment**.
3. Select method: cash, card, mobile money, bank transfer.
4. Enter amount and notes.
5. If mobile money, enter gateway reference if available.
6. Click **Save**. The folio balance updates immediately.

### 4.3 Check-In a Guest

**Path:** `/reservations` → booking detail

1. Locate the booking (search by guest name or booking ref).
2. Verify the guest's ID/passport matches the booking.
3. Click **Check In**.
4. Confirm room number and rate.
5. (Optional) Record a deposit payment now.
6. Hand over the key / access card.

### 4.4 Post a POS Charge to a Room

**Path:** `/store/pos`

1. Select the in-house booking or room number.
2. Search the sellable item (food, beverage, amenity).
3. Enter quantity.
4. Click **Add Charge**.
5. Stock is deducted automatically and the charge appears on the guest folio.

### 4.5 Extend a Stay

**Path:** `/reservations/[id]`

1. Open the checked-in booking.
2. Click **Extend Stay**.
3. Enter number of extra nights and reason.
4. Confirm the room is available for the extended dates.
5. Record any additional payment if required.

### 4.6 Check-Out a Guest

**Path:** `/reservations/[id]`

1. Open the checked-in booking.
2. Click **Check Out**.
3. Review the final folio and ensure all charges are posted.
4. Collect any remaining balance (or refund overpayment).
5. Click **Complete Checkout**.
6. The room status changes to `dirty` automatically.
7. Generate/print the final invoice if requested.

### 4.7 Create or Send an Invoice

**Path:** `/invoices`

1. Click **New Invoice**.
2. Choose type:
   - **Individual** — select booking.
   - **Company** — select company and booking(s), then click **Generate Company Invoice**.
3. Review amount, tax, and total.
4. Click **Save** or **Send**.
5. To record a partial payment on an invoice, open it and click **Record Payment**.

### 4.8 Handle a Guest Request / Complaint

1. If logged through the guest portal, it appears under **Guest Portal > Requests** (`/guest-portal/requests`).
2. For phone/walk-in requests, create a note on the booking or a room charge if billable.
3. Assign housekeeping or maintenance as needed.
4. Mark request as resolved when complete.

### 4.9 Cancel or Modify a Booking

**Path:** `/reservations/[id]`

1. Open the booking.
2. For modifications (dates/room), click **Edit** and re-check availability.
3. For cancellation, click **Cancel**, enter reason, and confirm refund policy.
4. If a payment was made, process refund per hotel policy.

### 4.10 End-of-Shift Handover

1. Open **Payments** (`/payments`) and filter by your shift time.
2. Total cash, card, and mobile money payments.
3. Note any open balances or unresolved checkout.
4. Pass unresolved items to the next shift in writing.

---

## 5. Housekeeping SOPs

### 5.1 Update Room Status

**Path:** `/housekeeping`

1. View the room grid showing current status.
2. Click the room to update.
3. Change status:
   - `dirty` → `cleaning` when you start cleaning
   - `cleaning` → `available` when finished
   - `available` → `blocked` only if instructed by maintenance/management
4. Add a note if repairs or supplies are needed.

### 5.2 Respond to Service Requests

**Path:** `/guest-portal/requests` or `/housekeeping`

1. View open requests (towels, cleaning, maintenance).
2. Click **Assign to Me** or **Assign** to another staff member.
3. Complete the task.
4. Mark the request as **Resolved**.
5. If the request requires a charge (e.g., extra amenities), inform reception to post it via POS.

### 5.3 Log Consumption / Stock Out

**Path:** `/store/transactions`

1. Click **New Transaction**.
2. Choose transaction type: `STOCK_OUT` or `WASTAGE`.
3. Select item, quantity, and reason/department.
4. Save. Stock balance updates immediately.

---

## 6. Waiter SOPs

### 6.1 Post a Food / Beverage Charge

**Path:** `/store/pos`

1. Select the room or booking.
2. Search for the menu item.
3. Enter quantity.
4. Click **Charge to Room**.
5. Confirm the item appears in the guest folio.

### 6.2 View Guest Portal Orders

**Path:** `/guest-portal/orders`

1. View pending room-service orders placed by guests.
2. Click **Accept** or **Mark Preparing**.
3. When ready, mark **Delivered**.
4. If an item is unavailable, inform reception to cancel/refund the order.

### 6.3 End-of-Shift Summary

1. Review all POS charges posted during your shift (`/store/pos`).
2. Report any discrepancies to the receptionist or manager.
3. Ensure the kitchen/bar stock matches the system.

---

## 7. Guest Self-Service SOP (Guest Portal)

**URL:** Provided by the hotel (e.g., `https://guest.buffalohotel.co.tz`)

### 7.1 Log In

1. Open the guest portal link.
2. Enter the email and temporary password provided at check-in.
3. Change your password if prompted.

### 7.2 View My Booking

- Dashboard shows room number, check-in/out dates, number of guests, and balance.

### 7.3 Order Room Service

1. Go to **Room Service**.
2. Browse menu items.
3. Add items to cart, enter quantity, and add notes.
4. Confirm order. Charges are posted to your room.

### 7.4 Request Housekeeping / Maintenance

1. Go to **Requests**.
2. Choose request type (housekeeping, maintenance, other).
3. Enter details (e.g., "Need extra towels").
4. Submit.

### 7.5 Request a Stay Extension

1. Go to **Extend Stay**.
2. Enter number of extra nights and reason.
3. Submit. Reception will confirm availability and rate.

---

## 8. Common Workflows Across Roles

### 8.1 Corporate Booking & Invoicing

**Roles:** Receptionist creates booking; Admin/Manager generates invoice.

1. Receptionist creates a **Company** booking and selects the company.
2. Add all guest names.
3. Repeat for each room/night as needed.
4. Admin/Manager opens **Invoices** (`/invoices`).
5. Click **Generate Company Invoice**.
6. Select company and the booking(s) to include.
7. Review total, save/send.
8. Record company payment against the invoice when received.

### 8.2 Handling a No-Show

1. Receptionist opens the booking after the expected check-in time.
2. Click **Cancel**.
3. Select reason: "No-show".
4. Apply hotel no-show policy (charge first night if required).

### 8.3 Refund Process

1. Admin or Receptionist opens the booking/payment record.
2. Record a negative payment or refund transaction with method.
3. Update invoice status if applicable.
4. Process actual refund through bank/cash drawer.

### 8.4 Low Stock Alert

1. Any staff sees alert on **Store** dashboard.
2. Housekeeping/Reception reports to Manager.
3. Manager creates a **Purchase Order** (`/store/purchase-orders`) from the supplier.
4. When goods arrive, receive the PO and stock is updated.

---

## 9. Do's and Don'ts

### Do

- Log every payment and charge immediately.
- Verify guest identity at check-in.
- Check room availability before promising a room.
- Mark rooms dirty after checkout.
- Keep passwords private.
- Back up/export important reports weekly.

### Don't

- Don't delete bookings — cancel them with a reason.
- Don't post POS charges to the wrong room.
- Don't manually edit stock without a transaction.
- Don't approve payroll without reviewing payslips.
- Don't share API keys or webhook secrets.

---

## 10. Escalation & Support

| Issue | Who to Contact |
|-------|----------------|
| Forgot password / locked out | Admin |
| Missing permission | Admin |
| Payment gateway not working | Admin / Developer support |
| Double booking suspected | Admin + Reception supervisor |
| Payroll calculation looks wrong | Admin |
| System error / bug | Developer / IT support |
| Data export needed | Admin |

---

## 11. Quick Reference: Permissions by Role

| Permission | Admin | Receptionist | Housekeeping | Waiter |
|------------|:-----:|:------------:|:------------:|:------:|
| `bookings:view/manage/checkin/checkout/extend` | ✅ | ✅ | ❌ | ❌ |
| `guests:view/manage` | ✅ | ✅ | ❌ | ❌ |
| `rooms:view/manage` | ✅ | ✅ view | ✅ view | ❌ |
| `housekeeping:view/manage` | ✅ | ✅ view | ✅ | ❌ |
| `pos:view/charge/checkout` | ✅ | ✅ | ❌ | ✅ |
| `payments:record/view` | ✅ | ✅ | ❌ | ❌ |
| `invoices:view/manage` | ✅ | ✅ | ❌ | ❌ |
| `companies:view/manage` | ✅ | ✅ | ❌ | ❌ |
| `store:view/manage` | ✅ | ✅ view | ✅ view | ❌ |
| `staff:view/manage` | ✅ | ❌ | ❌ | ❌ |
| `payroll:view/manage` | ✅ | ❌ | ❌ | ❌ |
| `reports:view` | ✅ | ✅ | ❌ | ❌ |
| `settings:view/manage` | ✅ | ❌ | ❌ | ❌ |
| `guest_portal:orders/requests` | ✅ | ✅ | ✅ requests | ✅ orders |
| `developer:manage` | ✅ | ❌ | ❌ | ❌ |

---

*For technical architecture and deployment details, see `docs/GUIDE.md`.*
