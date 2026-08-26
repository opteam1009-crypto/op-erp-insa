'use client'

import { useState } from 'react'

export interface FranchiseStoreOption {
  id: string
  name: string
}

export function DocumentUploadForm({ franchiseStores }: { franchiseStores: FranchiseStoreOption[] }) {
  const [message, setMessage] = useState<string | null>(null)

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const response = await fetch('/api/documents/upload', { method: 'POST', body: formData })
    const result = await response.json()
    setMessage(result.error ?? '업로드 완료')
    if (!result.error) e.currentTarget.reset()
  }

  const now = new Date()

  return (
    <form onSubmit={handleUpload} className="max-w-md space-y-3">
      <h1 className="text-xl font-bold">증빙 업로드</h1>
      {message && <p>{message}</p>}
      <select name="doc_type" className="w-full border p-2" required>
        <option value="세금계산서">세금계산서</option>
        <option value="계산서">계산서</option>
        <option value="신용카드">신용카드</option>
        <option value="현금영수증">현금영수증</option>
        <option value="기타">기타</option>
      </select>
      <div className="flex gap-2">
        <input type="number" name="year" defaultValue={now.getFullYear()} className="w-1/2 border p-2" required />
        <input type="number" name="month" min={1} max={12} defaultValue={now.getMonth() + 1} className="w-1/2 border p-2" required />
      </div>
      <input name="vendor_name" placeholder="거래처" className="w-full border p-2" />
      <label className="block text-sm">
        거래 구분
        <select name="transaction_type" className="w-full border p-2" required>
          <option value="매출">매출</option>
          <option value="매입">매입</option>
        </select>
      </label>
      <label className="block text-sm">
        금액
        <input type="number" name="amount" min={1} step="1" className="w-full border p-2" required />
      </label>
      <label className="block text-sm">
        가맹점 (선택)
        <select name="franchise_store_id" className="w-full border p-2" defaultValue="">
          <option value="">가맹점 미지정</option>
          {franchiseStores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </select>
      </label>
      <input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls" required />
      <button type="submit" className="rounded bg-black px-4 py-2 text-white">업로드</button>
    </form>
  )
}
