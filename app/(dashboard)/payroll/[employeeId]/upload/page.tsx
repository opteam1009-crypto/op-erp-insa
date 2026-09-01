import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Field, Input, FileInput } from '@/components/ui/Field'
import { Badge } from '@/components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/components/ui/Table'
import { buttonClass } from '@/lib/ui/button-class'

export default async function PayrollUploadPage({ params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params
  const user = await requireUser()

  if (!permissions.canViewPayroll(user.role)) {
    redirect('/employees')
  }

  const supabase = await createServerSupabase()
  const { data: records } = await supabase
    .from('payroll_records')
    .select('*')
    .eq('employee_id', employeeId)
    .order('period', { ascending: false })

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

        <Table>
          <THead>
            <TR>
              <TH>기간</TH>
              <TH>파일</TH>
              <TH align="right">상태</TH>
            </TR>
          </THead>
          <TBody>
            {records?.length ? (
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
