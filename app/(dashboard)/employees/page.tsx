import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server'

export default async function EmployeesPage() {
  const supabase = await createServerSupabase()
  const { data: employees } = await supabase
    .from('employees')
    .select('id, employee_number, name, employment_type, status, department_id, departments(name)')
    .order('employee_number')

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">사원 관리</h1>
        <Link href="/employees/new" className="rounded bg-black px-4 py-2 text-white">
          + 사원 등록
        </Link>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">사번</th>
            <th className="p-2">이름</th>
            <th className="p-2">부서</th>
            <th className="p-2">근로형태</th>
            <th className="p-2">재직상태</th>
          </tr>
        </thead>
        <tbody>
          {employees?.map((emp) => (
            <tr key={emp.id} className="border-b">
              <td className="p-2">
                <Link href={`/employees/${emp.id}`} className="text-blue-600">
                  {emp.employee_number}
                </Link>
              </td>
              <td className="p-2">{emp.name}</td>
              <td className="p-2">{(emp.departments as unknown as { name: string } | null)?.name ?? '-'}</td>
              <td className="p-2">{emp.employment_type}</td>
              <td className="p-2">{emp.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
