-- payroll_records had no UPDATE policy, which blocks the ON CONFLICT DO UPDATE
-- arm of the upload route's upsert (employee_id, period) for every role, including
-- admin. Mirrors employees_update: admin/staff can update, viewer cannot.
create policy "payroll_update" on payroll_records for update using (current_user_role() in ('admin', 'staff'));
