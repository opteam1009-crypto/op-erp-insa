create table franchise_stores (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  status text not null default '운영중' check (status in ('운영중', '폐업')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

alter table franchise_stores enable row level security;

-- Everyone signed in can read (viewer included); only admin/staff can write.
-- No delete policy at all: closure is represented by status = '폐업', never a
-- DELETE, so a future feature that references franchise_stores.id never has
-- to handle a vanished row.
create policy "franchise_stores_select" on franchise_stores for select using (auth.uid() is not null);
create policy "franchise_stores_insert" on franchise_stores for insert with check (current_user_role() in ('admin', 'staff'));
create policy "franchise_stores_update" on franchise_stores for update using (current_user_role() in ('admin', 'staff'));
