'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toggleFranchiseStoreStatus } from './actions'

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
    <div className="flex items-center gap-2">
      <button onClick={handleClick} className="rounded border px-2 py-1 text-xs">
        {status === '운영중' ? '폐업 처리' : '운영 재개'}
      </button>
      {error && <span className="text-red-600 text-xs">{error}</span>}
    </div>
  )
}
