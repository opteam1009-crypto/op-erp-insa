import { describe, it, expect } from 'vitest'
import { permissions } from './permissions'

describe('permissions', () => {
  it('allows admin and staff to manage employees, blocks viewer', () => {
    expect(permissions.canManageEmployees('admin')).toBe(true)
    expect(permissions.canManageEmployees('staff')).toBe(true)
    expect(permissions.canManageEmployees('viewer')).toBe(false)
  })

  it('allows only admin and staff to view payroll', () => {
    expect(permissions.canViewPayroll('admin')).toBe(true)
    expect(permissions.canViewPayroll('staff')).toBe(true)
    expect(permissions.canViewPayroll('viewer')).toBe(false)
  })

  it('allows only admin to delete documents', () => {
    expect(permissions.canDeleteDocuments('admin')).toBe(true)
    expect(permissions.canDeleteDocuments('staff')).toBe(false)
    expect(permissions.canDeleteDocuments('viewer')).toBe(false)
  })

  it('allows only admin to manage users', () => {
    expect(permissions.canManageUsers('admin')).toBe(true)
    expect(permissions.canManageUsers('staff')).toBe(false)
  })

  it('allows admin and staff to manage franchise stores, blocks viewer', () => {
    expect(permissions.canManageFranchiseStores('admin')).toBe(true)
    expect(permissions.canManageFranchiseStores('staff')).toBe(true)
    expect(permissions.canManageFranchiseStores('viewer')).toBe(false)
  })
})
