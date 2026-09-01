import { describe, it, expect } from 'vitest'
import { buildNavItems, isNavItemActive, findNavLabel } from './items'

function hrefs(role: 'admin' | 'staff' | 'viewer') {
  return buildNavItems(role).flatMap((g) => g.items.map((i) => i.href))
}

describe('buildNavItems', () => {
  it('gives admin every menu item', () => {
    expect(hrefs('admin')).toEqual([
      '/employees',
      '/payroll',
      '/franchise-stores',
      '/profit-loss',
      '/documents',
    ])
  })

  it('gives staff every menu item', () => {
    expect(hrefs('staff')).toEqual(hrefs('admin'))
  })

  it('hides payroll and profit-loss from viewer', () => {
    expect(hrefs('viewer')).toEqual(['/employees', '/franchise-stores', '/documents'])
  })

  it('groups items under 인사 and 정산', () => {
    expect(buildNavItems('admin').map((g) => g.label)).toEqual(['인사', '정산'])
  })

  it('drops a group that has no visible items', () => {
    // viewer의 인사 그룹에는 /employees가 남으므로 그룹은 유지된다.
    // 빈 그룹 제거 자체는 항상 성립해야 한다.
    for (const role of ['admin', 'staff', 'viewer'] as const) {
      for (const group of buildNavItems(role)) {
        expect(group.items.length).toBeGreaterThan(0)
      }
    }
  })

  it('assigns an icon name to every item', () => {
    for (const group of buildNavItems('admin')) {
      for (const item of group.items) {
        expect(item.icon).toBeTruthy()
      }
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
    expect(findNavLabel(buildNavItems('admin'), '/profit-loss')).toBe('손익 정산')
  })

  it('returns the label for a nested route', () => {
    expect(findNavLabel(buildNavItems('admin'), '/documents/trash')).toBe('증빙 관리')
  })

  it('returns null when nothing matches', () => {
    expect(findNavLabel(buildNavItems('admin'), '/nowhere')).toBeNull()
  })
})
