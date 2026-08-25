import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { buildEmployeeWorkbook } from './employee-export'
import type { Employee } from '@/lib/types'

describe('buildEmployeeWorkbook', () => {
  it('round-trips employee data through a workbook', () => {
    const employees: Partial<Employee>[] = [
      { employee_number: 'E001', name: '홍길동', employment_type: '정규직', hire_date: '2024-01-15', status: '재직' },
    ]

    const buffer = buildEmployeeWorkbook(employees as Employee[])
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet)

    expect(rows[0]['사번']).toBe('E001')
    expect(rows[0]['이름']).toBe('홍길동')
  })
})
