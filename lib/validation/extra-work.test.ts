import { describe, it, expect } from 'vitest'
import {
  addTargetsSchema,
  EXTRA_WORK_FILE_ACCEPT,
  hasAllowedExtraWorkExtension,
  hoursInputSchema,
  noteInputSchema,
  periodSchema,
} from './extra-work'

describe('periodSchema', () => {
  it('accepts YYYY-MM and nothing looser', () => {
    expect(periodSchema.safeParse('2026-09').success).toBe(true)
    expect(periodSchema.safeParse('2026-9').success).toBe(false)
    expect(periodSchema.safeParse('2026-13').success).toBe(false)
    expect(periodSchema.safeParse('2026-09-01').success).toBe(false)
  })
})

describe('hoursInputSchema', () => {
  it('accepts blank, whole and one-decimal hours', () => {
    expect(hoursInputSchema.safeParse('').success).toBe(true)
    expect(hoursInputSchema.safeParse('12').success).toBe(true)
    expect(hoursInputSchema.safeParse(' 12.5 ').success).toBe(true)
    expect(hoursInputSchema.safeParse('0').success).toBe(true)
  })

  it('rejects text, two decimals and more than a month has', () => {
    expect(hoursInputSchema.safeParse('열두시간').success).toBe(false)
    expect(hoursInputSchema.safeParse('12.25').success).toBe(false)
    expect(hoursInputSchema.safeParse('-1').success).toBe(false)
    expect(hoursInputSchema.safeParse('745').success).toBe(false)
  })
})

describe('noteInputSchema', () => {
  it('trims and caps the length', () => {
    expect(noteInputSchema.parse('  야근 3회  ')).toBe('야근 3회')
    expect(noteInputSchema.safeParse('가'.repeat(101)).success).toBe(false)
  })
})

describe('addTargetsSchema', () => {
  const uuid = '0c1d5b0a-1b2c-4d3e-8f4a-5b6c7d8e9f01'

  it('needs a kind, a month and at least one employee', () => {
    expect(
      addTargetsSchema.safeParse({ kind: '연장근무', period: '2026-09', employeeIds: [uuid] }).success
    ).toBe(true)
    expect(
      addTargetsSchema.safeParse({ kind: '연장근무', period: '2026-09', employeeIds: [] }).success
    ).toBe(false)
    expect(
      addTargetsSchema.safeParse({ kind: '야근', period: '2026-09', employeeIds: [uuid] }).success
    ).toBe(false)
    expect(
      addTargetsSchema.safeParse({ kind: '휴일근무', period: '2026-09', employeeIds: ['abc'] }).success
    ).toBe(false)
  })
})

describe('hasAllowedExtraWorkExtension', () => {
  it('takes the office and image formats forms actually come in', () => {
    expect(hasAllowedExtraWorkExtension('연장근무신청서.hwp')).toBe(true)
    expect(hasAllowedExtraWorkExtension('form.DOCX')).toBe(true)
    expect(hasAllowedExtraWorkExtension('scan.pdf')).toBe(true)
    expect(hasAllowedExtraWorkExtension('photo.jpeg')).toBe(true)
  })

  it('rejects executables, archives and nameless files', () => {
    expect(hasAllowedExtraWorkExtension('virus.exe')).toBe(false)
    expect(hasAllowedExtraWorkExtension('forms.zip')).toBe(false)
    expect(hasAllowedExtraWorkExtension('noext')).toBe(false)
    expect(hasAllowedExtraWorkExtension('trailing.')).toBe(false)
  })

  it('exposes the same list to the file input', () => {
    expect(EXTRA_WORK_FILE_ACCEPT).toContain('.hwp')
    expect(EXTRA_WORK_FILE_ACCEPT).toContain('.pdf')
  })
})
