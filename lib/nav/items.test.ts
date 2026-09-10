import { describe, it, expect } from 'vitest'
import { NAV_GROUPS, isNavItemActive, findNavLabel, activeNavHref } from './items'

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

  it('hangs the monthly settlements under 급여대장', () => {
    const payroll = NAV_GROUPS.flatMap((g) => g.items).find((i) => i.href === '/payroll')
    expect(payroll?.children?.map((c) => c.href)).toEqual([
      '/payroll/overtime',
      '/payroll/holiday-work',
    ])
    // 하위 메뉴의 주소는 부모 주소 아래에 있어야 부모의 활성 판정과 어긋나지 않는다.
    for (const child of payroll?.children ?? []) {
      expect(child.href.startsWith('/payroll/')).toBe(true)
    }
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

  it('prefers the child label on a child route', () => {
    expect(findNavLabel(NAV_GROUPS, '/payroll/overtime')).toBe('연장근무')
    expect(findNavLabel(NAV_GROUPS, '/payroll/holiday-work')).toBe('휴일근무')
  })

  it('keeps the parent label on the parent and on other nested routes', () => {
    expect(findNavLabel(NAV_GROUPS, '/payroll')).toBe('급여대장')
    expect(findNavLabel(NAV_GROUPS, '/payroll/abc/upload')).toBe('급여대장')
  })

  it('returns null when nothing matches', () => {
    expect(findNavLabel(NAV_GROUPS, '/nowhere')).toBeNull()
  })
})

describe('activeNavHref', () => {
  it('points at the child, not the parent, on a child route', () => {
    expect(activeNavHref(NAV_GROUPS, '/payroll/overtime')).toBe('/payroll/overtime')
  })

  it('points at the parent everywhere else under it', () => {
    expect(activeNavHref(NAV_GROUPS, '/payroll')).toBe('/payroll')
    expect(activeNavHref(NAV_GROUPS, '/payroll/abc/upload')).toBe('/payroll')
  })

  it('is null off the map', () => {
    expect(activeNavHref(NAV_GROUPS, '/login')).toBeNull()
  })
})
