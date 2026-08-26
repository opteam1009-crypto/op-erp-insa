# Employee Schedule Automation (정규직전환 평가일 자동계산 + 연봉협상 일정) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-calculate each employee's `contract_review_date` from `hire_date` (+3 months, rolled forward off weekends), add manually-managed 연봉협상(salary negotiation) review/announce dates, build the employee edit capability needed to let admins manually override any of these four dates, and extend the existing Slack reminder cron to cover the two new date fields with the same D-7/D-3/D-1 timing rule already used for contract dates.

**Architecture:** This is an additive slice on top of the shipped Month 1 ERP (Next.js App Router + Supabase). It follows the same layering already established: Postgres is the source of truth (two new nullable `date` columns + a widened `notification_log.type` check constraint), a pure `lib/scheduling/` function (Vitest-tested) owns the date math so it never touches a live database, and the existing server-action + RLS-gated page pattern is reused for the new employee edit screen. No new libraries are required.

**Tech Stack:** Next.js 16 (App Router) + TypeScript, Supabase (Postgres + Auth), `date-fns` (already installed), `zod` (already installed), Vitest.

## Global Constraints

- Migrations are append-only: never edit `0001`–`0006`, always add new numbered files (this plan adds `0007`, `0008`).
- All dates remain `YYYY-MM-DD` strings in Postgres `date` columns, exactly like every existing date field.
- `contract_review_date` is auto-calculated **only at employee-creation time** (single-employee form and Excel bulk upload) as `hire_date + 3 calendar months`, rolled forward to the next Monday if the result lands on Saturday or Sunday. Public holidays are explicitly ignored (user decision — weekday-only rule).
- `contract_review_date` is never silently recalculated after creation — editing `hire_date` later does NOT retroactively change it. After creation it is a plain admin-editable field, which is how "manual override" is satisfied.
- `contract_announce_date` stays fully manual, unchanged from Month 1.
- `salary_review_date` / `salary_announce_date` are new nullable `date` columns, manual-only for now (no auto-calc rule exists yet — will be supplied in a future plan). Both are editable wherever `contract_review_date`/`contract_announce_date` are editable.
- Reminder timing is identical across both categories and reuses the exact existing thresholds: review-type dates remind at D-7; announce-type dates remind at D-3 and D-1.
- Every task that adds logic without a live Supabase dependency must be TDD'd with Vitest (failing test written and run red before implementation) — same discipline as Month 1.
- Employee edit access is gated exactly like employee create access: `permissions.canManageEmployees(role)`, enforced both by hiding the UI control and by a server-side redirect on direct URL access (the same page/form split pattern Month 1 Task 6 used to block viewers from `/employees/new`).
- DB migrations in this plan are applied manually by the user via the Supabase SQL Editor (this dev environment has no live DB connection string) — each migration task's "verify" step says so explicitly instead of assuming `supabase db push` will run.

---

## File Structure

```
supabase/
  migrations/
    0007_salary_dates.sql                     # NEW: employees.salary_review_date / salary_announce_date
    0008_notification_log_salary_types.sql    # NEW: widen notification_log.type check constraint
lib/
  scheduling/
    contract-dates.ts                         # NEW: calculateContractReviewDate (pure, tested)
    contract-dates.test.ts                    # NEW
  validation/
    employee.ts                               # MODIFIED: + salary_review_date / salary_announce_date
    employee.test.ts                          # MODIFIED
  notifications/
    contract-reminders.ts                     # MODIFIED: ReminderKind now covers 4 kinds, not 2
    contract-reminders.test.ts                # MODIFIED
app/
  (dashboard)/employees/
    actions.ts                                # MODIFIED: createEmployee auto-computes contract_review_date
                                               #           + salary field coercion; updateEmployee gets the
                                               #           permission gate it was missing + salary field coercion
    new/NewEmployeeForm.tsx                    # MODIFIED: removes manual contract_review_date input,
                                               #           adds optional salary_review_date/salary_announce_date inputs
    [id]/page.tsx                              # MODIFIED: shows salary dates, adds "수정" link (gated)
    [id]/EditEmployeeForm.tsx                  # NEW: client form, pre-filled, all 4 schedule dates editable
    [id]/edit/page.tsx                         # NEW: server page, permission-gated + redirects viewer
  api/
    employees/bulk-upload/route.ts             # MODIFIED: auto-computes contract_review_date per row
    cron/contract-reminders/route.ts           # MODIFIED: checks all 4 date fields, not 2
```

---

### Task 1: Database — Salary Dates Column + Notification Type Widening

**Files:**
- Create: `supabase/migrations/0007_salary_dates.sql`
- Create: `supabase/migrations/0008_notification_log_salary_types.sql`

**Interfaces:**
- Produces: `employees.salary_review_date`, `employees.salary_announce_date` columns (referenced by every later task), and a `notification_log.type` constraint that accepts `'salary_review'` / `'salary_announce'` (needed by Task 5's cron route).

- [ ] **Step 1: Write the salary-dates migration**

Create `supabase/migrations/0007_salary_dates.sql`:

```sql
-- Manual-only for now (no auto-calc rule exists yet, unlike contract_review_date).
-- Editable via the employee edit form added in this plan.
alter table employees
  add column salary_review_date date,
  add column salary_announce_date date;
```

- [ ] **Step 2: Write the notification_log type-widening migration**

Create `supabase/migrations/0008_notification_log_salary_types.sql`:

```sql
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
```

- [ ] **Step 3: Apply manually and verify**

These two files are applied by the user in the Supabase SQL Editor, in order (0007 then 0008) — this dev environment has no live DB connection configured. After they confirm both ran without error, verify by asking them to run:

```sql
select column_name from information_schema.columns
where table_name = 'employees' and column_name like 'salary_%';
-- expect: salary_review_date, salary_announce_date

insert into notification_log (type, employee_id, sent_for_date) values ('salary_review', null, '2026-01-01');
-- expect: success (then delete this test row)
delete from notification_log where sent_for_date = '2026-01-01' and type = 'salary_review';
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0007_salary_dates.sql supabase/migrations/0008_notification_log_salary_types.sql
git commit -m "feat: add salary negotiation date columns and widen notification_log types"
```

---

### Task 2: Contract Review Date Auto-Calculation (pure function)

**Files:**
- Create: `lib/scheduling/contract-dates.ts`
- Create: `lib/scheduling/contract-dates.test.ts`

**Interfaces:**
- Consumes: nothing (pure).
- Produces: `calculateContractReviewDate(hireDate: string): string`, consumed by Task 3's `createEmployee` action and bulk-upload route.

- [ ] **Step 1: Write the failing test**

Create `lib/scheduling/contract-dates.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { calculateContractReviewDate } from './contract-dates'

describe('calculateContractReviewDate', () => {
  it('adds 3 months and keeps the date when the result is a weekday', () => {
    // 2026-01-15 is a Thursday; +3 months = 2026-04-15, a Wednesday (weekday, no roll).
    expect(calculateContractReviewDate('2026-01-15')).toBe('2026-04-15')
  })

  it('rolls a Saturday result forward to Monday (+2 days)', () => {
    // 2026-01-18 + 3 months = 2026-04-18, a Saturday -> rolls to 2026-04-20 (Monday).
    expect(calculateContractReviewDate('2026-01-18')).toBe('2026-04-20')
  })

  it('rolls a Sunday result forward to Monday (+1 day)', () => {
    // 2026-01-19 + 3 months = 2026-04-19, a Sunday -> rolls to 2026-04-20 (Monday).
    expect(calculateContractReviewDate('2026-01-19')).toBe('2026-04-20')
  })

  it('handles month-end clamping combined with a weekend roll', () => {
    // 2026-11-30 + 3 months: February 2027 has no 30th, so date-fns clamps to
    // 2027-02-28 -- which is a Sunday, so it rolls forward to 2027-03-01 (Monday).
    expect(calculateContractReviewDate('2026-11-30')).toBe('2027-03-01')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- contract-dates`
Expected: FAIL with "Cannot find module './contract-dates'"

- [ ] **Step 3: Implement the function**

Create `lib/scheduling/contract-dates.ts`:

```typescript
import { addMonths, addDays, getDay, format, parseISO } from 'date-fns'

/**
 * Computes the 정규직 전환 평가일 (contract-conversion review date) from an
 * employee's hire date: +3 calendar months, then rolled forward to the next
 * Monday if that lands on a Saturday or Sunday. Public holidays are
 * deliberately ignored (weekday-only rule).
 *
 * Uses date-fns `parseISO` rather than the native `Date` constructor: a
 * date-only ISO string ("2026-01-17") is parsed by `parseISO` as local
 * midnight, whereas `new Date("2026-01-17")` is parsed as UTC midnight —
 * which can shift `getDay()`'s weekday result by a day depending on the
 * server's local timezone offset.
 */
export function calculateContractReviewDate(hireDate: string): string {
  const reviewDate = addMonths(parseISO(hireDate), 3)
  const dayOfWeek = getDay(reviewDate) // 0 = Sunday, 6 = Saturday

  const adjusted =
    dayOfWeek === 6 ? addDays(reviewDate, 2) : dayOfWeek === 0 ? addDays(reviewDate, 1) : reviewDate

  return format(adjusted, 'yyyy-MM-dd')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- contract-dates`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/scheduling/contract-dates.ts lib/scheduling/contract-dates.test.ts
git commit -m "feat: add contract review date auto-calculation"
```

---

### Task 3: Wire Auto-Calc + Salary Fields into Employee Creation

**Files:**
- Modify: `lib/validation/employee.ts`
- Modify: `lib/validation/employee.test.ts`
- Modify: `app/(dashboard)/employees/actions.ts`
- Modify: `app/(dashboard)/employees/new/NewEmployeeForm.tsx`
- Modify: `app/api/employees/bulk-upload/route.ts`

**Interfaces:**
- Consumes: `calculateContractReviewDate` (Task 2).
- Produces: `employeeSchema` now validates `salary_review_date` / `salary_announce_date`; `createEmployee` always overwrites `contract_review_date` with the computed value regardless of what (if anything) the caller submits for it, so downstream editing (Task 4) is the only path that can set a different value.

- [ ] **Step 1: Write the failing validation test additions**

In `lib/validation/employee.test.ts`, replace the `valid` fixture and add a rejection case:

```typescript
import { describe, it, expect } from 'vitest'
import { employeeSchema } from './employee'

describe('employeeSchema', () => {
  const valid = {
    employee_number: 'E001',
    name: '홍길동',
    department_id: null,
    position: '매니저',
    employment_type: '정규직' as const,
    hire_date: '2024-01-15',
    birth_date: '1990-05-20',
    phone: '010-1234-5678',
    emergency_contact: '010-9999-0000',
    contract_review_date: '',
    contract_announce_date: '',
    salary_review_date: '',
    salary_announce_date: '',
  }

  it('accepts a fully valid employee', () => {
    expect(employeeSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects a missing employee_number', () => {
    const result = employeeSchema.safeParse({ ...valid, employee_number: '' })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid employment_type', () => {
    const result = employeeSchema.safeParse({ ...valid, employment_type: '알바' })
    expect(result.success).toBe(false)
  })

  it('rejects a malformed hire_date', () => {
    const result = employeeSchema.safeParse({ ...valid, hire_date: '2024/01/15' })
    expect(result.success).toBe(false)
  })

  it('rejects a malformed salary_review_date', () => {
    const result = employeeSchema.safeParse({ ...valid, salary_review_date: '2024/06/01' })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- employee.test`
Expected: FAIL — `salary_review_date` rejection case fails because the schema has no such field yet (extra key is allowed through by default zod behavior, so the malformed-value case is what actually fails: without the field declared, zod strips unknown keys and the malformed string never gets validated, so `safeParse` unexpectedly succeeds).

- [ ] **Step 3: Add the fields to the schema**

In `lib/validation/employee.ts`, add two lines to the `employeeSchema` object (after `contract_announce_date`):

```typescript
  contract_announce_date: dateOrEmpty,
  salary_review_date: dateOrEmpty,
  salary_announce_date: dateOrEmpty,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- employee.test`
Expected: PASS (5 tests)

- [ ] **Step 5: Wire auto-calc and salary coercion into `createEmployee`**

In `app/(dashboard)/employees/actions.ts`, add the import and change the insert call:

```typescript
import { calculateContractReviewDate } from '@/lib/scheduling/contract-dates'
```

Replace the body of `createEmployee` from `const supabase = await createServerSupabase()` onward:

```typescript
  const supabase = await createServerSupabase()

  const { error } = await supabase.from('employees').insert({
    ...parsed.data,
    department_id: parsed.data.department_id || null,
    birth_date: parsed.data.birth_date || null,
    // Always computed at creation time — never taken from client input, even
    // though the create form no longer sends this field at all (defense in depth).
    contract_review_date: calculateContractReviewDate(parsed.data.hire_date),
    contract_announce_date: parsed.data.contract_announce_date || null,
    salary_review_date: parsed.data.salary_review_date || null,
    salary_announce_date: parsed.data.salary_announce_date || null,
    created_by: user.userId,
  })

  if (error) return { error: error.message }

  revalidatePath('/employees')
  return { error: null }
```

- [ ] **Step 6: Remove the manual contract_review_date input from the create form, add salary inputs**

In `app/(dashboard)/employees/new/NewEmployeeForm.tsx`, remove the `contract_review_date` line from the `input` object inside `handleSubmit`, and add the two salary fields:

```typescript
    const input = {
      employee_number: String(formData.get('employee_number') ?? ''),
      name: String(formData.get('name') ?? ''),
      department_id: (formData.get('department_id') as string) || null,
      position: String(formData.get('position') ?? ''),
      employment_type: formData.get('employment_type') as '정규직' | '계약직' | '인턴' | '프리랜서',
      hire_date: String(formData.get('hire_date') ?? ''),
      birth_date: String(formData.get('birth_date') ?? ''),
      phone: String(formData.get('phone') ?? ''),
      emergency_contact: String(formData.get('emergency_contact') ?? ''),
      contract_announce_date: String(formData.get('contract_announce_date') ?? ''),
      salary_review_date: String(formData.get('salary_review_date') ?? ''),
      salary_announce_date: String(formData.get('salary_announce_date') ?? ''),
    }
```

Replace the JSX block that currently renders both contract date labels:

```tsx
      <label className="block text-sm">정규직전환 평가일<input type="date" name="contract_review_date" className="w-full border p-2" /></label>
      <label className="block text-sm">정규직전환 발표일<input type="date" name="contract_announce_date" className="w-full border p-2" /></label>
```

with:

```tsx
      <p className="text-sm text-gray-500">정규직전환 평가일은 입사일 기준 3개월 후로 자동 계산됩니다 (등록 후 필요시 수정 가능).</p>
      <label className="block text-sm">정규직전환 발표일<input type="date" name="contract_announce_date" className="w-full border p-2" /></label>
      <label className="block text-sm">연봉협상 평가일<input type="date" name="salary_review_date" className="w-full border p-2" /></label>
      <label className="block text-sm">연봉협상 발표일<input type="date" name="salary_announce_date" className="w-full border p-2" /></label>
```

- [ ] **Step 7: Apply the same auto-calc to the bulk-upload route**

In `app/api/employees/bulk-upload/route.ts`, add the import:

```typescript
import { calculateContractReviewDate } from '@/lib/scheduling/contract-dates'
```

Change the `employeeSchema.safeParse` call to drop the now-unused `contract_review_date: ''` line (it's ignored either way, but the route shouldn't imply it reads from the sheet):

```typescript
    const parsed = employeeSchema.safeParse({
      employee_number: row.employee_number,
      name: row.name,
      department_id: departmentByName.get(departmentName) ?? null,
      position: row.position,
      employment_type: row.employment_type,
      hire_date: row.hire_date,
      birth_date: row.birth_date,
      phone: row.phone,
      emergency_contact: row.emergency_contact,
      contract_announce_date: '',
    })
```

Change the insert call:

```typescript
    const { error } = await supabase.from('employees').insert({
      ...parsed.data,
      department_id: parsed.data.department_id || null,
      birth_date: parsed.data.birth_date || null,
      contract_review_date: calculateContractReviewDate(parsed.data.hire_date),
      contract_announce_date: parsed.data.contract_announce_date || null,
      created_by: user.userId,
    })
```

- [ ] **Step 8: Verify manually**

Run `npm run dev`, log in as admin, create a new employee with `hire_date = 2026-01-15`. Open its detail page and confirm `contract_review_date` was auto-set to `2026-04-15` (or check via Supabase table editor) without you having entered it anywhere.

- [ ] **Step 9: Commit**

```bash
git add lib/validation/employee.ts lib/validation/employee.test.ts "app/(dashboard)/employees/actions.ts" "app/(dashboard)/employees/new/NewEmployeeForm.tsx" app/api/employees/bulk-upload/route.ts
git commit -m "feat: auto-calculate contract review date and add salary date fields on employee creation"
```

---

### Task 4: Employee Edit Capability (manual override surface)

**Files:**
- Modify: `app/(dashboard)/employees/actions.ts`
- Modify: `app/(dashboard)/employees/[id]/page.tsx`
- Create: `app/(dashboard)/employees/[id]/EditEmployeeForm.tsx`
- Create: `app/(dashboard)/employees/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `updateEmployee` (existing, in `actions.ts`, currently unused and — as discovered in this task — missing the permission gate every other mutation has), `getCurrentUser`/`requireUser` (`lib/auth/current-user.ts`), `permissions.canManageEmployees` (`lib/auth/permissions.ts`).
- Produces: a reachable `/employees/[id]/edit` page — the first caller of `updateEmployee`, which is why its missing auth gate has gone unnoticed until now.

- [ ] **Step 1: Fix `updateEmployee`'s missing permission gate and add salary field coercion**

`updateEmployee` in `app/(dashboard)/employees/actions.ts` currently has no session/role check at all (unlike `createEmployee`) because nothing has called it yet. Replace the whole function:

```typescript
export async function updateEmployee(id: string, input: EmployeeInput) {
  const user = await getCurrentUser()
  if (!user) return { error: '로그인이 필요합니다' }
  if (!permissions.canManageEmployees(user.role)) {
    return { error: '권한이 없습니다' }
  }

  const parsed = employeeSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(', ') }
  }

  const supabase = await createServerSupabase()

  const { error } = await supabase
    .from('employees')
    .update({
      ...parsed.data,
      department_id: parsed.data.department_id || null,
      birth_date: parsed.data.birth_date || null,
      contract_review_date: parsed.data.contract_review_date || null,
      contract_announce_date: parsed.data.contract_announce_date || null,
      salary_review_date: parsed.data.salary_review_date || null,
      salary_announce_date: parsed.data.salary_announce_date || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/employees')
  revalidatePath(`/employees/${id}`)
  return { error: null }
}
```

Note this is the one place `contract_review_date` is taken directly from client input — intentional, since this is the admin manual-override path the Global Constraints call for.

- [ ] **Step 2: Build the edit form component**

Create `app/(dashboard)/employees/[id]/EditEmployeeForm.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateEmployee } from '../actions'
import type { Employee } from '@/lib/types'
import type { DepartmentOption } from '../new/NewEmployeeForm'

export function EditEmployeeForm({
  employee,
  departments,
}: {
  employee: Employee
  departments: DepartmentOption[]
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    const input = {
      employee_number: String(formData.get('employee_number') ?? ''),
      name: String(formData.get('name') ?? ''),
      department_id: (formData.get('department_id') as string) || null,
      position: String(formData.get('position') ?? ''),
      employment_type: formData.get('employment_type') as '정규직' | '계약직' | '인턴' | '프리랜서',
      hire_date: String(formData.get('hire_date') ?? ''),
      birth_date: String(formData.get('birth_date') ?? ''),
      phone: String(formData.get('phone') ?? ''),
      emergency_contact: String(formData.get('emergency_contact') ?? ''),
      contract_review_date: String(formData.get('contract_review_date') ?? ''),
      contract_announce_date: String(formData.get('contract_announce_date') ?? ''),
      salary_review_date: String(formData.get('salary_review_date') ?? ''),
      salary_announce_date: String(formData.get('salary_announce_date') ?? ''),
    }

    const result = await updateEmployee(employee.id, input)
    if (result.error) {
      setError(result.error)
      return
    }
    router.push(`/employees/${employee.id}`)
  }

  return (
    <form action={handleSubmit} className="max-w-lg space-y-3">
      <h1 className="text-xl font-bold">사원 정보 수정</h1>
      {error && <p className="text-red-600">{error}</p>}
      <input name="employee_number" defaultValue={employee.employee_number} placeholder="사번" className="w-full border p-2" required />
      <input name="name" defaultValue={employee.name} placeholder="이름" className="w-full border p-2" required />
      <select name="department_id" className="w-full border p-2" defaultValue={employee.department_id ?? ''}>
        <option value="">부서 미지정</option>
        {departments.map((dept) => (
          <option key={dept.id} value={dept.id}>
            {dept.name}
          </option>
        ))}
      </select>
      <input name="position" defaultValue={employee.position ?? ''} placeholder="직급" className="w-full border p-2" />
      <select name="employment_type" defaultValue={employee.employment_type} className="w-full border p-2" required>
        <option value="정규직">정규직</option>
        <option value="계약직">계약직</option>
        <option value="인턴">인턴</option>
        <option value="프리랜서">프리랜서</option>
      </select>
      <label className="block text-sm">입사일<input type="date" name="hire_date" defaultValue={employee.hire_date} className="w-full border p-2" required /></label>
      <label className="block text-sm">생년월일<input type="date" name="birth_date" defaultValue={employee.birth_date ?? ''} className="w-full border p-2" /></label>
      <input name="phone" defaultValue={employee.phone ?? ''} placeholder="연락처" className="w-full border p-2" />
      <input name="emergency_contact" defaultValue={employee.emergency_contact ?? ''} placeholder="비상연락망" className="w-full border p-2" />
      <label className="block text-sm">정규직전환 평가일 (자동계산됨, 필요시 수정)<input type="date" name="contract_review_date" defaultValue={employee.contract_review_date ?? ''} className="w-full border p-2" /></label>
      <label className="block text-sm">정규직전환 발표일<input type="date" name="contract_announce_date" defaultValue={employee.contract_announce_date ?? ''} className="w-full border p-2" /></label>
      <label className="block text-sm">연봉협상 평가일<input type="date" name="salary_review_date" defaultValue={employee.salary_review_date ?? ''} className="w-full border p-2" /></label>
      <label className="block text-sm">연봉협상 발표일<input type="date" name="salary_announce_date" defaultValue={employee.salary_announce_date ?? ''} className="w-full border p-2" /></label>
      <button type="submit" className="rounded bg-black px-4 py-2 text-white">저장</button>
    </form>
  )
}
```

- [ ] **Step 3: Add `salary_review_date`/`salary_announce_date` to the `Employee` type**

In `lib/types.ts`, add the two fields to the `Employee` interface (after `contract_announce_date`):

```typescript
  contract_review_date: string | null
  contract_announce_date: string | null
  salary_review_date: string | null
  salary_announce_date: string | null
}
```

- [ ] **Step 4: Build the edit page (permission-gated, mirrors the `/employees/new` pattern)**

Create `app/(dashboard)/employees/[id]/edit/page.tsx`:

```tsx
import { redirect, notFound } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'
import { EditEmployeeForm } from '../EditEmployeeForm'
import type { Employee } from '@/lib/types'

export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()
  if (!permissions.canManageEmployees(user.role)) {
    redirect(`/employees/${id}`)
  }

  const supabase = await createServerSupabase()
  const [{ data: employee }, { data: departments }] = await Promise.all([
    supabase.from('employees').select('*').eq('id', id).single(),
    supabase.from('departments').select('id, name').order('name'),
  ])

  if (!employee) notFound()

  return <EditEmployeeForm employee={employee as Employee} departments={departments ?? []} />
}
```

- [ ] **Step 5: Show salary dates and an edit link on the detail page**

Replace `app/(dashboard)/employees/[id]/page.tsx` entirely:

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()
  const supabase = await createServerSupabase()
  const { data: employee } = await supabase.from('employees').select('*').eq('id', id).single()

  if (!employee) notFound()

  return (
    <div className="max-w-lg space-y-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{employee.name}</h1>
        {permissions.canManageEmployees(user.role) && (
          <Link href={`/employees/${id}/edit`} className="rounded border px-3 py-1 text-sm">
            수정
          </Link>
        )}
      </div>
      <p>사번: {employee.employee_number}</p>
      <p>직급: {employee.position ?? '-'}</p>
      <p>근로형태: {employee.employment_type}</p>
      <p>재직상태: {employee.status}</p>
      <p>입사일: {employee.hire_date}</p>
      <p>연락처: {employee.phone ?? '-'}</p>
      <p>비상연락망: {employee.emergency_contact ?? '-'}</p>
      <p>정규직전환 평가일: {employee.contract_review_date ?? '-'}</p>
      <p>정규직전환 발표일: {employee.contract_announce_date ?? '-'}</p>
      <p>연봉협상 평가일: {employee.salary_review_date ?? '-'}</p>
      <p>연봉협상 발표일: {employee.salary_announce_date ?? '-'}</p>
    </div>
  )
}
```

- [ ] **Step 6: Verify manually**

Run `npm run dev`. As admin: open an employee's detail page, confirm the "수정" link appears, click it, change `연봉협상 평가일`, save, confirm the detail page reflects it. Log in as a `viewer`-role test account (or temporarily set your own profile's role to `viewer` in the Supabase table editor and back), confirm the "수정" link is hidden AND that navigating directly to `/employees/<id>/edit` redirects to the detail page instead of showing the form.

- [ ] **Step 7: Commit**

```bash
git add "app/(dashboard)/employees/actions.ts" "app/(dashboard)/employees/[id]" lib/types.ts
git commit -m "feat: add employee edit page with manual override for schedule dates"
```

---

### Task 5: Extend Reminder Rule + Cron for Salary Negotiation Dates

**Files:**
- Modify: `lib/notifications/contract-reminders.ts`
- Modify: `lib/notifications/contract-reminders.test.ts`
- Modify: `app/api/cron/contract-reminders/route.ts`

**Interfaces:**
- Consumes: `notification_log.type` now accepting `'salary_review'`/`'salary_announce'` (Task 1).
- Produces: `ReminderKind` (replaces the old `ContractDateType`), consumed only within this task's own cron route.

- [ ] **Step 1: Rewrite the failing test for the generalized kind**

Replace `lib/notifications/contract-reminders.test.ts` entirely:

```typescript
import { describe, it, expect } from 'vitest'
import { shouldRemind, buildReminderMessage } from './contract-reminders'

describe('shouldRemind', () => {
  it('reminds contract_review exactly 7 days out', () => {
    expect(shouldRemind('2026-09-01', '2026-08-25', 'contract_review')).toBe(true)
    expect(shouldRemind('2026-09-02', '2026-08-25', 'contract_review')).toBe(false)
  })

  it('reminds contract_announce 3 and 1 days out', () => {
    expect(shouldRemind('2026-08-28', '2026-08-25', 'contract_announce')).toBe(true)
    expect(shouldRemind('2026-08-26', '2026-08-25', 'contract_announce')).toBe(true)
    expect(shouldRemind('2026-08-27', '2026-08-25', 'contract_announce')).toBe(false)
  })

  it('reminds salary_review exactly 7 days out', () => {
    expect(shouldRemind('2026-09-01', '2026-08-25', 'salary_review')).toBe(true)
    expect(shouldRemind('2026-09-02', '2026-08-25', 'salary_review')).toBe(false)
  })

  it('reminds salary_announce 3 and 1 days out', () => {
    expect(shouldRemind('2026-08-28', '2026-08-25', 'salary_announce')).toBe(true)
    expect(shouldRemind('2026-08-26', '2026-08-25', 'salary_announce')).toBe(true)
    expect(shouldRemind('2026-08-27', '2026-08-25', 'salary_announce')).toBe(false)
  })
})

describe('buildReminderMessage', () => {
  it('builds a contract review reminder message', () => {
    expect(buildReminderMessage('홍길동', 'contract_review', 7)).toBe(
      '📋 홍길동님의 정규직 전환 평가일이 7일 남았습니다.'
    )
  })

  it('builds a contract announce reminder message', () => {
    expect(buildReminderMessage('홍길동', 'contract_announce', 1)).toBe(
      '📋 홍길동님의 정규직 전환 발표일이 1일 남았습니다.'
    )
  })

  it('builds a salary review reminder message', () => {
    expect(buildReminderMessage('홍길동', 'salary_review', 7)).toBe(
      '📋 홍길동님의 연봉협상 평가일이 7일 남았습니다.'
    )
  })

  it('builds a salary announce reminder message', () => {
    expect(buildReminderMessage('홍길동', 'salary_announce', 1)).toBe(
      '📋 홍길동님의 연봉협상 발표일이 1일 남았습니다.'
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- contract-reminders`
Expected: FAIL — `shouldRemind`/`buildReminderMessage` don't accept `'contract_review'`/`'salary_review'`/etc. yet (current param type is `'review' | 'announce'`), so TypeScript/the old logic mismatches.

- [ ] **Step 3: Rewrite the implementation**

Replace `lib/notifications/contract-reminders.ts` entirely:

```typescript
import { differenceInCalendarDays } from 'date-fns'

export type ReminderKind = 'contract_review' | 'contract_announce' | 'salary_review' | 'salary_announce'

const REVIEW_KINDS: readonly ReminderKind[] = ['contract_review', 'salary_review']

export function shouldRemind(targetDate: string, today: string, kind: ReminderKind): boolean {
  const days = differenceInCalendarDays(new Date(targetDate), new Date(today))
  if (REVIEW_KINDS.includes(kind)) return days === 7
  return days === 3 || days === 1
}

const KIND_LABELS: Record<ReminderKind, string> = {
  contract_review: '정규직 전환 평가일',
  contract_announce: '정규직 전환 발표일',
  salary_review: '연봉협상 평가일',
  salary_announce: '연봉협상 발표일',
}

export function buildReminderMessage(employeeName: string, kind: ReminderKind, daysLeft: number): string {
  return `📋 ${employeeName}님의 ${KIND_LABELS[kind]}이 ${daysLeft}일 남았습니다.`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- contract-reminders`
Expected: PASS (6 tests)

- [ ] **Step 5: Update the cron route to check all 4 date fields**

Replace `app/api/cron/contract-reminders/route.ts` entirely:

```typescript
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { differenceInCalendarDays, format } from 'date-fns'
import { shouldRemind, buildReminderMessage, type ReminderKind } from '@/lib/notifications/contract-reminders'
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
    .select('id, name, contract_review_date, contract_announce_date, salary_review_date, salary_announce_date')
    .eq('status', '재직')

  let sent = 0

  for (const emp of employees ?? []) {
    const checks: { date: string | null; kind: ReminderKind }[] = [
      { date: emp.contract_review_date, kind: 'contract_review' },
      { date: emp.contract_announce_date, kind: 'contract_announce' },
      { date: emp.salary_review_date, kind: 'salary_review' },
      { date: emp.salary_announce_date, kind: 'salary_announce' },
    ]

    for (const check of checks) {
      if (!check.date || !shouldRemind(check.date, today, check.kind)) continue

      const { error: logError } = await supabase.from('notification_log').insert({
        type: check.kind,
        employee_id: emp.id,
        sent_for_date: check.date,
      })

      if (logError) continue // already sent for this date (unique constraint)

      const daysLeft = differenceInCalendarDays(new Date(check.date), new Date(today))
      const message = buildReminderMessage(emp.name, check.kind, daysLeft)
      const ok = await sendSlackNotification({ webhookUrl: process.env.SLACK_WEBHOOK_URL!, text: message })
      if (ok) sent += 1
    }
  }

  return NextResponse.json({ sent })
}
```

- [ ] **Step 6: Verify manually**

In the Supabase table editor, set a test employee's `salary_review_date` to exactly 7 days from today (and `status = '재직'`). Trigger the cron route locally:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/contract-reminders
```

Confirm the Slack channel receives `📋 <name>님의 연봉협상 평가일이 7일 남았습니다.` and a corresponding row appears in `notification_log` with `type = 'salary_review'`. Run the same `curl` command again and confirm no second message is sent (the unique constraint on `notification_log` blocks the duplicate insert).

- [ ] **Step 7: Commit**

```bash
git add lib/notifications/contract-reminders.ts lib/notifications/contract-reminders.test.ts app/api/cron/contract-reminders/route.ts
git commit -m "feat: extend contract reminder cron to cover salary negotiation dates"
```

---

## Backlog (carried forward, unchanged)

Everything below remains explicitly out of scope for this plan, per prior grilling sessions, and is scheduled to be tackled next in this order: **Priority A → Priority C → Priority B**.

- **Priority A** — 증빙 매출/매입 자동 구분 + 가맹점별 실시간 손익·정산 (document-based only, no bank API integration).
- **Priority C** — 가맹점 마스터 Stage 1 (name-only list, mirrors the `departments` table pattern), to support Priority A's counterparty matching. Full franchise module (owner info, contract dates, royalty logic) deferred to Stage 2.
- **Priority B** — Kakao AlimTalk integration (Kakao Business Channel + template approval + a 발송대행사), built as a channel-agnostic notification abstraction so Slack support is preserved in parallel.
- Month 1's original backlog, still deferred: 이메일 자동 증빙 수집 (Gmail 연동), 은행/카드/홈택스 통합조회 + 자금일보, 정규직전환 평가프로세스 자체(평가자 배정/평가표/결과기록 — this plan only automates the *date*, not the evaluation workflow), 급여 계산 자체(4대보험/소득세 자동계산).
