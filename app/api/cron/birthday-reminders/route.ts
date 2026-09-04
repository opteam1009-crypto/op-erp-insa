import { NextResponse, type NextRequest } from 'next/server'
import { format, startOfWeek } from 'date-fns'
import { sql } from '@/lib/db/sql'
import {
  getThisWeekBirthdays,
  buildBirthdayMessage,
  type BirthdayEmployee,
} from '@/lib/notifications/birthday-reminders'
import { dispatchNotification } from '@/lib/notifications/dispatch'

export async function GET(request: NextRequest) {
  // proxy.ts는 /api/cron/* 를 세션 검사에서 제외한다. Vercel Cron이 부르는
  // 경로라 쿠키가 없기 때문이다. 이 헤더 검사가 유일한 방어선이고, RLS가
  // 사라진 지금은 여기가 뚫리면 DB 전체가 열린다.
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const today = new Date()

  const employees = (await sql`
    select id, name, birth_date::text as birth_date
    from employees
    where status = '재직' and birth_date is not null
  `) as BirthdayEmployee[]

  const birthdayEmployees = getThisWeekBirthdays(employees, today)

  if (birthdayEmployees.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  const weekKey = format(today, "yyyy-'W'II")

  // 중복 방지: notification_log에는 type = 'birthday'로 한정된 부분 유니크
  // 인덱스가 sent_for_date에만 걸려 있다. 일반 unique (type, employee_id,
  // sent_for_date) 제약은 여기서 소용이 없다 — 생일 알림의 employee_id는 항상
  // NULL이고 Postgres는 표준 UNIQUE에서 NULL을 서로 다른 값으로 보기 때문이다.
  //
  // 기록하는 날짜는 오늘이 아니라 그 주의 월요일이다. 주간 다이제스트라
  // 중복 키도 주 단위여야 한다 — 오늘 날짜를 쓰면 같은 주 화요일에 수동으로
  // 다시 돌렸을 때 다른 행이 들어가 같은 내용이 두 번 나간다.
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')

  try {
    await sql`
      insert into notification_log (type, employee_id, sent_for_date)
      values ('birthday', null, ${weekStart})
    `
  } catch {
    // 이미 이번 주에 보냈다 (정시 실행 후 수동 재실행 등).
    return NextResponse.json({ sent: 0, skipped: 'already_sent_this_week' })
  }

  const message = buildBirthdayMessage(birthdayEmployees.map((e) => e.name))
  const ok = await dispatchNotification(message)

  return NextResponse.json({ sent: ok ? 1 : 0, week: weekKey })
}
