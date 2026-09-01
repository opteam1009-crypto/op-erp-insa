'use client'

import { useEffect, useState } from 'react'
import { buttonClass } from '@/lib/ui/button-class'
import { Icon } from './icons'

type Theme = 'light' | 'dark'

/**
 * 실제 테마 값은 app/layout.tsx의 인라인 스크립트가 하이드레이션 전에 이미
 * <html data-theme>에 박아 놓았다. 여기서는 그 값을 읽어와 표시만 맞춘다.
 * 첫 렌더에서 'light'로 시작하는 이유: 서버 HTML과 어긋나지 않게 하기 위함이고,
 * 마운트 직후 useEffect가 실제 값으로 교정한다.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    // Read after mount, deferred through a microtask so this doesn't read as a
    // synchronous setState-in-effect (matches the .then()-deferred pattern used
    // elsewhere in this codebase for effect-driven state corrections).
    Promise.resolve().then(() => {
      const current = document.documentElement.dataset.theme
      if (current === 'dark') setTheme('dark')
    })
  }, [])

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('theme', next)
    } catch {
      // 사파리 프라이빗 모드 등 localStorage가 막힌 환경. 이번 세션에만 적용된다.
    }
    setTheme(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
      title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
      className={buttonClass('ghost', 'icon')}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </button>
  )
}
