'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TONE_CLASS } from '@/components/ui/Badge'
import { buttonClass } from '@/lib/ui/button-class'
import type { BadgeTone } from '@/lib/ui/badge-tone'
import {
  CALENDAR_GROUPS,
  CALENDAR_KIND_LABELS,
  WEEKDAY_LABELS,
  formatDayLabel,
  type CalendarEvent,
  type CalendarGroupId,
  type CalendarMonth,
} from '@/lib/calendar/employee-calendar'

/**
 * 범례 점과 모바일 격자의 점에 쓰는 진한 색. TONE_CLASS는 옅은 배경 + 진한
 * 글자라 지름 6px 점으로 줄이면 배경색만 남아 안 보인다.
 */
const DOT_CLASS: Partial<Record<BadgeTone, string>> = {
  rose: 'bg-rose-500',
  sky: 'bg-sky-500',
  emerald: 'bg-emerald-500',
  violet: 'bg-violet-500',
  amber: 'bg-amber-500',
}

const TONE_BY_GROUP = Object.fromEntries(CALENDAR_GROUPS.map((g) => [g.id, g.tone])) as Record<
  CalendarGroupId,
  BadgeTone
>

/** 일요일은 빨강, 토요일은 파랑 — 벽걸이 달력의 약속이다. 흐리게 쓴다. */
function weekdayClass(weekday: number): string {
  if (weekday === 0) return 'text-negative/80'
  if (weekday === 6) return 'text-accent/80'
  return 'text-fg-muted'
}

function employeeHref(event: { employeeId: string }): string {
  return `/employees/${event.employeeId}`
}

export function CalendarView({
  data,
  today,
  nav,
  includeRetired,
  toggleRetiredHref,
}: {
  data: CalendarMonth
  /** YYYY-MM-DD. 서울 기준이라 서버가 넘겨 준다 — 브라우저 시계를 믿지 않는다. */
  today: string
  nav: { prev: string; next: string; today: string }
  includeRetired: boolean
  /** 퇴사자 포함/제외를 뒤집은 주소. 링크라서 새로고침해도 상태가 남는다. */
  toggleRetiredHref: string
}) {
  // 끈 종류. 서버에서 다시 그려도(달 이동) 이 컴포넌트는 같은 자리에 남으므로
  // 달을 넘겨도 범례 설정이 유지된다.
  const [hidden, setHidden] = useState<CalendarGroupId[]>([])
  const isHidden = (group: CalendarGroupId) => hidden.includes(group)
  const toggle = (group: CalendarGroupId) =>
    setHidden((prev) => (prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]))

  const visibleEvents = (date: string): CalendarEvent[] =>
    (data.eventsByDate[date] ?? []).filter((e) => !isHidden(e.group))

  // 이달 날짜만, 일정이 있는 날만. 모바일 목록과 '빈 달' 판정에 쓴다.
  const inMonthDates = data.weeks
    .flat()
    .filter((d) => d.inMonth && visibleEvents(d.date).length > 0)
    .map((d) => d.date)

  const salaryVisible = !isHidden('salary_month') && data.salaryMonth.length > 0
  const nothingToShow = inMonthDates.length === 0 && !salaryVisible

  const countByGroup = (group: CalendarGroupId): number =>
    group === 'salary_month'
      ? data.salaryMonth.length
      : data.weeks
          .flat()
          .filter((d) => d.inMonth)
          .reduce(
            (n, d) => n + (data.eventsByDate[d.date] ?? []).filter((e) => e.group === group).length,
            0
          )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Link href={nav.prev} aria-label="이전 달" className={buttonClass('ghost', 'icon')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="m15 6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          {/* 고정 폭이라 "9월"과 "12월" 사이를 오갈 때 화살표가 움직이지 않는다. */}
          <h2 className="tnum min-w-[7em] text-center text-[15px] font-semibold text-fg">
            {data.label}
          </h2>
          <Link href={nav.next} aria-label="다음 달" className={buttonClass('ghost', 'icon')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link href={nav.today} className={buttonClass('secondary', 'sm', 'ml-1')}>
            오늘
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {CALENDAR_GROUPS.map((group) => {
            const off = isHidden(group.id)
            return (
              <button
                key={group.id}
                type="button"
                aria-pressed={!off}
                onClick={() => toggle(group.id)}
                className={[
                  'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
                  off ? 'text-fg-subtle hover:bg-surface-2' : 'text-fg-muted hover:bg-surface-3',
                ].join(' ')}
              >
                <span
                  aria-hidden
                  className={`h-2 w-2 rounded-full ${
                    off ? 'ring-1 ring-inset ring-border-strong' : DOT_CLASS[group.tone]
                  }`}
                />
                <span className={off ? 'line-through' : ''}>{group.label}</span>
                <span className="tnum text-fg-subtle">{countByGroup(group.id)}</span>
              </button>
            )
          })}

          <Link
            href={toggleRetiredHref}
            aria-current={includeRetired ? 'true' : undefined}
            className={[
              'ml-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
              includeRetired
                ? 'bg-accent/12 text-accent'
                : 'bg-surface-2 text-fg-muted hover:bg-surface-3 hover:text-fg',
            ].join(' ')}
          >
            {includeRetired && (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="m5 12 5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            퇴사자 포함
          </Link>
        </div>
      </div>

      {/* 연봉협상월은 날짜가 아니라 달이다. 칸에 놓을 자리가 없어 격자 위에
          띠로 둔다 — 이달에 연봉협상을 해야 하는 사람이 누구인지만 말한다. */}
      {salaryVisible && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-border bg-surface px-3 py-2.5">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-fg-subtle">
            <span aria-hidden className={`h-2 w-2 rounded-full ${DOT_CLASS.amber}`} />
            {Number(data.month.slice(5))}월 연봉협상 대상
            <span className="tnum">{data.salaryMonth.length}명</span>
          </span>
          <ul className="flex flex-wrap items-center gap-1.5">
            {data.salaryMonth.map((person) => (
              <li key={person.employeeId}>
                <Link
                  href={employeeHref(person)}
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-medium hover:underline ${TONE_CLASS.amber}`}
                >
                  {person.employeeName}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        {/* table-fixed라 7열이 내용과 무관하게 같은 폭이다. 이름이 긴 날이
            한 열을 넓히면 다른 요일이 밀려 달력처럼 읽히지 않는다. */}
        <table className="w-full table-fixed border-collapse">
          <thead className="bg-surface-2">
            <tr>
              {WEEKDAY_LABELS.map((label, weekday) => (
                <th
                  key={label}
                  scope="col"
                  className={`border-b border-border py-2 text-center text-[12px] font-medium ${
                    weekday === 0 || weekday === 6 ? weekdayClass(weekday) : 'text-fg-subtle'
                  }`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.weeks.map((week) => (
              <tr key={week[0].date} className="border-b border-border last:border-b-0">
                {week.map((day) => {
                  const events = visibleEvents(day.date)
                  const isToday = day.date === today
                  return (
                    <td
                      key={day.date}
                      className={[
                        'h-[72px] border-r border-border p-1 align-top last:border-r-0 md:h-[108px] md:p-1.5',
                        day.inMonth ? '' : 'bg-surface-2/60',
                      ].join(' ')}
                    >
                      <time
                        dateTime={day.date}
                        className={[
                          'tnum inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px]',
                          isToday
                            ? 'bg-accent font-semibold text-accent-fg'
                            : day.inMonth
                              ? weekdayClass(day.weekday)
                              : 'text-fg-subtle/60',
                        ].join(' ')}
                      >
                        {day.day}
                      </time>

                      {events.length > 0 && (
                        <>
                          {/* md 이상: 이름 + 종류 칩. 앞뒤 달 자투리는 흐리게. */}
                          <ul className={`mt-1 hidden flex-col gap-0.5 md:flex ${day.inMonth ? '' : 'opacity-60'}`}>
                            {events.map((event) => (
                              <li key={`${event.employeeId}-${event.kind}`}>
                                <Link
                                  href={employeeHref(event)}
                                  title={`${event.employeeName} · ${CALENDAR_KIND_LABELS[event.kind]}`}
                                  className={`flex min-w-0 items-baseline gap-1 rounded px-1.5 py-0.5 text-[12px] leading-5 hover:underline ${
                                    TONE_CLASS[TONE_BY_GROUP[event.group]]
                                  }`}
                                >
                                  <span className="truncate font-medium">{event.employeeName}</span>
                                  {/* 종류는 줄이지 않는다. 칸이 좁으면 이름이 먼저 잘리는데,
                                      이름은 툴팁과 상세 링크로 확인할 수 있지만 잘린
                                      종류는 색만 남아 무슨 일정인지 알 수 없다. */}
                                  <span className="shrink-0 opacity-75">{event.short}</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                          {/* md 미만: 점만. 이름은 아래 목록에서 읽는다. */}
                          <div className="mt-1 flex flex-wrap gap-0.5 md:hidden" aria-hidden>
                            {events.map((event) => (
                              <span
                                key={`${event.employeeId}-${event.kind}`}
                                className={`h-1.5 w-1.5 rounded-full ${DOT_CLASS[TONE_BY_GROUP[event.group]]}`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 좁은 화면에서는 칸에 이름이 들어가지 않는다. 같은 일정을 날짜순
          목록으로 한 번 더 그린다. */}
      {inMonthDates.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface md:hidden">
          {inMonthDates.map((date) => (
            <li key={date} className="flex gap-3 px-3 py-2.5">
              <span className="tnum w-[6em] shrink-0 pt-0.5 text-[12px] font-medium text-fg-subtle">
                {formatDayLabel(date)}
              </span>
              <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
                {visibleEvents(date).map((event) => (
                  <li key={`${event.employeeId}-${event.kind}`}>
                    <Link
                      href={employeeHref(event)}
                      className="flex min-w-0 items-baseline gap-1.5 text-[13px]"
                    >
                      <span
                        aria-hidden
                        className={`h-2 w-2 shrink-0 self-center rounded-full ${DOT_CLASS[TONE_BY_GROUP[event.group]]}`}
                      />
                      <span className="truncate font-medium text-fg">{event.employeeName}</span>
                      <span className="truncate text-[12px] text-fg-muted">
                        {CALENDAR_KIND_LABELS[event.kind]}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {nothingToShow && (
        <p className="py-2 text-center text-[12px] text-fg-subtle">
          {hidden.length ? '켜 둔 종류 중에는 ' : ''}이달에 예정된 일정이 없습니다.
        </p>
      )}
    </div>
  )
}
