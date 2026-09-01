import { permissions } from '@/lib/auth/permissions'
import type { Role } from '@/lib/types'

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
 * 사이드바 메뉴를 역할에 따라 구성한다.
 *
 * 서버 레이아웃에서 호출해 결과를 클라이언트 셸에 props로 내린다. 덕분에
 * 클라이언트 번들은 권한 규칙을 알 필요가 없고, 이 함수는 순수 함수로 남아
 * 단위 테스트가 가능하다.
 */
export function buildNavItems(role: Role): NavGroup[] {
  const groups: NavGroup[] = [
    {
      label: '인사',
      items: [
        { href: '/employees', label: '사원 관리', icon: 'users' },
        ...(permissions.canViewPayroll(role)
          ? [{ href: '/payroll', label: '급여대장', icon: 'wallet' as const }]
          : []),
      ],
    },
    {
      label: '정산',
      items: [
        { href: '/franchise-stores', label: '가맹점 관리', icon: 'store' },
        ...(permissions.canViewProfitLoss(role)
          ? [{ href: '/profit-loss', label: '손익 정산', icon: 'chart' as const }]
          : []),
        { href: '/documents', label: '증빙 관리', icon: 'file' },
      ],
    },
  ]

  return groups.filter((group) => group.items.length > 0)
}

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
