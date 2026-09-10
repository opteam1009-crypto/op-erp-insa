'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'

/**
 * 부서별 미제출 명단을 클립보드에 복사한다. 팀 채팅에 붙여 넣어 서류를 요청하는
 * 용도다. 문장은 서버가 만들어 내려준다(pendingListText) — 여기서는 복사만 한다.
 */
export function CopyPendingButton({ text, count }: { text: string; count: number }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      // 클립보드가 막힌 환경(http, 권한 거부). 직접 복사할 수 있게 띄운다.
      window.prompt('복사가 막혔습니다. 아래 내용을 직접 복사하세요.', text)
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={copy}
      disabled={count === 0}
      title={count ? '부서별 미제출 명단을 클립보드에 복사합니다' : '미제출이 없습니다'}
    >
      {copied ? '복사됨' : `미제출 명단 복사${count ? ` ${count}` : ''}`}
    </Button>
  )
}
