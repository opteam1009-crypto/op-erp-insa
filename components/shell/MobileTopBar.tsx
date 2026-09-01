'use client'

import { usePathname } from 'next/navigation'
import { findNavLabel, type NavGroup } from '@/lib/nav/items'
import { buttonClass } from '@/lib/ui/button-class'
import { Icon } from './icons'

export function MobileTopBar({ nav, onOpen }: { nav: NavGroup[]; onOpen: () => void }) {
  const pathname = usePathname()
  const title = findNavLabel(nav, pathname) ?? '회사 ERP'

  return (
    <div className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-surface px-3 md:hidden">
      <button type="button" onClick={onOpen} aria-label="메뉴 열기" className={buttonClass('ghost', 'icon')}>
        <Icon name="menu" size={18} />
      </button>
      <span className="text-[15px] font-semibold text-fg">{title}</span>
    </div>
  )
}
