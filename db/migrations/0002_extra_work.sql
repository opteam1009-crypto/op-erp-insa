-- 연장근무·휴일근무 정산 대상.
--
-- 단위는 사원·종류·월이다. 날짜별로 쌓지 않는다 — 서류가 날짜마다 오는 것이
-- 아니라 사람마다 한 달에 한 장 오고, 정산도 말일에 달 단위로 한다. 출퇴근
-- 기록에서 날짜별 내역을 받게 되면 이 표 아래에 자식 표를 두면 된다.
create table extra_work (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  kind text not null check (kind in ('연장근무', '휴일근무')),
  -- 'YYYY-MM'. payroll_records.period와 같은 형식이라 급여대장과 바로 맞춰 볼 수 있다.
  period text not null check (period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  -- 그 달의 총 시간. 출퇴근 기록에서 아직 자동으로 오지 않으므로 비울 수 있다.
  hours numeric(5, 1) check (hours is null or hours >= 0),
  note text,
  -- 서류를 받은 시각. 비어 있으면 미제출이다. 파일 없이 종이로 받아도 찍을 수 있다.
  submitted_at timestamptz,
  -- 받은 서류 파일. Blob의 extra-work/ 접두사 아래에 저장된다.
  file_path text,
  file_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 같은 사람을 같은 달에 두 번 올릴 수 없다. 대상 추가를 두 번 눌러도 한 건이다.
  unique (employee_id, kind, period)
);

create index extra_work_period_idx on extra_work (kind, period);
