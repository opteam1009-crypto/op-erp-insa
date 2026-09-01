'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Field, FileInput } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { buttonClass } from '@/lib/ui/button-class'

export function BulkUploadForm() {
  const [result, setResult] = useState<{ inserted: number; errors: { row: number; message: string }[] } | null>(null)

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const response = await fetch('/api/employees/bulk-upload', { method: 'POST', body: formData })
    setResult(await response.json())
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="사원 엑셀 일괄 등록"
        description="현재 사원 목록을 내려받아 같은 양식으로 채운 뒤 업로드하세요."
        actions={
          <a href="/api/employees/export" className={buttonClass('secondary', 'sm')}>
            현재 사원 목록 다운로드
          </a>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>파일 업로드</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleUpload} className="flex flex-col gap-4">
            <Field label="엑셀 파일" htmlFor="file" hint=".xlsx 또는 .xls">
              <FileInput id="file" name="file" accept=".xlsx,.xls" required />
            </Field>
            <div className="flex justify-end">
              <Button type="submit">업로드</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {result && (
        <div className="mt-4 flex flex-col gap-3">
          <Alert variant={result.errors.length > 0 ? 'info' : 'success'}>
            {result.inserted}건 등록 완료
          </Alert>
          {result.errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>실패한 행 {result.errors.length}건</CardTitle>
              </CardHeader>
              <CardBody padding="tight">
                <ul className="flex flex-col divide-y divide-border">
                  {result.errors.map((e, i) => (
                    <li key={i} className="flex gap-3 py-2 text-[13.5px]">
                      <span className="shrink-0 font-medium tnum text-fg-subtle">{e.row}행</span>
                      <span className="text-negative">{e.message}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
