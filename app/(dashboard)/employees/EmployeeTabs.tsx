import Link from 'next/link'

/**
 * 사원 관리의 두 보기. 같은 데이터를 표로 보느냐 달력으로 보느냐다.
 *
 * 탭이지만 role="tab"이 아니다 — 눌러서 바뀌는 것이 한 페이지 안의 패널이
 * 아니라 주소이므로, 링크로 두어야 뒤로가기와 새 탭 열기가 그대로 통한다.
 */
const TABS = [
  { id: 'list', href: '/employees', label: '목록' },
  { id: 'calendar', href: '/employees/calendar', label: '캘린더' },
] as const

export type EmployeeTab = (typeof TABS)[number]['id']

export function EmployeeTabs({ active }: { active: EmployeeTab }) {
  return (
    <nav aria-label="사원 관리 보기" className="mb-4 flex gap-1 border-b border-border">
      {TABS.map((tab) => {
        const isActive = tab.id === active
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            className={[
              // -mb-px로 탭의 밑줄이 컨테이너 보더 위에 겹친다. 안 그러면
              // 활성 탭 아래 회색 선과 액센트 선이 2px 두께로 같이 보인다.
              '-mb-px inline-flex items-center gap-1.5 rounded-t-sm border-b-2 px-3 py-2 text-[13.5px] transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
              isActive
                ? 'border-accent font-medium text-fg'
                : 'border-transparent text-fg-muted hover:border-border-strong hover:text-fg',
            ].join(' ')}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
