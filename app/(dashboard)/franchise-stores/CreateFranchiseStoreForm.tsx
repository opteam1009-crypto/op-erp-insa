'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createFranchiseStore } from './actions'

export function CreateFranchiseStoreForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    const input = { name: String(formData.get('name') ?? '') }
    const result = await createFranchiseStore(input)
    if (result.error) {
      setError(result.error)
      return
    }
    setError(null)
    router.refresh()
  }

  return (
    <form action={handleSubmit} className="mb-6 flex items-end gap-2">
      <label className="text-sm">
        가맹점명
        <input name="name" className="block border p-2" required />
      </label>
      <button type="submit" className="rounded bg-black px-4 py-2 text-white">추가</button>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </form>
  )
}
