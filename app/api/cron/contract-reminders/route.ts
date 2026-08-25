import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { differenceInCalendarDays, format } from 'date-fns'
import { shouldRemind, buildReminderMessage } from '@/lib/notifications/contract-reminders'
import { sendSlackNotification } from '@/lib/slack/notify'

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
  const { data: employees } = await supabase
    .from('employees')
    .select('id, name, contract_review_date, contract_announce_date')
    .eq('status', '재직')

  let sent = 0

  for (const emp of employees ?? []) {
    const checks: { date: string | null; type: 'review' | 'announce' }[] = [
      { date: emp.contract_review_date, type: 'review' },
      { date: emp.contract_announce_date, type: 'announce' },
    ]

    for (const check of checks) {
      if (!check.date || !shouldRemind(check.date, today, check.type)) continue

      const notificationType = check.type === 'review' ? 'contract_review' : 'contract_announce'
      const { error: logError } = await supabase.from('notification_log').insert({
        type: notificationType,
        employee_id: emp.id,
        sent_for_date: check.date,
      })

      if (logError) continue // already sent for this date (unique constraint)

      const daysLeft = differenceInCalendarDays(new Date(check.date), new Date(today))
      const message = buildReminderMessage(emp.name, check.type, daysLeft)
      const ok = await sendSlackNotification({ webhookUrl: process.env.SLACK_WEBHOOK_URL!, text: message })
      if (ok) sent += 1
    }
  }

  return NextResponse.json({ sent })
}
