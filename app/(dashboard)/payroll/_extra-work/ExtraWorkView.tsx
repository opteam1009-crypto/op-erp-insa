import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/ui/StatCard'
import { MonthNav } from '@/components/ui/MonthNav'
import { InlineCell } from '@/components/ui/InlineCell'
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/components/ui/Table'
import { hueForDepartmentIndex } from '@/lib/ui/badge-tone'
import { monthLabel, shiftMonth } from '@/lib/dates/month'
import {
  EXTRA_WORK_KIND_INFO,
  formatHours,
  pendingListText,
  summarizeExtraWork,
  type ExtraWorkKind,
  type ExtraWorkRow,
} from '@/lib/extra-work/extra-work'
import { updateExtraWorkField } from './actions'
import { AddTargetsModalButton, type TargetCandidate } from './AddTargetsModalButton'
import { SubmittedToggle } from './SubmittedToggle'
import { FileCell } from './FileCell'
import { DeleteRowButton } from './DeleteRowButton'
import { CopyPendingButton } from './CopyPendingButton'


/**
 * 정산 화면의 표시부. 데이터는 ExtraWorkPage가 조회해 넘긴다 — SQL이 없으므로
 * 가상 데이터로 그려 볼 수 있고, 두 종류(연장·휴일)가 kind만 바꿔 같이 쓴다.
 */
export function ExtraWorkView({
  kind,
  period,
  today,
  rows,
  candidates,
  departments,
}: {
  kind: ExtraWorkKind
  /** YYYY-MM */
  period: string
  /** YYYY-MM-DD, 서울 기준 */
  today: string
  rows: ExtraWorkRow[]
  candidates: TargetCandidate[]
  departments: { name: string }[]
}) {
  const currentMonth = today.slice(0, 7)
  const info = EXTRA_WORK_KIND_INFO[kind]
  const summary = summarizeExtraWork(rows)
  const label = monthLabel(period)
  const allSubmitted = summary.total > 0 && summary.pending === 0

  // 사원 목록과 같은 규칙으로 부서 색을 정한다. 같은 부서는 어느 화면에서든 같은 색이다.
  const hueByDepartment = new Map(
    departments.map((d, index) => [d.name, hueForDepartmentIndex(index)])
  )

  // 이달이면 month를 주소에 남기지 않는다. 사이드바 링크와 같은 주소가 된다.
  const href = (month: string) => (month === currentMonth ? info.href : `${info.href}?month=${month}`)

  return (
    <div>
      <PageHeader
        title={kind}
        description={info.description}
        actions={
          <>
            <CopyPendingButton text={pendingListText(rows, kind, label)} count={summary.pending} />
            <AddTargetsModalButton
              kind={kind}
              period={period}
              label={label}
              candidates={candidates}
              existingIds={rows.map((r) => r.employee_id)}
            />
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <MonthNav
          label={label}
          prevHref={href(shiftMonth(period, -1))}
          nextHref={href(shiftMonth(period, 1))}
          todayHref={href(currentMonth)}
        />
        <p className="text-[12px] text-fg-subtle">
          급여대장 귀속월 <span className="tnum">{period}</span>과 같은 달로 정산합니다.
        </p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="대상" value={`${summary.total}명`} hint="이달 해당 근무를 한 사원" />
        <StatCard
          label="제출"
          value={`${summary.submitted}명`}
          tone={allSubmitted ? 'positive' : 'neutral'}
        />
        <StatCard
          label="미제출"
          value={`${summary.pending}명`}
          tone={summary.pending ? 'negative' : 'neutral'}
          hint={summary.pending ? '명단을 복사해 팀에 요청하세요' : allSubmitted ? '정산 준비 완료' : undefined}
        />
        <StatCard
          label="총 시간"
          value={summary.hours ? `${formatHours(summary.hours)}h` : '-'}
          hint="시간이 적힌 건만 더한 값"
        />
      </div>

      <Table>
        <THead>
          {/* 열이 여덟이라 좁은 화면에서는 표가 옆으로 스크롤된다. 머리글과
              배지가 글자 단위로 꺾이는 것보다 낫다. */}
          <TR>
            <TH className="whitespace-nowrap">부서</TH>
            <TH className="whitespace-nowrap">사번</TH>
            <TH className="whitespace-nowrap">이름</TH>
            <TH className="whitespace-nowrap">시간</TH>
            <TH className="whitespace-nowrap">메모</TH>
            <TH className="whitespace-nowrap">서류</TH>
            <TH className="whitespace-nowrap">제출</TH>
            <TH align="right" />
          </TR>
        </THead>
        <TBody>
          {rows.length ? (
            rows.map((row) => (
              <TR key={row.id}>
                <TD className="whitespace-nowrap">
                  {row.department_name ? (
                    <Badge hue={hueByDepartment.get(row.department_name)}>{row.department_name}</Badge>
                  ) : (
                    '-'
                  )}
                </TD>
                <TD className="tnum">
                  <Link
                    href={`/employees/${row.employee_id}`}
                    className="font-medium text-accent hover:underline"
                  >
                    {row.employee_number}
                  </Link>
                </TD>
                <TD className="whitespace-nowrap">{row.employee_name}</TD>
                <TD className="w-[90px]">
                  <InlineCell
                    onSave={updateExtraWorkField.bind(null, row.id, 'hours')}
                    value={row.hours === null ? '' : formatHours(row.hours)}
                    placeholder="-"
                  />
                </TD>
                <TD className="w-[200px]">
                  <InlineCell
                    onSave={updateExtraWorkField.bind(null, row.id, 'note')}
                    value={row.note ?? ''}
                    placeholder="메모"
                  />
                </TD>
                <TD className="w-[240px]">
                  <FileCell id={row.id} fileName={row.file_name} />
                </TD>
                <TD className="w-[110px]">
                  <SubmittedToggle id={row.id} submittedOn={row.submitted_on} />
                </TD>
                <TD align="right">
                  <DeleteRowButton id={row.id} name={row.employee_name} />
                </TD>
              </TR>
            ))
          ) : (
            <TableEmpty
              colSpan={8}
              title={`${label} ${kind} 대상자가 없습니다`}
              description="이달 해당 근무를 한 사원을 '대상 추가'로 올리면 여기서 서류 제출을 챙길 수 있습니다."
            />
          )}
        </TBody>
      </Table>
    </div>
  )
}
