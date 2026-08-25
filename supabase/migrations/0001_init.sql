create extension if not exists pgcrypto;

create type user_role as enum ('admin', 'staff', 'viewer');

create table departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text,
  role user_role not null default 'viewer',
  created_at timestamptz not null default now()
);

create table invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role user_role not null default 'viewer',
  invited_by uuid references profiles(id),
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now()
);

create table employees (
  id uuid primary key default gen_random_uuid(),
  employee_number text not null unique,
  name text not null,
  department_id uuid references departments(id),
  position text,
  employment_type text not null check (employment_type in ('정규직', '계약직', '인턴', '프리랜서')),
  hire_date date not null,
  resignation_date date,
  status text not null default '재직' check (status in ('재직', '휴직', '퇴사')),
  birth_date date,
  phone text,
  emergency_contact text,
  contract_review_date date,
  contract_announce_date date,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table payroll_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  period text not null,
  file_path text not null,
  file_name text not null,
  parsed_data jsonb,
  parse_status text not null default 'pending' check (parse_status in ('parsed', 'fallback', 'pending')),
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (employee_id, period)
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  doc_type text not null check (doc_type in ('세금계산서', '계산서', '신용카드', '현금영수증', '기타')),
  year int not null,
  month int not null check (month between 1 and 12),
  vendor_name text,
  file_path text not null,
  file_name text not null,
  file_size bigint not null,
  uploaded_by uuid references profiles(id),
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table notification_log (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('contract_review', 'contract_announce', 'birthday')),
  employee_id uuid references employees(id),
  sent_for_date date not null,
  sent_at timestamptz not null default now(),
  unique (type, employee_id, sent_for_date)
);
