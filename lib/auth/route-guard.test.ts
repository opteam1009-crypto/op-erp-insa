import { describe, it, expect } from 'vitest'
import { isPublicPath, isAdminOnlyPath } from './route-guard'

describe('isPublicPath', () => {
  it('treats /login as public', () => {
    expect(isPublicPath('/login')).toBe(true)
  })

  it('treats /auth/callback as public', () => {
    expect(isPublicPath('/auth/callback')).toBe(true)
  })

  it('treats /employees as not public', () => {
    expect(isPublicPath('/employees')).toBe(false)
  })
})

describe('isAdminOnlyPath', () => {
  it('treats /admin/users as admin-only', () => {
    expect(isAdminOnlyPath('/admin/users')).toBe(true)
  })

  it('treats /employees as not admin-only', () => {
    expect(isAdminOnlyPath('/employees')).toBe(false)
  })
})
