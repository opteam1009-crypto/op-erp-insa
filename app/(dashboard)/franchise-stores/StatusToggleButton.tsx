'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toggleFranchiseStoreStatus } from './actions'
import { Button } from '@/components/ui/Button'

export function StatusToggleButton({ id, status }: { id: string; status: '운영중' | '폐업' }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    const result = await toggleFranchiseStoreStatus(id, status)
    if (result.error) {
      setError(result.error)
      return
    }
    setError(null)
    router.refresh()
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {error && <span className="text-[12px] text-negative">{error}</span>}
      <Button type="button" variant="secondary" size="sm" onClick={handleClick}>
        {status === '운영중' ? '폐업 처리' : '운영 재개'}
      </Button>
    </div>
  )
}
