import type { Role } from '@/lib/types'

export const permissions = {
  canManageEmployees: (role: Role) => role === 'admin' || role === 'staff',
  canViewPayroll: (role: Role) => role === 'admin' || role === 'staff',
  canUploadDocuments: (role: Role) => role === 'admin' || role === 'staff',
  canDeleteDocuments: (role: Role) => role === 'admin',
  canManageUsers: (role: Role) => role === 'admin',
  canManageFranchiseStores: (role: Role) => role === 'admin' || role === 'staff',
  canViewProfitLoss: (role: Role) => role === 'admin' || role === 'staff',
} as const
