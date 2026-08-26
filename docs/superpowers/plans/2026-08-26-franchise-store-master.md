# Franchise Store Master (가맹점 마스터 Stage 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a minimal 가맹점(franchise store) master list — name + open/closed status — with a small web management page (list, add, open/close toggle), so Priority A's document-based P&L work has a real counterparty entity to attribute receivables/payables to.

**Architecture:** Same layering as every prior slice of this ERP: Postgres RLS is the authorization source of truth, `lib/auth/permissions.ts` gates the UI, and pure validation logic is TDD'd with Vitest. This is explicitly **Stage 1**: name + status only. Owner info, contract dates, and royalty logic are Stage 2, deferred until the user is actually working in 기획운영팀 and knows the real business rules — do not build them opportunistically here.

**Tech Stack:** Next.js 16 (App Router) + TypeScript, Supabase (Postgres + Auth), `zod`, Vitest — no new libraries.

## Global Constraints

- Migrations are append-only: the latest existing migration is `0008_notification_log_salary_types.sql`, so this plan's migration is `0009_franchise_stores.sql`.
- No hard delete for `franchise_stores` — closure is represented by `status = '폐업'`, never a `DELETE`. This preserves referential integrity for whatever later feature (Priority A) ends up pointing at a `franchise_store_id`.
- Read access (`select`) is open to every authenticated role (`admin`, `staff`, `viewer`) — everyone needs to see the list. Write access (create + status toggle) is `admin`/`staff` only, mirroring the `employees` permission tier (not the stricter `departments` admin-only tier), because 기획운영팀 staff — not just the admin — are expected to maintain this list as stores open and close.
- `status` is exactly `'운영중' | '폐업'`. Never introduce a third value in this plan.
- Every task that adds logic without a live Supabase dependency must be TDD'd with Vitest (failing test written and run red before implementation).
- DB migrations in this plan are applied manually by the user via the Supabase SQL Editor (no live DB connection in this dev environment) — verification steps say so explicitly.

---

## File Structure

```
supabase/
  migrations/
    0009_franchise_stores.sql        # NEW: franchise_stores table + RLS
lib/
  types.ts                           # MODIFIED: + FranchiseStore
  auth/
    permissions.ts                   # MODIFIED: + canManageFranchiseStores
    permissions.test.ts              # MODIFIED
  validation/
    franchise-store.ts               # NEW: franchiseStoreSchema (tested)
    franchise-store.test.ts          # NEW
app/
  (dashboard)/
    layout.tsx                       # MODIFIED: + nav link
    franchise-stores/
      page.tsx                       # NEW: list + conditional create form
      actions.ts                     # NEW: createFranchiseStore, toggleFranchiseStoreStatus
      CreateFranchiseStoreForm.tsx   # NEW: client form
      StatusToggleButton.tsx         # NEW: client toggle button
```

---

### Task 1: Database — franchise_stores Table + RLS

**Files:**
- Create: `supabase/migrations/0009_franchise_stores.sql`

**Interfaces:**
- Produces: `franchise_stores` table (`id`, `name`, `status`, `created_by`, `created_at`), referenced by table/column name in every later task.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0009_franchise_stores.sql`:

```sql
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
```

- [ ] **Step 2: Apply manually and verify**

This file is applied by the user in the Supabase SQL Editor — this dev environment has no live DB connection configured. After they confirm it ran without error, verify by asking them to run:

```sql
select table_name from information_schema.tables where table_name = 'franchise_stores';
-- expect: franchise_stores

insert into franchise_stores (name) values ('테스트 가맹점');
select name, status from franchise_stores where name = '테스트 가맹점';
-- expect: 테스트 가맹점 | 운영중
delete from franchise_stores where name = '테스트 가맹점';
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0009_franchise_stores.sql
git commit -m "feat: add franchise_stores table and RLS policies"
```

---

### Task 2: Permission Helper + Domain Type

**Files:**
- Modify: `lib/auth/permissions.ts`
- Modify: `lib/auth/permissions.test.ts`
- Modify: `lib/types.ts`

**Interfaces:**
- Consumes: nothing (pure).
- Produces: `permissions.canManageFranchiseStores(role)` and the `FranchiseStore` type, consumed by Task 4.

- [ ] **Step 1: Write the failing test**

In `lib/auth/permissions.test.ts`, add a new test case inside the existing `describe('permissions', ...)` block (after the "allows only admin to manage users" test):

```typescript
  it('allows admin and staff to manage franchise stores, blocks viewer', () => {
    expect(permissions.canManageFranchiseStores('admin')).toBe(true)
    expect(permissions.canManageFranchiseStores('staff')).toBe(true)
    expect(permissions.canManageFranchiseStores('viewer')).toBe(false)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- permissions`
Expected: FAIL — `permissions.canManageFranchiseStores` is not a function.

- [ ] **Step 3: Implement**

In `lib/auth/permissions.ts`, add a line to the `permissions` object (after `canManageUsers`):

```typescript
  canManageUsers: (role: Role) => role === 'admin',
  canManageFranchiseStores: (role: Role) => role === 'admin' || role === 'staff',
} as const
```

In `lib/types.ts`, add a new interface (after the `PayrollRecord` interface):

```typescript
export interface FranchiseStore {
  id: string
  name: string
  status: '운영중' | '폐업'
  created_at: string
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- permissions`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/auth/permissions.ts lib/auth/permissions.test.ts lib/types.ts
git commit -m "feat: add franchise store permission and domain type"
```

---

### Task 3: Franchise Store Validation Schema

**Files:**
- Create: `lib/validation/franchise-store.ts`
- Create: `lib/validation/franchise-store.test.ts`

**Interfaces:**
- Consumes: nothing (pure).
- Produces: `franchiseStoreSchema`, `FranchiseStoreInput` type, consumed by Task 4's `createFranchiseStore` action.

- [ ] **Step 1: Write the failing test**

Create `lib/validation/franchise-store.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { franchiseStoreSchema } from './franchise-store'

describe('franchiseStoreSchema', () => {
  it('accepts a valid franchise store name', () => {
    expect(franchiseStoreSchema.safeParse({ name: '강남점' }).success).toBe(true)
  })

  it('rejects an empty name', () => {
    const result = franchiseStoreSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- franchise-store.test`
Expected: FAIL with "Cannot find module './franchise-store'"

- [ ] **Step 3: Implement the schema**

Create `lib/validation/franchise-store.ts`:

```typescript
import { z } from 'zod'

export const franchiseStoreSchema = z.object({
  name: z.string().min(1, '가맹점명은 필수입니다'),
})

export type FranchiseStoreInput = z.infer<typeof franchiseStoreSchema>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- franchise-store.test`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/validation/franchise-store.ts lib/validation/franchise-store.test.ts
git commit -m "feat: add franchise store validation schema"
```

---

### Task 4: Franchise Store List Page + Create/Status-Toggle Actions

**Files:**
- Create: `app/(dashboard)/franchise-stores/actions.ts`
- Create: `app/(dashboard)/franchise-stores/CreateFranchiseStoreForm.tsx`
- Create: `app/(dashboard)/franchise-stores/StatusToggleButton.tsx`
- Create: `app/(dashboard)/franchise-stores/page.tsx`
- Modify: `app/(dashboard)/layout.tsx`

**Interfaces:**
- Consumes: `franchiseStoreSchema` (Task 3), `permissions.canManageFranchiseStores` (Task 2), `FranchiseStore` type (Task 2), `getCurrentUser`/`requireUser` (`lib/auth/current-user.ts`), `createServerSupabase` (`lib/supabase/server.ts`).
- Produces: a reachable `/franchise-stores` page, linked from the dashboard nav.

- [ ] **Step 1: Implement the server actions**

Create `app/(dashboard)/franchise-stores/actions.ts`:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase/server'
import { franchiseStoreSchema, type FranchiseStoreInput } from '@/lib/validation/franchise-store'
import { getCurrentUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'

export async function createFranchiseStore(input: FranchiseStoreInput) {
  const user = await getCurrentUser()
  if (!user) return { error: '로그인이 필요합니다' }
  if (!permissions.canManageFranchiseStores(user.role)) {
    return { error: '권한이 없습니다' }
  }

  const parsed = franchiseStoreSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(', ') }
  }

  const supabase = await createServerSupabase()
  const { error } = await supabase.from('franchise_stores').insert({
    ...parsed.data,
    created_by: user.userId,
  })

  if (error) return { error: error.message }

  revalidatePath('/franchise-stores')
  return { error: null }
}

export async function toggleFranchiseStoreStatus(id: string, currentStatus: '운영중' | '폐업') {
  const user = await getCurrentUser()
  if (!user) return { error: '로그인이 필요합니다' }
  if (!permissions.canManageFranchiseStores(user.role)) {
    return { error: '권한이 없습니다' }
  }

  const nextStatus = currentStatus === '운영중' ? '폐업' : '운영중'

  const supabase = await createServerSupabase()
  const { error } = await supabase
    .from('franchise_stores')
    .update({ status: nextStatus })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/franchise-stores')
  return { error: null }
}
```

- [ ] **Step 2: Build the create-form client component**

Create `app/(dashboard)/franchise-stores/CreateFranchiseStoreForm.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createFranchiseStore } from './actions'

export function CreateFranchiseStoreForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    const input = { name: String(formData.get('name') ?? '') }
    const result = await createFranchiseStore(input)
    if (result.error) {
      setError(result.error)
      return
    }
    setError(null)
    router.refresh()
  }

  return (
    <form action={handleSubmit} className="mb-6 flex items-end gap-2">
      <label className="text-sm">
        가맹점명
        <input name="name" className="block border p-2" required />
      </label>
      <button type="submit" className="rounded bg-black px-4 py-2 text-white">추가</button>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </form>
  )
}
```

- [ ] **Step 3: Build the status-toggle client component**

Create `app/(dashboard)/franchise-stores/StatusToggleButton.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { toggleFranchiseStoreStatus } from './actions'

export function StatusToggleButton({ id, status }: { id: string; status: '운영중' | '폐업' }) {
  const router = useRouter()

  async function handleClick() {
    await toggleFranchiseStoreStatus(id, status)
    router.refresh()
  }

  return (
    <button onClick={handleClick} className="rounded border px-2 py-1 text-xs">
      {status === '운영중' ? '폐업 처리' : '운영 재개'}
    </button>
  )
}
```

- [ ] **Step 4: Build the list page**

Create `app/(dashboard)/franchise-stores/page.tsx`:

```tsx
import { requireUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'
import { createServerSupabase } from '@/lib/supabase/server'
import { CreateFranchiseStoreForm } from './CreateFranchiseStoreForm'
import { StatusToggleButton } from './StatusToggleButton'
import type { FranchiseStore } from '@/lib/types'

export default async function FranchiseStoresPage() {
  const user = await requireUser()
  const canManage = permissions.canManageFranchiseStores(user.role)

  const supabase = await createServerSupabase()
  const { data: stores } = await supabase
    .from('franchise_stores')
    .select('*')
    .order('name')

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">가맹점 관리</h1>
      {canManage && <CreateFranchiseStoreForm />}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">가맹점명</th>
            <th className="p-2">상태</th>
            {canManage && <th className="p-2">관리</th>}
          </tr>
        </thead>
        <tbody>
          {(stores as FranchiseStore[] | null)?.map((store) => (
            <tr key={store.id} className="border-b">
              <td className="p-2">{store.name}</td>
              <td className="p-2">{store.status}</td>
              {canManage && (
                <td className="p-2">
                  <StatusToggleButton id={store.id} status={store.status} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 5: Add the nav link**

In `app/(dashboard)/layout.tsx`, add a new entry to the `navItems` array (after the `사원 관리` entry):

```typescript
  const navItems: { href: string; label: string }[] = [
    { href: '/employees', label: '사원 관리' },
    { href: '/franchise-stores', label: '가맹점 관리' },
    ...(permissions.canViewPayroll(user.role) ? [{ href: '/payroll', label: '급여대장' }] : []),
    { href: '/documents', label: '증빙 관리' },
  ]
```

- [ ] **Step 6: Verify manually**

Run `npm run dev`, log in as admin, go to `/franchise-stores`, add a test store, confirm it appears in the list, click "폐업 처리", confirm the status flips to `폐업` and the button now reads "운영 재개". Log in as (or temporarily switch a test profile to) `viewer`, confirm the list is visible but the add form and toggle buttons are hidden.

- [ ] **Step 7: Commit**

```bash
git add "app/(dashboard)/franchise-stores" "app/(dashboard)/layout.tsx"
git commit -m "feat: add franchise store list page with create and status toggle"
```

---

## Backlog (carried forward, unchanged)

- **Stage 2 franchise module** (owner info, contract dates, status transitions beyond open/closed, royalty logic) — deferred until the user is in 기획운영팀 and the real business rules are known; to be re-grilled at that point.
- **Priority A** — 증빙 매출/매입 자동 구분 + 가맹점별 실시간 손익·정산 — next in sequence after this plan, now that `franchise_stores` exists for counterparty matching.
- **Priority B** — Kakao AlimTalk integration (channel-agnostic, Slack preserved in parallel).
- Month 1's original backlog, still deferred: 이메일 자동 증빙 수집 (Gmail 연동), 은행/카드/홈택스 통합조회 + 자금일보, 정규직전환 평가프로세스 자체(평가자 배정/평가표/결과기록), 급여 계산 자체(4대보험/소득세 자동계산).
