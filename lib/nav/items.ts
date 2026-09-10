export type NavIconName = 'users' | 'wallet' | 'store' | 'chart' | 'file'

/** 부모 메뉴 아래 들여쓰여 보이는 항목. 아이콘은 없다 — 부모 것을 물려받는다. */
export interface NavChild {
  href: string
  label: string
}

export interface NavItem {
  href: string
  label: string
  icon: NavIconName
  children?: NavChild[]
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
      {
        href: '/payroll',
        label: '급여대장',
        icon: 'wallet',
        // 급여에 붙는 월별 정산. 급여대장과 같은 귀속월로 맞춰 본다.
        children: [
          { href: '/payroll/overtime', label: '연장근무' },
          { href: '/payroll/holiday-work', label: '휴일근무' },
        ],
      },
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

/**
 * 현재 경로에 맞는 메뉴 항목. 하위 메뉴가 맞으면 부모가 아니라 그것이다 —
 * 부모의 href는 하위 경로의 접두사라 부모도 늘 함께 맞기 때문에, 먼저 하위를
 * 보고 없을 때만 부모를 돌려준다.
 */
function findActiveNav(groups: NavGroup[], pathname: string): NavChild | NavItem | null {
  for (const group of groups) {
    for (const item of group.items) {
      const child = item.children?.find((c) => isNavItemActive(pathname, c.href))
      if (child) return child
      if (isNavItemActive(pathname, item.href)) return item
    }
  }
  return null
}

/** 사이드바가 강조할 항목의 href. 하위 메뉴가 활성이면 부모는 강조하지 않는다. */
export function activeNavHref(groups: NavGroup[], pathname: string): string | null {
  return findActiveNav(groups, pathname)?.href ?? null
}

/** 모바일 상단 바에 표시할 현재 페이지 이름. */
export function findNavLabel(groups: NavGroup[], pathname: string): string | null {
  return findActiveNav(groups, pathname)?.label ?? null
}
