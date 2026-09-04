import { describe, it, expect } from 'vitest'
import { NAV_GROUPS, isNavItemActive, findNavLabel } from './items'

describe('NAV_GROUPS', () => {
  it('lists every screen the app has', () => {
    const hrefs = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href))
    expect(hrefs).toEqual([
      '/employees',
      '/payroll',
      '/franchise-stores',
      '/profit-loss',
      '/documents',
    ])
  })

  it('groups them under 인사 and 정산', () => {
    expect(NAV_GROUPS.map((g) => g.label)).toEqual(['인사', '정산'])
  })

  it('gives every item an icon', () => {
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        expect(item.icon).toBeTruthy()
      }
    }
  })

  it('has no empty group', () => {
    for (const group of NAV_GROUPS) {
      expect(group.items.length).toBeGreaterThan(0)
    }
  })
})

describe('isNavItemActive', () => {
  it('matches the exact path', () => {
    expect(isNavItemActive('/employees', '/employees')).toBe(true)
  })

  it('matches a nested path', () => {
    expect(isNavItemActive('/employees/abc/edit', '/employees')).toBe(true)
  })

  it('does not match a sibling path with a shared prefix', () => {
    expect(isNavItemActive('/employees-archive', '/employees')).toBe(false)
  })

  it('does not match an unrelated path', () => {
    expect(isNavItemActive('/documents', '/employees')).toBe(false)
  })
})

describe('findNavLabel', () => {
  it('returns the label of the active item', () => {
    expect(findNavLabel(NAV_GROUPS, '/profit-loss')).toBe('손익 정산')
  })

  it('returns the label for a nested route', () => {
    expect(findNavLabel(NAV_GROUPS, '/documents/trash')).toBe('증빙 관리')
  })

  it('returns null when nothing matches', () => {
    expect(findNavLabel(NAV_GROUPS, '/nowhere')).toBeNull()
  })
})
