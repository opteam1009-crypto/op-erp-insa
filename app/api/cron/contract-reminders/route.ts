import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { differenceInCalendarDays, format } from 'date-fns'
import { shouldRemind, buildReminderMessage, type ReminderKind } from '@/lib/notifications/contract-reminders'
import { dispatchNotification } from '@/lib/notifications/dispatch'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const today = format(new Date(), 'yyyy-MM-dd')
  const { data: employees, error: employeesError } = await supabase
    .from('employees')
    .select('id, name, contract_review_date, contract_announce_date, salary_review_date, salary_announce_date')
    .eq('status', '재직')

  if (employeesError) {
    console.error('Failed to fetch employees for contract reminders:', employeesError)
    return NextResponse.json({ error: employeesError.message }, { status: 500 })
  }

  let sent = 0

  for (const emp of employees ?? []) {
    const checks: { date: string | null; kind: ReminderKind }[] = [
      { date: emp.contract_review_date, kind: 'contract_review' },
      { date: emp.contract_announce_date, kind: 'contract_announce' },
      { date: emp.salary_review_date, kind: 'salary_review' },
      { date: emp.salary_announce_date, kind: 'salary_announce' },
    ]

    for (const check of checks) {
      if (!check.date || !shouldRemind(check.date, today, check.kind)) continue

      const { error: logError } = await supabase.from('notification_log').insert({
        type: check.kind,
        employee_id: emp.id,
        sent_for_date: check.date,
      })

      if (logError) {
        if (logError.code !== '23505') {
          console.error(
            `Failed to log notification for employee ${emp.id} (${check.kind}):`,
            logError
          )
        }
        continue // unique violation = already sent for this date; other errors are logged above but still skipped for this employee/date
      }

      const daysLeft = differenceInCalendarDays(new Date(check.date), new Date(today))
      const message = buildReminderMessage(emp.name, check.kind, daysLeft)
      const ok = await dispatchNotification(message)
      if (ok) sent += 1
    }
  }

  return NextResponse.json({ sent })
}
