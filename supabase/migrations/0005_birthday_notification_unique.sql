-- notification_log's unique constraint is `unique (type, employee_id, sent_for_date)`.
-- Per standard SQL/PostgreSQL semantics, a plain UNIQUE constraint treats NULL as
-- distinct from every other value, including another NULL (this only changes with an
-- explicit `NULLS NOT DISTINCT`, added in Postgres 15, which this constraint does not
-- use). The birthday cron always inserts `employee_id: null` (there is one weekly
-- digest row, not one per employee), so two birthday-log rows for the same
-- `sent_for_date` are NOT considered duplicates by that constraint and both inserts
-- succeed. That means the birthday cron route's "insert into notification_log, skip
-- sending if it fails" idempotency check never actually blocks a second same-day
-- invocation (e.g. a manual retrigger or a Vercel Cron retry after a transient
-- failure) — it would send the weekly digest twice.
--
-- Contract reminders (0001's other notification_log consumer) don't have this problem
-- because their employee_id is always a real, non-null UUID, so two rows for the same
-- employee/date/type do collide under the existing constraint.
--
-- Fix: add a partial unique index scoped to the birthday case, keyed only on
-- sent_for_date (no nullable column involved), so a second same-day birthday insert
-- reliably raises a unique violation and the cron route's existing
-- insert-then-check-error skip logic works as intended.
create unique index notification_log_birthday_unique
  on notification_log (sent_for_date)
  where type = 'birthday';
