-- op-erp-insa 스키마 (Neon / Postgres)
--
-- Supabase에서 옮겨오며 마이그레이션 10개를 하나로 합쳤다. 보존할 데이터가
-- 없어 증분 이력이 아무 일도 하지 않았기 때문이다. 이후 변경은 다시 append-only
-- 파일로 쌓는다 (db/migrations/0001_*.sql 부터).
--
-- Supabase 시절과 달라진 점:
--   - profiles / invitations 테이블과 user_role 타입이 없다. 인증이 공용
--     비밀번호 하나라 담을 신원이 없다.
--   - created_by / uploaded_by 컬럼이 없다. 위와 같은 이유로 기록할 주체가 없다.
--   - RLS 정책이 없다. 앱이 단일 role로 붙으므로 정책이 구분할 대상이 없다.
--     인가는 proxy.ts의 세션 검사 한 곳이 전담한다.

create extension if not exists pgcrypto;

create table departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
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
  -- 입사일 + 3개월(주말이면 다음 월요일)로 등록 시 자동 계산된다.
  contract_review_date date,
  contract_announce_date date,
  -- 자동 계산 규칙이 없어 수동 입력이다.
  salary_review_date date,
  salary_announce_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table franchise_stores (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  -- 폐업은 DELETE가 아니라 status로 표현한다. 이 id를 참조하는 증빙이 남아
  -- 있으므로 행이 사라지면 안 된다.
  status text not null default '운영중' check (status in ('운영중', '폐업')),
  created_at timestamptz not null default now()
);

create table payroll_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  period text not null,
  file_path text not null,
  file_name text not null,
  parsed_data jsonb,
  parse_status text not null default 'pending' check (parse_status in ('parsed', 'fallback', 'pending')),
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
  -- 삭제는 30일간 소프트 삭제다. 휴지통에서 복원할 수 있다.
  deleted_at timestamptz,
  -- 거래 정보 세 컬럼은 모두 nullable이다. 분류되지 않은 증빙은 '미분류'로
  -- 남고, 집계 쿼리가 transaction_type is not null로 걸러낸다.
  transaction_type text check (transaction_type in ('매출', '매입')),
  amount numeric(14, 2) check (amount is null or amount > 0),
  franchise_store_id uuid references franchise_stores(id),
  created_at timestamptz not null default now(),
  constraint documents_amount_requires_type check (transaction_type is null or amount is not null)
);

create table notification_log (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  employee_id uuid references employees(id),
  sent_for_date date not null,
  sent_at timestamptz not null default now(),
  constraint notification_log_type_check
    check (type in ('contract_review', 'contract_announce', 'salary_review', 'salary_announce', 'birthday')),
  unique (type, employee_id, sent_for_date)
);

-- 위의 unique 제약은 NULL을 서로 다른 값으로 취급하므로, employee_id가 항상
-- NULL인 생일 알림에는 걸리지 않는다(주간 다이제스트라 사원별 행이 아니다).
-- 그래서 같은 날 두 번 실행되면 중복 발송된다. nullable 컬럼을 빼고 날짜만으로
-- 건 부분 유니크 인덱스가 그걸 막는다.
create unique index notification_log_birthday_unique
  on notification_log (sent_for_date)
  where type = 'birthday';

create index employees_status_idx on employees (status);
create index documents_period_idx on documents (year desc, month desc);
create index documents_deleted_at_idx on documents (deleted_at);
