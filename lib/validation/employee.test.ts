import { describe, it, expect } from 'vitest'
import { employeeSchema } from './employee'

describe('employeeSchema', () => {
  const valid = {
    employee_number: 'E001',
    name: '홍길동',
    department_id: null,
    position: '매니저',
    employment_type: '정규직' as const,
    hire_date: '2024-01-15',
    birth_date: '1990-05-20',
    phone: '010-1234-5678',
    emergency_contact: '010-9999-0000',
    contract_review_date: '',
    contract_announce_date: '',
  }

  it('accepts a fully valid employee', () => {
    expect(employeeSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects a missing employee_number', () => {
    const result = employeeSchema.safeParse({ ...valid, employee_number: '' })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid employment_type', () => {
    const result = employeeSchema.safeParse({ ...valid, employment_type: '알바' })
    expect(result.success).toBe(false)
  })

  it('rejects a malformed hire_date', () => {
    const result = employeeSchema.safeParse({ ...valid, hire_date: '2024/01/15' })
    expect(result.success).toBe(false)
  })
})
