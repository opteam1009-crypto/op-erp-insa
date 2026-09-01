'use client'

import { useSyncExternalStore } from 'react'
import { buttonClass } from '@/lib/ui/button-class'
import { Icon } from './icons'

type Theme = 'light' | 'dark'

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
  return () => observer.disconnect()
}

function getSnapshot(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

function getServerSnapshot(): Theme {
  return 'light'
}

/**
 * app/layout.tsx의 인라인 스크립트가 하이드레이션 전에 <html data-theme>를
 * 이미 정해 놓는다. 그 DOM 속성 자체가 테마의 단일 진실 공급원(source of
 * truth)이므로, 이 컴포넌트는 별도 React state로 그 값을 복제하지 않고
 * useSyncExternalStore로 구독만 한다.
 *
 * toggle()은 DOM(data-theme)과 localStorage만 쓴다 — setState를 직접
 * 호출하지 않는다. 리렌더는 MutationObserver가 속성 변경을 감지해
 * getSnapshot의 반환값이 바뀔 때 useSyncExternalStore가 알아서 트리거한다.
 */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('theme', next)
    } catch {
      // 사파리 프라이빗 모드 등 localStorage가 막힌 환경. 이번 세션에만 적용된다.
    }
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
