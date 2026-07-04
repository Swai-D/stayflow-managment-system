import { PrismaClient, EmploymentType } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { ApiError } from '../utils/ApiError'
import { calculateTanzaniaPayroll } from '../utils/tanzaniaPayroll'

const prisma = new PrismaClient()

export interface Allowance {
  name: string
  amount: number
  taxable: boolean
}

export class StaffService {

  // ─── Get all staff ────────────────────────────────────
  async getStaff(hotelId: string) {
    return prisma.user.findMany({
      where: { hotelId, isActive: true },
      include: {
        staffProfile: true,
        role: { select: { id: true, name: true, permissions: true } }
      },
      orderBy: { fullName: 'asc' }
    })
  }

  // ─── Create staff account ─────────────────────────────
  async createStaff(hotelId: string, data: {
    fullName: string
    email: string
    password: string
    roleId: string
    phone?: string
    position: string
    department: string
    employmentType?: EmploymentType
    startDate: string
    basicSalary: number
    allowances?: Allowance[]
    deductNssf?: boolean
    deductWcf?: boolean
    bankName?: string
    bankAccount?: string
  }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } })
    if (existing) throw ApiError.conflict('Email hii tayari inatumika')

    const role = await prisma.role.findFirst({
      where: { id: data.roleId, hotelId }
    })
    if (!role) throw ApiError.badRequest('Jukumu lililochaguliwa halipo')

    const count = await prisma.user.count({ where: { hotelId } })
    const employeeNo = `EMP-${String(count + 1).padStart(3, '0')}`

    const passwordHash = await bcrypt.hash(data.password, 12)

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          hotelId,
          fullName: data.fullName,
          email: data.email.toLowerCase().trim(),
          passwordHash,
          roleId: data.roleId,
          phone: data.phone,
          isActive: true,
        }
      })

      const profile = await tx.staffProfile.create({
        data: {
          userId: user.id,
          hotelId,
          employeeNo,
          position: data.position,
          department: data.department,
          employmentType: (data.employmentType as EmploymentType) || 'full_time',
          startDate: new Date(data.startDate),
          basicSalary: data.basicSalary,
          allowances: (data.allowances || []) as any,
          nssf: data.deductNssf ?? true,
          wcf: data.deductWcf ?? true,
          bankName: data.bankName,
          bankAccount: data.bankAccount,
        }
      })

      return { ...user, staffProfile: profile }
    })
  }

  // ─── Update staff ─────────────────────────────────────
  async updateStaff(userId: string, hotelId: string, data: Partial<{
    fullName: string
    phone: string
    roleId: string
    position: string
    department: string
    basicSalary: number
    allowances: Allowance[]
    bankName: string
    bankAccount: string
    isActive: boolean
  }>) {
    const user = await prisma.user.findFirst({ where: { id: userId, hotelId } })
    if (!user) throw ApiError.notFound('Mfanyakazi hakupatikana')

    if (data.roleId) {
      const role = await prisma.role.findFirst({
        where: { id: data.roleId, hotelId }
      })
      if (!role) throw ApiError.badRequest('Jukumu lililochaguliwa halipo')
    }

    return prisma.$transaction(async (tx) => {
      const { position, department, basicSalary, allowances, bankName, bankAccount, ...userFields } = data

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          ...userFields,
          updatedAt: new Date()
        }
      })

      if (position || department || basicSalary || allowances || bankName || bankAccount) {
        await tx.staffProfile.update({
          where: { userId },
          data: {
            ...(position && { position }),
            ...(department && { department }),
            ...(basicSalary && { basicSalary }),
            ...(allowances && { allowances: allowances as any }),
            ...(bankName && { bankName }),
            ...(bankAccount && { bankAccount }),
            updatedAt: new Date()
          }
        })
      }

      return updatedUser
    })
  }

  // ─── Deactivate staff ─────────────────────────────────
  async deactivateStaff(userId: string, hotelId: string) {
    const user = await prisma.user.findFirst({ where: { id: userId, hotelId } })
    if (!user) throw ApiError.notFound('Mfanyakazi hakupatikana')

    return prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { isActive: false, updatedAt: new Date() }
      })
      await tx.staffProfile.update({
        where: { userId },
        data: { isActive: false, updatedAt: new Date() }
      })
      return { id: userId, isActive: false }
    })
  }

  // ─── Clock in ─────────────────────────────────────────
  async clockIn(userId: string, hotelId: string) {
    const profile = await prisma.staffProfile.findFirst({
      where: { userId, hotelId, isActive: true }
    })
    if (!profile) throw ApiError.notFound('Profile ya mfanyakazi haikupatikana')

    const today = new Date(); today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)

    const existing = await prisma.shift.findFirst({
      where: {
        staffId: profile.id,
        date: { gte: today, lt: tomorrow },
        status: 'active'
      }
    })
    if (existing) throw ApiError.conflict('Umeshaingia kazini leo')

    return prisma.shift.create({
      data: {
        staffId: profile.id,
        hotelId,
        date: today,
        clockIn: new Date(),
        status: 'active',
      }
    })
  }

  // ─── Clock out ────────────────────────────────────────
  async clockOut(userId: string, hotelId: string) {
    const profile = await prisma.staffProfile.findFirst({ where: { userId, hotelId, isActive: true } })
    if (!profile) throw ApiError.notFound('Profile ya mfanyakazi haikupatikana')

    const today = new Date(); today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)

    const shift = await prisma.shift.findFirst({
      where: { staffId: profile.id, date: { gte: today, lt: tomorrow }, status: 'active' }
    })
    if (!shift) throw ApiError.notFound('Hujaingia kazini leo')

    const clockOut = new Date()
    const hoursWorked = shift.clockIn
      ? (clockOut.getTime() - shift.clockIn.getTime()) / (1000 * 60 * 60)
      : 0

    return prisma.shift.update({
      where: { id: shift.id },
      data: { clockOut, hoursWorked, status: 'completed' }
    })
  }

  // ─── Get shift history ────────────────────────────────
  async getShifts(hotelId: string, staffId?: string, month?: number, year?: number) {
    const where: any = { hotelId }
    if (staffId) where.staffId = staffId
    if (month && year) {
      const start = new Date(year, month - 1, 1)
      const end = new Date(year, month, 0)
      where.date = { gte: start, lte: end }
    }

    return prisma.shift.findMany({
      where,
      include: { staff: { include: { user: { select: { fullName: true, email: true } } } } },
      orderBy: { date: 'desc' }
    })
  }

  // ─── Leave request ────────────────────────────────────
  async requestLeave(userId: string, hotelId: string, data: {
    type: string
    startDate: string
    endDate: string
    reason: string
  }) {
    const profile = await prisma.staffProfile.findFirst({ where: { userId, hotelId, isActive: true } })
    if (!profile) throw ApiError.notFound('Profile ya mfanyakazi haikupatikana')

    const start = new Date(data.startDate)
    const end = new Date(data.endDate)
    const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1

    return prisma.leaveRequest.create({
      data: {
        staffId: profile.id,
        hotelId,
        type: data.type as any,
        status: 'pending',
        startDate: start,
        endDate: end,
        days,
        reason: data.reason,
      }
    })
  }

  // ─── Approve/Reject leave ─────────────────────────────
  async reviewLeave(leaveId: string, hotelId: string, action: 'approved' | 'rejected',
    reviewedById: string, note?: string) {

    const leave = await prisma.leaveRequest.findFirst({ where: { id: leaveId, hotelId } })
    if (!leave) throw ApiError.notFound('Ombi la likizo haikupatikana')
    if (leave.status !== 'pending') throw ApiError.badRequest('Ombi hili tayari limeshughulikiwa')

    return prisma.leaveRequest.update({
      where: { id: leaveId },
      data: {
        status: action,
        approvedById: reviewedById,
        approvedAt: new Date(),
        rejectionNote: action === 'rejected' ? note : null,
      }
    })
  }

  // ─── Get leave requests ───────────────────────────────
  async getLeaves(hotelId: string, status?: string, staffId?: string) {
    return prisma.leaveRequest.findMany({
      where: {
        hotelId,
        ...(status && { status: status as any }),
        ...(staffId && { staffId })
      },
      include: {
        staff: {
          include: { user: { select: { fullName: true, email: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  // ─── Generate payroll for a staff member ─────────────
  async generatePayroll(staffId: string, hotelId: string, month: number, year: number) {
    const profile = await prisma.staffProfile.findFirst({
      where: { id: staffId, hotelId }
    })
    if (!profile) throw ApiError.notFound('Profile ya mfanyakazi haikupatikana')

    const existing = await prisma.payrollRecord.findUnique({
      where: { staffId_month_year: { staffId, month, year } }
    })
    if (existing) throw ApiError.conflict(`Payroll ya ${month}/${year} tayari ipo`)

    const startOfMonth = new Date(year, month - 1, 1)
    const endOfMonth = new Date(year, month, 0)

    const shifts = await prisma.shift.findMany({
      where: {
        staffId,
        date: { gte: startOfMonth, lte: endOfMonth },
        status: 'completed'
      }
    })

    const daysWorked = shifts.length
    const totalDays = 26

    const leaves = await prisma.leaveRequest.findMany({
      where: {
        staffId,
        status: 'approved',
        startDate: { gte: startOfMonth },
        endDate: { lte: endOfMonth },
      }
    })
    const daysOnLeave = leaves.reduce((sum, l) => sum + l.days, 0)
    const daysAbsent = Math.max(0, totalDays - daysWorked - daysOnLeave)

    const allowances = (profile.allowances as any as Allowance[]) || []
    const calc = calculateTanzaniaPayroll({
      basicSalary: Number(profile.basicSalary),
      allowances,
      deductNssf: profile.nssf,
      deductWcf: profile.wcf,
      daysWorked: daysWorked || totalDays,
      totalDays,
    })

    return prisma.payrollRecord.create({
      data: {
        staffId,
        hotelId,
        month,
        year,
        basicSalary: calc.basicSalary,
        totalAllowances: calc.totalAllowances,
        grossSalary: calc.grossSalary,
        nssfEmployee: calc.nssfEmployee,
        nssfEmployer: calc.nssfEmployer,
        wcf: calc.wcf,
        payeTax: calc.payeTax,
        totalDeductions: calc.totalDeductions,
        netSalary: calc.netSalary,
        daysWorked: daysWorked || totalDays,
        daysAbsent,
        status: 'draft',
      }
    })
  }

  // ─── Get payroll records ──────────────────────────────
  async getPayrollRecords(hotelId: string, month?: number, year?: number) {
    return prisma.payrollRecord.findMany({
      where: {
        hotelId,
        ...(month && { month }),
        ...(year && { year }),
      },
      include: {
        staff: {
          include: { user: { select: { fullName: true, email: true } } }
        }
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }]
    })
  }

  // ─── Approve payroll ──────────────────────────────────
  async approvePayroll(payrollId: string, hotelId: string, approvedById: string) {
    const record = await prisma.payrollRecord.findFirst({
      where: { id: payrollId, hotelId }
    })
    if (!record) throw ApiError.notFound('Payroll haikupatikana')
    if (record.status !== 'draft') throw ApiError.badRequest('Payroll hii tayari imeshughulikiwa')

    return prisma.payrollRecord.update({
      where: { id: payrollId },
      data: { status: 'approved', updatedAt: new Date() }
    })
  }

  // ─── Mark as paid ─────────────────────────────────────
  async markPayrollPaid(payrollId: string, hotelId: string, paidById: string) {
    const record = await prisma.payrollRecord.findFirst({
      where: { id: payrollId, hotelId }
    })
    if (!record) throw ApiError.notFound('Payroll haikupatikana')
    if (record.status !== 'approved') throw ApiError.badRequest('Lazima payroll iwe imeidhinishwa kwanza')

    return prisma.payrollRecord.update({
      where: { id: payrollId },
      data: { status: 'paid', paidAt: new Date(), paidById, updatedAt: new Date() }
    })
  }

  // ─── Get staff summary for accounting ─────────────────
  async getPayrollSummary(hotelId: string, month: number, year: number) {
    const records = await prisma.payrollRecord.findMany({
      where: { hotelId, month, year },
      include: {
        staff: {
          include: { user: { select: { fullName: true } } }
        }
      }
    })

    return {
      totalGross: records.reduce((s, r) => s + Number(r.grossSalary), 0),
      totalNssfEmployee: records.reduce((s, r) => s + Number(r.nssfEmployee), 0),
      totalNssfEmployer: records.reduce((s, r) => s + Number(r.nssfEmployer), 0),
      totalWcf: records.reduce((s, r) => s + Number(r.wcf), 0),
      totalPaye: records.reduce((s, r) => s + Number(r.payeTax), 0),
      totalNet: records.reduce((s, r) => s + Number(r.netSalary), 0),
      staffCount: records.length,
      records,
    }
  }
}

export const staffService = new StaffService()
