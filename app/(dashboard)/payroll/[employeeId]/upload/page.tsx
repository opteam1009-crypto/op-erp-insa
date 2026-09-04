
import { sql } from '@/lib/db/sql'
import type { PayrollRecord } from '@/lib/types'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Field, Input, FileInput } from '@/components/ui/Field'
import { Badge } from '@/components/ui/Badge'
import { Alert } from '@/components/ui/Alert'
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/components/ui/Table'
import { buttonClass } from '@/lib/ui/button-class'

export default async function PayrollUploadPage({ params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params

  // 조회 실패를 빈 목록으로 흘려보내면 "업로드된 급여대장이 없습니다"라는 빈
  // 상태가 떠서, 없는 것과 못 불러온 것을 구분할 수 없게 된다. 업로드 자체는
  // 이력 조회와 무관하므로 폼까지 가리지는 않는다.
  let records: PayrollRecord[] = []
  let recordsError = false

  try {
    records = (await sql`
      select * from payroll_records
      where employee_id = ${employeeId}
      order by period desc
    `) as PayrollRecord[]
  } catch (error) {
    console.error('Failed to load payroll records:', error)
    recordsError = true
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="급여대장 업로드" />

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>새 급여대장</CardTitle>
          </CardHeader>
          <CardBody>
            <form
              action={`/api/payroll/upload`}
              method="post"
              encType="multipart/form-data"
              className="flex flex-col gap-4"
            >
              <input type="hidden" name="employee_id" value={employeeId} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="귀속 월" htmlFor="period">
                  <Input id="period" type="month" name="period" required />
                </Field>
                <Field label="파일" htmlFor="file" hint=".xlsx, .xls, .pdf">
                  <FileInput id="file" name="file" accept=".xlsx,.xls,.pdf" required />
                </Field>
              </div>
              <div className="flex justify-end">
                <button type="submit" className={buttonClass('primary')}>
                  업로드
                </button>
              </div>
            </form>
          </CardBody>
        </Card>

        {recordsError && (
          <Alert variant="error">업로드 이력을 불러오지 못했습니다. 관리자에게 문의하세요.</Alert>
        )}

        <Table>
          <THead>
            <TR>
              <TH>기간</TH>
              <TH>파일</TH>
              <TH align="right">상태</TH>
            </TR>
          </THead>
          <TBody>
            {records.length ? (
              records.map((r) => (
                <TR key={r.id}>
                  <TD className="tnum">{r.period}</TD>
                  <TD>
                    <span title={r.file_name} className="block max-w-[320px] truncate">
                      {r.file_name}
                    </span>
                  </TD>
                  <TD align="right">
                    <Badge tone={r.parse_status === 'parsed' ? 'positive' : 'neutral'}>
                      {r.parse_status === 'parsed' ? '파싱됨' : '원본 보관'}
                    </Badge>
                  </TD>
                </TR>
              ))
            ) : (
              <TableEmpty colSpan={3} title="업로드된 급여대장이 없습니다" />
            )}
          </TBody>
        </Table>
      </div>
    </div>
  )
}
