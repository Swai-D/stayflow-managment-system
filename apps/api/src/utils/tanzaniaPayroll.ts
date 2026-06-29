// Tanzania Payroll Calculations — 2024/2025 Tax Year
// Sources: TRA (Tanzania Revenue Authority), NSSF Act, WCF Act

export interface PayrollInput {
  basicSalary: number
  allowances: { name: string; amount: number; taxable: boolean }[]
  deductNssf: boolean
  deductWcf: boolean
  daysWorked: number
  totalDays: number
}

export interface PayrollResult {
  basicSalary: number
  totalAllowances: number
  grossSalary: number
  nssfEmployee: number
  nssfEmployer: number
  wcf: number
  taxableIncome: number
  payeTax: number
  totalDeductions: number
  netSalary: number
  breakdown: string[]
}

// Tanzania PAYE Tax Bands (Monthly) — 2024/2025
// Source: TRA Income Tax Act CAP 332
const PAYE_BANDS = [
  { min: 0, max: 270000, rate: 0, fixed: 0 },
  { min: 270001, max: 520000, rate: 0.09, fixed: 0 },
  { min: 520001, max: 760000, rate: 0.20, fixed: 22500 },
  { min: 760001, max: 1000000, rate: 0.25, fixed: 70500 },
  { min: 1000001, max: Infinity, rate: 0.30, fixed: 130500 },
]

export function calculateTanzaniaPayroll(input: PayrollInput): PayrollResult {
  const { basicSalary, allowances, deductNssf, deductWcf, daysWorked, totalDays } = input

  // 1. Prorate salary if days worked < total days
  const proratedBasic = totalDays > 0 ? (basicSalary / totalDays) * daysWorked : basicSalary

  // 2. Total allowances (taxable + non-taxable)
  const totalAllowances = allowances.reduce((sum, a) => sum + a.amount, 0)

  // 3. Gross salary
  const grossSalary = proratedBasic + totalAllowances

  // 4. NSSF — 10% employee + 10% employer (max TZS 200,000 each side)
  const NSSF_RATE = 0.10
  const NSSF_MAX = 200000
  const nssfEmployee = deductNssf ? Math.min(grossSalary * NSSF_RATE, NSSF_MAX) : 0
  const nssfEmployer = deductNssf ? Math.min(grossSalary * NSSF_RATE, NSSF_MAX) : 0

  // 5. WCF — 0.5% of gross salary (employer pays, deducted from gross for calculations)
  const wcf = deductWcf ? grossSalary * 0.005 : 0

  // 6. Taxable income = gross - NSSF employee contribution
  const taxableIncome = grossSalary - nssfEmployee

  // 7. PAYE Tax (Tanzania progressive bands)
  const payeTax = calculatePAYE(taxableIncome)

  // 8. Total deductions & net salary
  const totalDeductions = nssfEmployee + wcf + payeTax
  const netSalary = grossSalary - totalDeductions

  // 9. Breakdown for payslip
  const breakdown = [
    `Mshahara wa Msingi: TZS ${Math.round(proratedBasic).toLocaleString()}`,
    `Posho Zingine: TZS ${Math.round(totalAllowances).toLocaleString()}`,
    `Mshahara Jumla (Gross): TZS ${Math.round(grossSalary).toLocaleString()}`,
    `NSSF (Mfanyakazi 10%): -TZS ${Math.round(nssfEmployee).toLocaleString()}`,
    `WCF (0.5%): -TZS ${Math.round(wcf).toLocaleString()}`,
    `Kodi ya Mapato (PAYE): -TZS ${Math.round(payeTax).toLocaleString()}`,
    `Makato Yote: -TZS ${Math.round(totalDeductions).toLocaleString()}`,
    `Mshahara wa Kulipa (Net): TZS ${Math.round(netSalary).toLocaleString()}`,
  ]

  return {
    basicSalary: proratedBasic,
    totalAllowances,
    grossSalary,
    nssfEmployee,
    nssfEmployer,
    wcf,
    taxableIncome,
    payeTax,
    totalDeductions,
    netSalary: Math.max(0, netSalary),
    breakdown,
  }
}

function calculatePAYE(taxableIncome: number): number {
  if (taxableIncome <= 270000) return 0

  for (const band of PAYE_BANDS) {
    if (taxableIncome > band.min && taxableIncome <= band.max) {
      return band.fixed + (taxableIncome - band.min) * band.rate
    }
  }

  // Top band
  return 130500 + (taxableIncome - 1000000) * 0.30
}
