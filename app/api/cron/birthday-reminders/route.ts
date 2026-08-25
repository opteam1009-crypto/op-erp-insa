import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { format } from 'date-fns'
import { getThisWeekBirthdays, buildBirthdayMessage } from '@/lib/notifications/birthday-reminders'
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

  const today = new Date()
  const { data: employees } = await supabase
    .from('employees')
    .select('id, name, birth_date')
    .eq('status', '재직')
    .not('birth_date', 'is', null)

  const birthdayEmployees = getThisWeekBirthdays(employees ?? [], today)

  if (birthdayEmployees.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  const weekKey = format(today, "yyyy-'W'II")

  // Idempotency: notification_log has a partial unique index on (sent_for_date)
  // scoped to type = 'birthday' (migration 0005). A plain `unique (type,
  // employee_id, sent_for_date)` constraint would NOT catch a same-day duplicate
  // here, because employee_id is always null for this row and PostgreSQL treats
  // NULLs as distinct from each other under a standard UNIQUE constraint — so a
  // second insert with the same (type, null, sent_for_date) would otherwise
  // succeed instead of failing. The partial index is keyed only on sent_for_date
  // (no nullable column), so a same-day retry/re-trigger reliably fails here.
  const { error: logError } = await supabase.from('notification_log').insert({
    type: 'birthday',
    employee_id: null,
    sent_for_date: format(today, 'yyyy-MM-dd'),
  })

  // If this exact date was already logged (rare double-fire), skip re-sending.
  if (logError) return NextResponse.json({ sent: 0, skipped: 'already_sent_today' })

  const message = buildBirthdayMessage(birthdayEmployees.map((e) => e.name))
  const ok = await sendSlackNotification({ webhookUrl: process.env.SLACK_WEBHOOK_URL!, text: message })

  return NextResponse.json({ sent: ok ? 1 : 0, week: weekKey })
}
