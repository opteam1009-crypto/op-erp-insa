'use client'

import { useState } from 'react'

export function BulkUploadForm() {
  const [result, setResult] = useState<{ inserted: number; errors: { row: number; message: string }[] } | null>(null)

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const response = await fetch('/api/employees/bulk-upload', { method: 'POST', body: formData })
    setResult(await response.json())
  }

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-xl font-bold">사원 엑셀 일괄 등록</h1>
      <a href="/api/employees/export" className="text-blue-600 underline">현재 사원 목록 다운로드</a>
      <form onSubmit={handleUpload} className="space-y-2">
        <input type="file" name="file" accept=".xlsx,.xls" required />
        <button type="submit" className="rounded bg-black px-4 py-2 text-white">업로드</button>
      </form>
      {result && (
        <div>
          <p>{result.inserted}건 등록 완료</p>
          {result.errors.length > 0 && (
            <ul className="text-red-600">
              {result.errors.map((e, i) => <li key={i}>{e.row}행: {e.message}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
