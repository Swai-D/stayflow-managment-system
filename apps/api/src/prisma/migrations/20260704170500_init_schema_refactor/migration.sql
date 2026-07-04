-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('standard', 'deluxe', 'family', 'suite', 'presidential', 'superior', 'conference', 'twin', 'triple');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('available', 'occupied', 'dirty', 'cleaning', 'maintenance', 'blocked');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show', 'late_checkout');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('online_self', 'staff_entry', 'walk_in');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('mpesa', 'tigo_pesa', 'airtel_money', 'halo_pesa', 'cash', 'bank_transfer', 'visa', 'mastercard');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'completed', 'failed', 'refunded', 'partial');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('booking_confirmation', 'payment_receipt', 'check_in_reminder', 'checkout_reminder', 'review_request', 'cancellation');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('email', 'sms', 'both');

-- CreateEnum
CREATE TYPE "AddonCategory" AS ENUM ('food', 'beverage', 'transport', 'laundry', 'other');

-- CreateEnum
CREATE TYPE "HousekeepingStatus" AS ENUM ('clean', 'dirty', 'cleaning', 'inspected');

-- CreateEnum
CREATE TYPE "IdType" AS ENUM ('national_id', 'passport', 'drivers_license', 'voter_id');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('salary', 'utilities', 'maintenance', 'supplies', 'marketing', 'other');

-- CreateEnum
CREATE TYPE "StoreCategory" AS ENUM ('FB', 'HOTEL');

-- CreateEnum
CREATE TYPE "StockUnit" AS ENUM ('KG', 'LTR', 'PCS', 'BOX', 'DOZEN', 'BOTTLE', 'PACK', 'ROLL');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'WASTAGE');

-- CreateEnum
CREATE TYPE "POStatus" AS ENUM ('PENDING', 'RECEIVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ChargeStatus" AS ENUM ('OPEN', 'SETTLED');

-- CreateEnum
CREATE TYPE "GuestAccountStatus" AS ENUM ('PENDING_ACTIVATION', 'ACTIVE');

-- CreateEnum
CREATE TYPE "RoomServiceOrderStatus" AS ENUM ('PENDING', 'PREPARING', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ServiceRequestType" AS ENUM ('laundry', 'taxi', 'tour', 'housekeeping', 'other');

-- CreateEnum
CREATE TYPE "ServiceRequestStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExtensionRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('active', 'completed', 'absent');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('annual', 'sick', 'emergency', 'maternity', 'unpaid');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('draft', 'approved', 'paid');

-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('individual', 'company');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('individual', 'company');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('draft', 'sent', 'paid', 'cancelled');

-- CreateEnum
CREATE TYPE "AgeCategory" AS ENUM ('adult', 'child');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('full_time', 'part_time', 'contract', 'casual');

-- CreateTable
CREATE TABLE "hotels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "logoUrl" TEXT,
    "wifiName" TEXT,
    "wifiPassword" TEXT,
    "restaurantHours" TEXT,
    "emergencyPhone" TEXT,
    "checkInTime" TEXT NOT NULL DEFAULT '14:00',
    "checkOutTime" TEXT NOT NULL DEFAULT '11:00',
    "defaultLanguage" TEXT NOT NULL DEFAULT 'sw',
    "snippeApiKey" TEXT,
    "snippeWebhookSecret" TEXT,
    "paymentNumbers" JSONB DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hotels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_settings" (
    "hotelId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "openaiKey" TEXT,
    "openaiModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "deepseekKey" TEXT,
    "deepseekModel" TEXT NOT NULL DEFAULT 'deepseek-chat',
    "geminiKey" TEXT,
    "geminiModel" TEXT NOT NULL DEFAULT 'gemini-1.5-flash',
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "maxTokens" INTEGER NOT NULL DEFAULT 2000,
    "systemPrompt" TEXT NOT NULL DEFAULT 'You are Buffalo, a helpful hotel management assistant for Buffalo Hotel. Answer questions about hotel operations, bookings, guests, and staff in a professional manner. Respond in Kiswahili when possible.',
    "language" TEXT NOT NULL DEFAULT 'swahili',
    "responseStyle" TEXT NOT NULL DEFAULT 'professional',
    "includeCharts" BOOLEAN NOT NULL DEFAULT false,
    "autoAnalyze" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_settings_pkey" PRIMARY KEY ("hotelId")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guests" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "idType" "IdType",
    "idNumber" TEXT,
    "nationality" TEXT,
    "notes" TEXT,
    "dashboardOtp" TEXT,
    "otpExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "floor" INTEGER NOT NULL DEFAULT 1,
    "type" "RoomType" NOT NULL,
    "status" "RoomStatus" NOT NULL DEFAULT 'available',
    "pricePerNight" DECIMAL(10,2) NOT NULL,
    "pricePerHour" DECIMAL(10,2),
    "specialRate" DECIMAL(10,2),
    "fullBoardRate" DECIMAL(10,2),
    "nonResidentRate" TEXT,
    "beds" INTEGER NOT NULL DEFAULT 1,
    "capacity" INTEGER NOT NULL DEFAULT 2,
    "description" TEXT,
    "amenities" JSONB NOT NULL DEFAULT '[]',
    "images" JSONB NOT NULL DEFAULT '[]',
    "lockId" TEXT,
    "lockProvider" TEXT,
    "qrCodeToken" TEXT,
    "qrCodeExpiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_rates" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "bookingRef" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "companyId" TEXT,
    "roomId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "source" "BookingSource" NOT NULL DEFAULT 'staff_entry',
    "status" "BookingStatus" NOT NULL DEFAULT 'pending',
    "bookingType" "BookingType" NOT NULL DEFAULT 'individual',
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "actualCheckIn" TIMESTAMP(3),
    "actualCheckOut" TIMESTAMP(3),
    "adults" INTEGER NOT NULL DEFAULT 1,
    "children" INTEGER NOT NULL DEFAULT 0,
    "roomTotal" DECIMAL(10,2) NOT NULL,
    "addonsTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "balanceDue" DECIMAL(10,2) NOT NULL,
    "specialRequests" TEXT,
    "internalNotes" TEXT,
    "cancelReason" TEXT,
    "lockAccessCode" TEXT,
    "lockGrantedAt" TIMESTAMP(3),
    "lockRevokedAt" TIMESTAMP(3),
    "efdSerial" TEXT,
    "efdReceiptNo" TEXT,
    "efdQrCode" TEXT,
    "efdSyncedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "receivedById" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "gatewayName" TEXT,
    "gatewayRef" TEXT,
    "phoneNumber" TEXT,
    "notes" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipts" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "issuedById" TEXT,
    "receiptNumber" TEXT NOT NULL,
    "pdfUrl" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_guests" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "nationality" TEXT,
    "idType" TEXT,
    "idNumber" TEXT,
    "ageCategory" "AgeCategory" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addon_services" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "category" "AddonCategory" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "addon_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_addons" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "addonId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "booking_addons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "housekeeping_logs" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "updatedById" TEXT,
    "status" "HousekeepingStatus" NOT NULL,
    "notes" TEXT,
    "checklist" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "housekeeping_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "changes" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "userId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "paymentTerms" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_items" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "category" "StoreCategory" NOT NULL,
    "subCategory" TEXT NOT NULL,
    "unit" "StockUnit" NOT NULL,
    "currentStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minimumStock" DOUBLE PRECISION NOT NULL,
    "maximumStock" DOUBLE PRECISION NOT NULL,
    "unitCost" DECIMAL(10,2) NOT NULL,
    "sellingPrice" DECIMAL(10,2),
    "supplierId" TEXT,
    "location" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSellable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_transactions" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitCost" DECIMAL(10,2),
    "balanceBefore" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "performedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "status" "POStatus" NOT NULL DEFAULT 'PENDING',
    "supplierId" TEXT NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "expectedDelivery" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantityOrdered" DOUBLE PRECISION NOT NULL,
    "quantityReceived" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(10,2) NOT NULL,
    "totalCost" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_charges" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "status" "ChargeStatus" NOT NULL DEFAULT 'OPEN',
    "source" TEXT NOT NULL DEFAULT 'pos',
    "notes" TEXT,
    "postedById" TEXT NOT NULL,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_charge_items" (
    "id" TEXT NOT NULL,
    "roomChargeId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "room_charge_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_advice" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "advice" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_advice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advisor_refresh_logs" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "advisor_refresh_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_accounts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "activationToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "otp" TEXT,
    "otpExpiresAt" TIMESTAMP(3),
    "status" "GuestAccountStatus" NOT NULL DEFAULT 'PENDING_ACTIVATION',
    "linkedBookingId" TEXT,
    "roomId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guest_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_service_orders" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "guestAccountId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "status" "RoomServiceOrderStatus" NOT NULL DEFAULT 'PENDING',
    "postedToRoom" BOOLEAN NOT NULL DEFAULT false,
    "roomChargeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_service_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_service_order_items" (
    "id" TEXT NOT NULL,
    "roomServiceOrderId" TEXT NOT NULL,
    "itemId" TEXT,
    "addonId" TEXT,
    "itemName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_service_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_requests" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "guestAccountId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "type" "ServiceRequestType" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "ServiceRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extension_requests" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "extraNights" INTEGER NOT NULL,
    "requestedNewCheckout" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "status" "ExtensionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extension_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "employeeNo" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "employmentType" "EmploymentType" NOT NULL DEFAULT 'full_time',
    "startDate" TIMESTAMP(3) NOT NULL,
    "basicSalary" DECIMAL(10,2) NOT NULL,
    "allowances" JSONB NOT NULL DEFAULT '[]',
    "nssf" BOOLEAN NOT NULL DEFAULT true,
    "wcf" BOOLEAN NOT NULL DEFAULT true,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "clockIn" TIMESTAMP(3),
    "clockOut" TIMESTAMP(3),
    "scheduledIn" TEXT NOT NULL DEFAULT '08:00',
    "scheduledOut" TEXT NOT NULL DEFAULT '17:00',
    "hoursWorked" DECIMAL(5,2),
    "status" "ShiftStatus" NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "type" "LeaveType" NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'pending',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "days" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_records" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "basicSalary" DECIMAL(10,2) NOT NULL,
    "totalAllowances" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "grossSalary" DECIMAL(10,2) NOT NULL,
    "nssfEmployee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "nssfEmployer" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "wcf" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "payeTax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalDeductions" DECIMAL(10,2) NOT NULL,
    "netSalary" DECIMAL(10,2) NOT NULL,
    "daysWorked" INTEGER NOT NULL DEFAULT 26,
    "daysAbsent" INTEGER NOT NULL DEFAULT 0,
    "status" "PayrollStatus" NOT NULL DEFAULT 'draft',
    "payslipUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "paidById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "tinNumber" TEXT,
    "contactPerson" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "type" "InvoiceType" NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'draft',
    "companyId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "pdfUrl" TEXT,
    "sentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_bookings" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,

    CONSTRAINT "invoice_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "scopes" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhooks" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "events" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "responseStatus" INTEGER,
    "responseBody" TEXT,
    "errorMessage" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 1,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_logs" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT,
    "apiKeyId" TEXT,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "statusCode" INTEGER,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestBody" JSONB,
    "responseBody" JSONB,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hotels_slug_key" ON "hotels"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "roles_hotelId_name_key" ON "roles"("hotelId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_hotelId_isActive_idx" ON "users"("hotelId", "isActive");

-- CreateIndex
CREATE INDEX "users_roleId_idx" ON "users"("roleId");

-- CreateIndex
CREATE INDEX "guests_phone_idx" ON "guests"("phone");

-- CreateIndex
CREATE INDEX "guests_email_idx" ON "guests"("email");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_qrCodeToken_key" ON "rooms"("qrCodeToken");

-- CreateIndex
CREATE INDEX "rooms_hotelId_status_idx" ON "rooms"("hotelId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_hotelId_roomNumber_key" ON "rooms"("hotelId", "roomNumber");

-- CreateIndex
CREATE INDEX "room_rates_roomId_startDate_endDate_idx" ON "room_rates"("roomId", "startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_bookingRef_key" ON "bookings"("bookingRef");

-- CreateIndex
CREATE INDEX "bookings_hotelId_status_idx" ON "bookings"("hotelId", "status");

-- CreateIndex
CREATE INDEX "bookings_roomId_checkIn_checkOut_idx" ON "bookings"("roomId", "checkIn", "checkOut");

-- CreateIndex
CREATE INDEX "bookings_guestId_idx" ON "bookings"("guestId");

-- CreateIndex
CREATE INDEX "bookings_hotelId_checkIn_idx" ON "bookings"("hotelId", "checkIn");

-- CreateIndex
CREATE INDEX "bookings_hotelId_checkOut_idx" ON "bookings"("hotelId", "checkOut");

-- CreateIndex
CREATE INDEX "bookings_status_checkIn_idx" ON "bookings"("status", "checkIn");

-- CreateIndex
CREATE INDEX "payments_bookingId_status_idx" ON "payments"("bookingId", "status");

-- CreateIndex
CREATE INDEX "payments_status_createdAt_idx" ON "payments"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_paymentId_key" ON "receipts"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_receiptNumber_key" ON "receipts"("receiptNumber");

-- CreateIndex
CREATE INDEX "receipts_bookingId_idx" ON "receipts"("bookingId");

-- CreateIndex
CREATE INDEX "booking_guests_bookingId_idx" ON "booking_guests"("bookingId");

-- CreateIndex
CREATE INDEX "booking_addons_bookingId_idx" ON "booking_addons"("bookingId");

-- CreateIndex
CREATE INDEX "housekeeping_logs_roomId_updatedAt_idx" ON "housekeeping_logs"("roomId", "updatedAt");

-- CreateIndex
CREATE INDEX "notifications_bookingId_idx" ON "notifications"("bookingId");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_bookingId_key" ON "reviews"("bookingId");

-- CreateIndex
CREATE INDEX "reviews_guestId_idx" ON "reviews"("guestId");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "expenses_hotelId_date_idx" ON "expenses"("hotelId", "date");

-- CreateIndex
CREATE INDEX "suppliers_hotelId_isActive_idx" ON "suppliers"("hotelId", "isActive");

-- CreateIndex
CREATE INDEX "store_items_hotelId_category_idx" ON "store_items"("hotelId", "category");

-- CreateIndex
CREATE INDEX "store_items_hotelId_currentStock_idx" ON "store_items"("hotelId", "currentStock");

-- CreateIndex
CREATE UNIQUE INDEX "store_items_hotelId_sku_key" ON "store_items"("hotelId", "sku");

-- CreateIndex
CREATE INDEX "store_transactions_itemId_createdAt_idx" ON "store_transactions"("itemId", "createdAt");

-- CreateIndex
CREATE INDEX "purchase_orders_hotelId_status_idx" ON "purchase_orders"("hotelId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_hotelId_poNumber_key" ON "purchase_orders"("hotelId", "poNumber");

-- CreateIndex
CREATE INDEX "purchase_order_items_purchaseOrderId_idx" ON "purchase_order_items"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "room_charges_bookingId_status_idx" ON "room_charges"("bookingId", "status");

-- CreateIndex
CREATE INDEX "room_charge_items_roomChargeId_idx" ON "room_charge_items"("roomChargeId");

-- CreateIndex
CREATE INDEX "business_advice_hotelId_period_generatedAt_idx" ON "business_advice"("hotelId", "period", "generatedAt");

-- CreateIndex
CREATE INDEX "advisor_refresh_logs_hotelId_period_createdAt_idx" ON "advisor_refresh_logs"("hotelId", "period", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "guest_accounts_email_key" ON "guest_accounts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "guest_accounts_activationToken_key" ON "guest_accounts"("activationToken");

-- CreateIndex
CREATE INDEX "guest_accounts_linkedBookingId_idx" ON "guest_accounts"("linkedBookingId");

-- CreateIndex
CREATE UNIQUE INDEX "room_service_orders_orderId_key" ON "room_service_orders"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "room_service_orders_roomChargeId_key" ON "room_service_orders"("roomChargeId");

-- CreateIndex
CREATE INDEX "room_service_orders_bookingId_idx" ON "room_service_orders"("bookingId");

-- CreateIndex
CREATE INDEX "room_service_orders_guestAccountId_status_idx" ON "room_service_orders"("guestAccountId", "status");

-- CreateIndex
CREATE INDEX "room_service_order_items_roomServiceOrderId_idx" ON "room_service_order_items"("roomServiceOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "service_requests_requestId_key" ON "service_requests"("requestId");

-- CreateIndex
CREATE INDEX "service_requests_bookingId_status_idx" ON "service_requests"("bookingId", "status");

-- CreateIndex
CREATE INDEX "extension_requests_bookingId_status_idx" ON "extension_requests"("bookingId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "staff_profiles_userId_key" ON "staff_profiles"("userId");

-- CreateIndex
CREATE INDEX "shifts_staffId_date_idx" ON "shifts"("staffId", "date");

-- CreateIndex
CREATE INDEX "shifts_hotelId_date_idx" ON "shifts"("hotelId", "date");

-- CreateIndex
CREATE INDEX "leave_requests_staffId_status_idx" ON "leave_requests"("staffId", "status");

-- CreateIndex
CREATE INDEX "leave_requests_hotelId_status_idx" ON "leave_requests"("hotelId", "status");

-- CreateIndex
CREATE INDEX "payroll_records_hotelId_year_month_idx" ON "payroll_records"("hotelId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_records_staffId_month_year_key" ON "payroll_records"("staffId", "month", "year");

-- CreateIndex
CREATE INDEX "companies_hotelId_name_idx" ON "companies"("hotelId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_hotelId_type_idx" ON "invoices"("hotelId", "type");

-- CreateIndex
CREATE INDEX "invoices_hotelId_status_idx" ON "invoices"("hotelId", "status");

-- CreateIndex
CREATE INDEX "invoice_bookings_invoiceId_idx" ON "invoice_bookings"("invoiceId");

-- CreateIndex
CREATE INDEX "invoice_bookings_bookingId_idx" ON "invoice_bookings"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_bookings_invoiceId_bookingId_key" ON "invoice_bookings"("invoiceId", "bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "api_keys_hotelId_isActive_idx" ON "api_keys"("hotelId", "isActive");

-- CreateIndex
CREATE INDEX "api_keys_keyHash_idx" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "webhooks_hotelId_isActive_idx" ON "webhooks"("hotelId", "isActive");

-- CreateIndex
CREATE INDEX "webhook_deliveries_webhookId_createdAt_idx" ON "webhook_deliveries"("webhookId", "createdAt");

-- CreateIndex
CREATE INDEX "api_logs_hotelId_createdAt_idx" ON "api_logs"("hotelId", "createdAt");

-- CreateIndex
CREATE INDEX "api_logs_apiKeyId_createdAt_idx" ON "api_logs"("apiKeyId", "createdAt");

-- AddForeignKey
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_rates" ADD CONSTRAINT "room_rates_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_rates" ADD CONSTRAINT "room_rates_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_guests" ADD CONSTRAINT "booking_guests_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_addons" ADD CONSTRAINT "booking_addons_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_addons" ADD CONSTRAINT "booking_addons_addonId_fkey" FOREIGN KEY ("addonId") REFERENCES "addon_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "housekeeping_logs" ADD CONSTRAINT "housekeeping_logs_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "housekeeping_logs" ADD CONSTRAINT "housekeeping_logs_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_items" ADD CONSTRAINT "store_items_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_items" ADD CONSTRAINT "store_items_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_transactions" ADD CONSTRAINT "store_transactions_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "store_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_transactions" ADD CONSTRAINT "store_transactions_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "store_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_charges" ADD CONSTRAINT "room_charges_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_charges" ADD CONSTRAINT "room_charges_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_charge_items" ADD CONSTRAINT "room_charge_items_roomChargeId_fkey" FOREIGN KEY ("roomChargeId") REFERENCES "room_charges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_charge_items" ADD CONSTRAINT "room_charge_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "store_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_advice" ADD CONSTRAINT "business_advice_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_accounts" ADD CONSTRAINT "guest_accounts_linkedBookingId_fkey" FOREIGN KEY ("linkedBookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_accounts" ADD CONSTRAINT "guest_accounts_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_service_orders" ADD CONSTRAINT "room_service_orders_guestAccountId_fkey" FOREIGN KEY ("guestAccountId") REFERENCES "guest_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_service_orders" ADD CONSTRAINT "room_service_orders_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_service_orders" ADD CONSTRAINT "room_service_orders_roomChargeId_fkey" FOREIGN KEY ("roomChargeId") REFERENCES "room_charges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_service_order_items" ADD CONSTRAINT "room_service_order_items_roomServiceOrderId_fkey" FOREIGN KEY ("roomServiceOrderId") REFERENCES "room_service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_service_order_items" ADD CONSTRAINT "room_service_order_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "store_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_service_order_items" ADD CONSTRAINT "room_service_order_items_addonId_fkey" FOREIGN KEY ("addonId") REFERENCES "addon_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_guestAccountId_fkey" FOREIGN KEY ("guestAccountId") REFERENCES "guest_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extension_requests" ADD CONSTRAINT "extension_requests_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_bookings" ADD CONSTRAINT "invoice_bookings_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_bookings" ADD CONSTRAINT "invoice_bookings_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "webhooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_logs" ADD CONSTRAINT "api_logs_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;



-- =====================================================================
-- Migration: Prevent double-booking at the database level
-- Run this as a manual migration AFTER `prisma migrate dev` has created
-- the base tables, e.g.:
--   npx prisma migrate dev --create-only --name add_booking_exclusion
--   (paste this file's contents into the generated migration.sql)
--   npx prisma migrate deploy
-- =====================================================================

-- 1. Enable the extension needed for GiST exclusion constraints on
--    non-range types combined with ranges (roomId = ... AND date range &&)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Add a generated daterange column derived from checkIn/checkOut.
--    '[)' = inclusive start, exclusive end -> a checkout on day N does not
--    conflict with a new check-in on day N (standard hotel semantics).
ALTER TABLE bookings
  ADD COLUMN stay_range daterange
  GENERATED ALWAYS AS (daterange("checkIn"::date, "checkOut"::date, '[)')) STORED;

-- 3. Exclusion constraint: no two rows may share the same roomId with an
--    overlapping stay_range, UNLESS the booking is cancelled/no_show.
--    This is enforced by Postgres itself on INSERT/UPDATE — there is no
--    race window, unlike an application-level findFirst() + create().
ALTER TABLE bookings
  ADD CONSTRAINT no_overlapping_bookings
  EXCLUDE USING gist (
    "roomId" WITH =,
    stay_range WITH &&
  )
  WHERE (status NOT IN ('cancelled', 'no_show', 'checked_out'));

-- 4. Helpful index for the availability-calendar query pattern
--    (roomId, checkIn, checkOut) — also declared in schema.prisma via
--    @@index([roomId, checkIn, checkOut]), listed here for completeness
--    if applying this file standalone.
-- CREATE INDEX IF NOT EXISTS bookings_room_checkin_checkout_idx
--   ON bookings ("roomId", "checkIn", "checkOut");

-- =====================================================================
-- Application-side notes:
--
-- 1. Wrap booking creation in a try/catch for Postgres error code 23P01
--    (exclusion_violation) and return a friendly "room no longer
--    available" response instead of a 500.
--
--    Example (pseudo-code, Prisma + pg error handling):
--
--      try {
--        await prisma.booking.create({ data: { ... } });
--      } catch (err) {
--        if (err.code === 'P2010' && err.meta?.code === '23P01') {
--          throw new ConflictError('Room is no longer available for these dates');
--        }
--        throw err;
--      }
--
-- 2. As a secondary/defensive layer (not a replacement for the
--    constraint above), serialize concurrent attempts on the same room
--    with a row lock inside a transaction:
--
--      await prisma.$transaction(async (tx) => {
--        await tx.$queryRaw`SELECT id FROM rooms WHERE id = ${roomId} FOR UPDATE`;
--        // ... availability check + booking create inside the same tx
--      });
--
-- 3. When a booking's status changes to 'confirmed'/'checked_in' from a
--    'cancelled' one being un-cancelled, or when checkIn/checkOut dates
--    are edited on an existing booking (UPDATE), Postgres re-evaluates
--    the exclusion constraint automatically — no extra app logic needed.
-- =====================================================================


-- =====================================================================
-- Optional: backfill for the Payment.gatewayName / gatewayRef consolidation
-- (see schema.prisma changes). Run once, after adding the new columns and
-- BEFORE dropping the old snippeRef/pesapalRef/mpesaRef/bankRef columns.
-- =====================================================================

-- ALTER TABLE payments ADD COLUMN "gatewayName" TEXT;
-- ALTER TABLE payments ADD COLUMN "gatewayRef" TEXT;

-- UPDATE payments SET "gatewayName" = 'snippe',  "gatewayRef" = "snippeRef"  WHERE "snippeRef"  IS NOT NULL;
-- UPDATE payments SET "gatewayName" = 'pesapal',  "gatewayRef" = "pesapalRef" WHERE "pesapalRef" IS NOT NULL;
-- UPDATE payments SET "gatewayName" = 'mpesa',    "gatewayRef" = "mpesaRef"   WHERE "mpesaRef"   IS NOT NULL;
-- UPDATE payments SET "gatewayName" = 'bank',     "gatewayRef" = "bankRef"    WHERE "bankRef"    IS NOT NULL;

-- ALTER TABLE payments DROP COLUMN "snippeRef";
-- ALTER TABLE payments DROP COLUMN "pesapalRef";
-- ALTER TABLE payments DROP COLUMN "mpesaRef";
-- ALTER TABLE payments DROP COLUMN "bankRef";


-- =====================================================================
-- Optional: backfill for Invoice.bookingId removal
-- Run BEFORE dropping the "bookingId" column on "invoices". This creates
-- the missing InvoiceBooking row for any invoice that only had the old
-- direct bookingId set (seed data already writes both, but production
-- data created before this fix may only have bookingId).
-- =====================================================================

-- INSERT INTO invoice_bookings (id, "invoiceId", "bookingId")
-- SELECT gen_random_uuid(), i.id, i."bookingId"
-- FROM invoices i
-- WHERE i."bookingId" IS NOT NULL
--   AND NOT EXISTS (
--     SELECT 1 FROM invoice_bookings ib
--     WHERE ib."invoiceId" = i.id AND ib."bookingId" = i."bookingId"
--   );

-- ALTER TABLE invoices DROP COLUMN "bookingId";


-- =====================================================================
-- Note on RoomServiceOrder.items (Json -> RoomServiceOrderItem relation)
-- =====================================================================
-- This one is NOT a simple SQL statement because the old Json array shape
-- (`{ name, quantity, unitPrice, totalPrice }`, no itemId reference) does
-- not carry a StoreItem foreign key. Options, in order of preference:
--
-- 1. If it's acceptable to lose the StoreItem link for historical orders,
--    write a one-off Node/TS script (run once, then delete) that reads
--    each RoomServiceOrder.items Json array and inserts matching
--    RoomServiceOrderItem rows with itemId = null, itemName/quantity/
--    unitPrice/subtotal copied across.
-- 2. If historical stock-deduction accuracy matters, match itemName back
--    to StoreItem.name per hotel and set itemId where a confident match
--    is found; leave itemId null otherwise.
--
-- New orders going forward are created directly against
-- RoomServiceOrderItem (see updated seed-full.ts for the pattern) — this
-- backfill only concerns rows that existed before the schema change.
