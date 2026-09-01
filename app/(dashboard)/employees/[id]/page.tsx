import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { DescriptionList } from '@/components/ui/DescriptionList'
import { buttonClass } from '@/lib/ui/button-class'

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()
  const supabase = await createServerSupabase()
  const { data: employee } = await supabase.from('employees').select('*').eq('id', id).single()

  if (!employee) notFound()

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={employee.name}
        description={`사번 ${employee.employee_number}`}
        actions={
          <>
            <Badge status={employee.status}>{employee.status}</Badge>
            {permissions.canManageEmployees(user.role) && (
              <Link href={`/employees/${id}/edit`} className={buttonClass('secondary')}>
                수정
              </Link>
            )}
          </>
        }
      />

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>근로 정보</CardTitle>
          </CardHeader>
          <CardBody padding="tight">
            <DescriptionList
              items={[
                { label: '직급', value: employee.position ?? '-' },
                { label: '근로형태', value: employee.employment_type },
                { label: '입사일', value: employee.hire_date },
                { label: '재직상태', value: <Badge status={employee.status}>{employee.status}</Badge> },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>연락처</CardTitle>
          </CardHeader>
          <CardBody padding="tight">
            <DescriptionList
              items={[
                { label: '연락처', value: employee.phone ?? '-' },
                { label: '비상연락망', value: employee.emergency_contact ?? '-' },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>일정</CardTitle>
          </CardHeader>
          <CardBody padding="tight">
            <DescriptionList
              items={[
                { label: '정규직전환 평가일', value: employee.contract_review_date ?? '-' },
                { label: '정규직전환 발표일', value: employee.contract_announce_date ?? '-' },
                { label: '연봉협상 평가일', value: employee.salary_review_date ?? '-' },
                { label: '연봉협상 발표일', value: employee.salary_announce_date ?? '-' },
              ]}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
