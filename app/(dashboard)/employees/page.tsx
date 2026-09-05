import Link from 'next/link'
import { sql } from '@/lib/db/sql'
import { PageHeader } from '@/components/ui/PageHeader'
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/components/ui/Table'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { hueForDepartmentIndex } from '@/lib/ui/badge-tone'
import { buttonClass } from '@/lib/ui/button-class'
import { NewEmployeeModalButton } from './NewEmployeeModalButton'
import { InlineCell } from './InlineCell'
import { EmployeeFilters } from './EmployeeFilters'

interface EmployeeRow {
  id: string
  employee_number: string
  name: string
  employment_type: string
  status: string
  hire_date: string
  department_name: string | null
  job_title: string | null
  contract_end_date: string | null
  regular_conversion_date: string | null
  salary_negotiation_month: number | null
}

interface DepartmentRow {
  id: string
  name: string
}

const STATUSES = ['재직', '휴직', '퇴사']
// employees.employment_type의 check 제약과 같은 값들이다. 여기만 늘리면 저장이
// 막히므로 제약도 함께 고쳐야 한다.
const EMPLOYMENT_TYPES = ['정규직', '계약직', '인턴', '프리랜서']
const MONTH_OPTIONS = [
  { value: '', label: '-' },
  ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}월` })),
]

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{
    dept?: string
    title?: string
    status?: string
    type?: string
    q?: string
  }>
}) {
  const filters = await searchParams
  // 빈 문자열은 '전체'다. SQL에는 null로 넘겨 조건 자체를 통과시킨다.
  const dept = filters.dept || null
  const title = filters.title || null
  const status = STATUSES.includes(filters.status ?? '') ? (filters.status as string) : null
  const empType = EMPLOYMENT_TYPES.includes(filters.type ?? '') ? (filters.type as string) : null
  const query = filters.q?.trim() || null

  let employees: EmployeeRow[]
  let departments: DepartmentRow[]
  let jobTitles: string[]

  try {
    const [employeeRows, departmentRows, jobTitleRows] = await Promise.all([
      sql`
        select e.id, e.employee_number, e.name, e.employment_type, e.status,
               e.job_title, e.salary_negotiation_month,
               -- date를 그대로 넘기면 드라이버가 Date로 만들어 타임존만큼 밀린다.
               -- <input type="date">가 그대로 쓰는 문자열로 받는다.
               e.hire_date::text as hire_date,
               e.contract_end_date::text as contract_end_date,
               e.regular_conversion_date::text as regular_conversion_date,
               d.name as department_name
        from employees e
        left join departments d on d.id = e.department_id
        -- 필터가 비면(null) 그 줄은 항상 참이 되어 조건이 없는 것과 같아진다.
        -- 조건 문자열을 이어붙이지 않으므로 인젝션 여지가 없다.
        where (${dept}::uuid is null or e.department_id = ${dept}::uuid)
          and (${title}::text is null or e.job_title = ${title}::text)
          and (${status}::text is null or e.status = ${status}::text)
          and (${empType}::text is null or e.employment_type = ${empType}::text)
          -- ilike '%' || q || '%' 대신 strpos를 쓴다. 검색어에 %나 _가 섞여
          -- 들어오면 ilike는 그걸 와일드카드로 읽어, 친 것과 다른 결과가 나온다.
          and (${query}::text is null or strpos(lower(e.name), lower(${query}::text)) > 0)
        order by e.employee_number
      `,
      sql`select id, name from departments order by name`,
      // 직책은 마스터 테이블이 없다. 지금 쓰이는 값만 셀렉트에 올린다.
      sql`select distinct job_title from employees where job_title is not null order by job_title`,
    ])
    employees = employeeRows as EmployeeRow[]
    departments = departmentRows as DepartmentRow[]
    jobTitles = (jobTitleRows as { job_title: string }[]).map((r) => r.job_title)
  } catch (error) {
    // 조회 실패를 빈 목록으로 흘려보내면 "등록된 사원이 없습니다"라는 빈 상태가
    // 떠서, 데이터가 없는 것과 못 불러온 것을 구분할 수 없게 된다.
    console.error('Failed to load employees:', error)
    return <Alert variant="error">사원 목록을 불러오지 못했습니다. 관리자에게 문의하세요.</Alert>
  }

  const filtered = Boolean(dept || title || status || empType || query)

  // 부서 목록은 이름순으로 받아 온다. 그 순번이 곧 배지 색이므로, 어떤 필터가
  // 걸려 있든 같은 부서는 늘 같은 색이다.
  const hueByDepartment = new Map(
    departments.map((d, index) => [d.name, hueForDepartmentIndex(index)])
  )

  return (
    <div>
      <PageHeader
        title="사원 관리"
        description={filtered ? `${employees.length}명 (필터 적용됨)` : `총 ${employees.length}명`}
        actions={
          <>
            <Link href="/employees/bulk-upload" className={buttonClass('secondary')}>
              엑셀 일괄 등록
            </Link>
            <NewEmployeeModalButton departments={departments} />
          </>
        }
      />

      {/* 카드로 감싸지 않는다. 표 위에 얹는 보조 컨트롤이라 테두리 상자를
          하나 더 두면 정작 봐야 할 표와 무게가 비슷해진다. */}
      <div className="mb-3">
        <EmployeeFilters
          departments={departments}
          jobTitles={jobTitles}
          employmentTypes={EMPLOYMENT_TYPES}
          statuses={STATUSES}
        />
      </div>

      <Table>
        <THead>
          <TR>
            <TH>사번</TH>
            <TH>이름</TH>
            <TH>부서</TH>
            <TH>입사일</TH>
            <TH>근로형태</TH>
            <TH>직책</TH>
            <TH>재직상태</TH>
            <TH>계약만료일</TH>
            <TH>정규직전환일</TH>
            <TH>연봉협상월</TH>
          </TR>
        </THead>
        <TBody>
          {employees.length ? (
            employees.map((emp) => (
              <TR key={emp.id}>
                <TD className="tnum">
                  <Link
                    href={`/employees/${emp.id}`}
                    className="font-medium text-accent hover:underline"
                  >
                    {emp.employee_number}
                  </Link>
                </TD>
                <TD>{emp.name}</TD>
                <TD>
                  {emp.department_name ? (
                    <Badge hue={hueByDepartment.get(emp.department_name)}>
                      {emp.department_name}
                    </Badge>
                  ) : (
                    '-'
                  )}
                </TD>
                {/* 입사일을 고치면 수습평가일과 계약만료일 계산이 함께 흔들린다.
                    목록에서는 읽기만 하고, 수정은 상세 페이지에서 한다. */}
                <TD className="tnum whitespace-nowrap">{emp.hire_date}</TD>
                <TD>
                  <Badge status={emp.employment_type}>{emp.employment_type}</Badge>
                </TD>
                <TD className="w-[110px]">
                  <InlineCell
                    id={emp.id}
                    field="job_title"
                    value={emp.job_title ?? ''}
                    placeholder="-"
                  />
                </TD>
                <TD className="w-[100px]">
                  <InlineCell
                    id={emp.id}
                    field="status"
                    value={emp.status}
                    variant="badge"
                    placeholder="재직상태"
                    options={STATUSES.map((v) => ({ value: v, label: v }))}
                  />
                </TD>
                <TD className="w-[150px]">
                  <InlineCell
                    id={emp.id}
                    field="contract_end_date"
                    type="date"
                    value={emp.contract_end_date ?? ''}
                  />
                </TD>
                <TD className="w-[150px]">
                  <InlineCell
                    id={emp.id}
                    field="regular_conversion_date"
                    type="date"
                    value={emp.regular_conversion_date ?? ''}
                  />
                </TD>
                <TD className="w-[90px]">
                  <InlineCell
                    id={emp.id}
                    field="salary_negotiation_month"
                    value={emp.salary_negotiation_month?.toString() ?? ''}
                    options={MONTH_OPTIONS}
                  />
                </TD>
              </TR>
            ))
          ) : (
            <TableEmpty
              colSpan={10}
              title={filtered ? '조건에 맞는 사원이 없습니다' : '등록된 사원이 없습니다'}
              description={
                filtered
                  ? '검색어나 필터를 바꾸거나 초기화해 보세요.'
                  : '사원 등록 또는 엑셀 일괄 등록으로 시작하세요.'
              }
            />
          )}
        </TBody>
      </Table>
    </div>
  )
}
