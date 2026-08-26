'use client'

import { useRouter } from 'next/navigation'
import { toggleFranchiseStoreStatus } from './actions'

export function StatusToggleButton({ id, status }: { id: string; status: '운영중' | '폐업' }) {
  const router = useRouter()

  async function handleClick() {
    await toggleFranchiseStoreStatus(id, status)
    router.refresh()
  }

  return (
    <button onClick={handleClick} className="rounded border px-2 py-1 text-xs">
      {status === '운영중' ? '폐업 처리' : '운영 재개'}
    </button>
  )
}
