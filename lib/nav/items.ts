export type NavIconName = 'users' | 'wallet' | 'store' | 'chart' | 'file'

export interface NavItem {
  href: string
  label: string
  icon: NavIconName
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

/**
 * 사이드바 메뉴.
 *
 * 예전에는 역할별로 걸러냈지만, 인증이 공용 비밀번호 하나가 되면서 구분할
 * 대상이 사라졌다 — 로그인한 사람은 전부 같은 것을 본다.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: '인사',
    items: [
      { href: '/employees', label: '사원 관리', icon: 'users' },
      { href: '/payroll', label: '급여대장', icon: 'wallet' },
    ],
  },
  {
    label: '정산',
    items: [
      { href: '/franchise-stores', label: '가맹점 관리', icon: 'store' },
      { href: '/profit-loss', label: '손익 정산', icon: 'chart' },
      { href: '/documents', label: '증빙 관리', icon: 'file' },
    ],
  },
]

/**
 * 현재 경로가 이 메뉴에 속하는지 판별한다.
 *
 * `href + '/'`로 비교하는 이유: `/employees-archive` 같은 형제 경로가
 * `startsWith('/employees')`에 걸려 잘못 활성화되는 것을 막는다.
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** 모바일 상단 바에 표시할 현재 페이지 이름. */
export function findNavLabel(groups: NavGroup[], pathname: string): string | null {
  for (const group of groups) {
    for (const item of group.items) {
      if (isNavItemActive(pathname, item.href)) return item.label
    }
  }
  return null
}
