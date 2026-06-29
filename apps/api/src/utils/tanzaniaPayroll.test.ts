import { describe, it, expect } from 'vitest'
import { calculateTanzaniaPayroll } from './tanzaniaPayroll'

describe('Tanzania Payroll Calculations', () => {

  it('should return 0 PAYE for salary below threshold (270,000)', () => {
    const result = calculateTanzaniaPayroll({
      basicSalary: 250000, allowances: [],
      deductNssf: true, deductWcf: true,
      daysWorked: 26, totalDays: 26
    })
    expect(result.payeTax).toBe(0)
    expect(result.nssfEmployee).toBe(25000)
  })

  it('should calculate correctly for TZS 800,000 salary', () => {
    const result = calculateTanzaniaPayroll({
      basicSalary: 800000, allowances: [],
      deductNssf: true, deductWcf: true,
      daysWorked: 26, totalDays: 26
    })
    expect(result.grossSalary).toBe(800000)
    expect(result.nssfEmployee).toBe(80000)
    expect(result.wcf).toBe(4000)
    expect(result.payeTax).toBeCloseTo(62500, 0)
    expect(result.netSalary).toBeCloseTo(653500, 0)
  })

  it('should cap NSSF at TZS 200,000 for high salaries', () => {
    const result = calculateTanzaniaPayroll({
      basicSalary: 3000000, allowances: [],
      deductNssf: true, deductWcf: true,
      daysWorked: 26, totalDays: 26
    })
    expect(result.nssfEmployee).toBe(200000)
    expect(result.nssfEmployer).toBe(200000)
  })

  it('should prorate salary for partial month (20 days out of 26)', () => {
    const result = calculateTanzaniaPayroll({
      basicSalary: 780000, allowances: [],
      deductNssf: false, deductWcf: false,
      daysWorked: 20, totalDays: 26
    })
    const expected = (780000 / 26) * 20
    expect(result.basicSalary).toBeCloseTo(expected, 0)
  })

  it('should not deduct NSSF when disabled', () => {
    const result = calculateTanzaniaPayroll({
      basicSalary: 500000, allowances: [],
      deductNssf: false, deductWcf: false,
      daysWorked: 26, totalDays: 26
    })
    expect(result.nssfEmployee).toBe(0)
    expect(result.wcf).toBe(0)
  })

  it('should include taxable allowances in PAYE calculation', () => {
    const withAllowance = calculateTanzaniaPayroll({
      basicSalary: 500000,
      allowances: [{ name: 'Housing', amount: 100000, taxable: true }],
      deductNssf: true, deductWcf: true,
      daysWorked: 26, totalDays: 26
    })
    expect(withAllowance.grossSalary).toBe(600000)
    expect(withAllowance.totalAllowances).toBe(100000)
  })
})
