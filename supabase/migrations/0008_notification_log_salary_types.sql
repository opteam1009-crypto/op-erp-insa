-- notification_log.type has exactly one CHECK constraint (on the `type` column,
-- defined inline in 0001_init.sql without an explicit name). Rather than guess
-- Postgres's auto-generated name, look it up and drop whatever it actually is,
-- then recreate it under a fixed, explicit name so future migrations can target
-- it reliably instead of guessing again.
do $$
declare
  existing_constraint text;
begin
  select conname into existing_constraint
  from pg_constraint
  where conrelid = 'notification_log'::regclass and contype = 'c';

  if existing_constraint is not null then
    execute format('alter table notification_log drop constraint %I', existing_constraint);
  end if;
end $$;

alter table notification_log
  add constraint notification_log_type_check
  check (type in ('contract_review', 'contract_announce', 'salary_review', 'salary_announce', 'birthday'));
