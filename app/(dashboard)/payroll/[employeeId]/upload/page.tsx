import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'

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
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-bold">급여대장 업로드</h1>
      <form
        action={`/api/payroll/upload`}
        method="post"
        encType="multipart/form-data"
        className="space-y-2"
      >
        <input type="hidden" name="employee_id" value={employeeId} />
        <input type="month" name="period" required className="border p-2" />
        <input type="file" name="file" accept=".xlsx,.xls,.pdf" required />
        <button type="submit" className="rounded bg-black px-4 py-2 text-white">업로드</button>
      </form>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">기간</th>
            <th className="p-2">파일</th>
            <th className="p-2">상태</th>
          </tr>
        </thead>
        <tbody>
          {records?.map((r) => (
            <tr key={r.id} className="border-b">
              <td className="p-2">{r.period}</td>
              <td className="p-2">{r.file_name}</td>
              <td className="p-2">{r.parse_status === 'parsed' ? '파싱됨' : '원본 보관'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
