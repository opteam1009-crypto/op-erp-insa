create or replace function current_user_role() returns user_role
language sql stable security definer as $$
  select role from profiles where id = auth.uid();
$$;

alter table departments enable row level security;
alter table profiles enable row level security;
alter table invitations enable row level security;
alter table employees enable row level security;
alter table payroll_records enable row level security;
alter table documents enable row level security;
alter table notification_log enable row level security;

-- departments: everyone signed in can read, only admin writes
create policy "departments_select" on departments for select using (auth.uid() is not null);
create policy "departments_write" on departments for all using (current_user_role() = 'admin');

-- profiles: a user reads their own row; admin reads/writes all
create policy "profiles_select_self" on profiles for select using (id = auth.uid() or current_user_role() = 'admin');
create policy "profiles_admin_write" on profiles for update using (current_user_role() = 'admin');

-- invitations: admin only
create policy "invitations_admin_all" on invitations for all using (current_user_role() = 'admin');
create policy "invitations_service_read" on invitations for select using (true);

-- employees: admin/staff manage, viewer read-only
create policy "employees_select" on employees for select using (current_user_role() in ('admin', 'staff', 'viewer'));
create policy "employees_write" on employees for insert with check (current_user_role() in ('admin', 'staff'));
create policy "employees_update" on employees for update using (current_user_role() in ('admin', 'staff'));
create policy "employees_delete" on employees for delete using (current_user_role() = 'admin');

-- payroll_records: admin/staff only, viewer has no access at all
create policy "payroll_select" on payroll_records for select using (current_user_role() in ('admin', 'staff'));
create policy "payroll_write" on payroll_records for insert with check (current_user_role() in ('admin', 'staff'));

-- documents: everyone reads (non-deleted enforced in app query), admin/staff upload, admin deletes
create policy "documents_select" on documents for select using (current_user_role() in ('admin', 'staff', 'viewer'));
create policy "documents_insert" on documents for insert with check (current_user_role() in ('admin', 'staff'));
create policy "documents_update" on documents for update using (current_user_role() = 'admin');

-- notification_log: service role only (no policy needed, RLS blocks all non-service access by default)
