import { NextResponse, type NextRequest } from 'next/server'
import { differenceInCalendarDays, format } from 'date-fns'
import { sql } from '@/lib/db/sql'
import {
  shouldRemind,
  buildReminderMessage,
  type ReminderKind,
} from '@/lib/notifications/contract-reminders'
import { dispatchNotification } from '@/lib/notifications/dispatch'

interface ReminderEmployee {
  id: string
  name: string
  contract_review_date: string | null
  contract_announce_date: string | null
  salary_review_date: string | null
  salary_announce_date: string | null
}

export async function GET(request: NextRequest) {
  // proxy.ts는 /api/cron/* 를 세션 검사에서 제외한다. Vercel Cron이 부르는
  // 경로라 쿠키가 없기 때문이다. 이 헤더 검사가 유일한 방어선이고, RLS가
  // 사라진 지금은 여기가 뚫리면 DB 전체가 열린다.
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const today = format(new Date(), 'yyyy-MM-dd')

  const employees = (await sql`
    select id, name,
           contract_review_date::text  as contract_review_date,
           contract_announce_date::text as contract_announce_date,
           salary_review_date::text     as salary_review_date,
           salary_announce_date::text   as salary_announce_date
    from employees
    where status = '재직'
  `) as ReminderEmployee[]

  let sent = 0

  for (const emp of employees) {
    const checks: { date: string | null; kind: ReminderKind }[] = [
      { date: emp.contract_review_date, kind: 'contract_review' },
      { date: emp.contract_announce_date, kind: 'contract_announce' },
      { date: emp.salary_review_date, kind: 'salary_review' },
      { date: emp.salary_announce_date, kind: 'salary_announce' },
    ]

    for (const check of checks) {
      if (!check.date || !shouldRemind(check.date, today, check.kind)) continue

      // 로그를 먼저 넣어 자리를 잡는다. 유니크 제약이 동시 실행에서 두 번 보내는
      // 것을 막는 잠금 역할을 한다. 이미 있으면 이번 사원/날짜는 건너뛴다.
      try {
        await sql`
          insert into notification_log (type, employee_id, sent_for_date)
          values (${check.kind}, ${emp.id}, ${check.date})
        `
      } catch {
        continue
      }

      const daysLeft = differenceInCalendarDays(new Date(check.date), new Date(today))
      const ok = await dispatchNotification(buildReminderMessage(emp.name, check.kind, daysLeft))

      if (ok) {
        sent += 1
      } else {
        // 발송이 실패했으면 잡아둔 자리를 돌려준다. 그러지 않으면 웹훅이 잠깐
        // 죽은 날의 알림이 영영 재시도되지 않고 조용히 사라진다.
        await sql`
          delete from notification_log
          where type = ${check.kind} and employee_id = ${emp.id} and sent_for_date = ${check.date}
        `
      }
    }
  }

  return NextResponse.json({ sent })
}
