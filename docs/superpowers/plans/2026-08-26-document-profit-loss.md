# Document-Based Profit & Loss (증빙 매출/매입 구분 + 가맹점별 손익정산) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let every 증빙(document) be classified as 매출(sales) or 매입(purchase) with an amount and an optional counterparty 가맹점 at upload time, then surface (1) a period P&L summary (총 매출 - 총 매입 = 순손익 for a selected year/month) and (2) a cumulative per-franchise-store 미수금/미지급금 balance list (running 매출-매입 net across all classified documents ever, not period-scoped — this is a balance-sheet concept, not a monthly flow).

**Architecture:** Purely document-based — no bank/card/Hometax API integration (that's separate, deferred backlog). Three new nullable columns on the existing `documents` table carry the classification; two pure, Vitest-tested functions in `lib/reports/profit-loss.ts` do the aggregation math over documents fetched from Supabase (no SQL `GROUP BY`/RPC — data volume is small enough for in-memory aggregation, and this keeps the math unit-testable, matching this codebase's existing style for `lib/notifications/*`).

**Tech Stack:** Next.js 16 (App Router) + TypeScript, Supabase (Postgres + Auth), `zod`, Vitest — no new libraries.

## Global Constraints

- Migrations are append-only; the latest existing migration is `0009_franchise_stores.sql`, so this plan's migration is `0010_document_transactions.sql`.
- **미수금/미지급금 = 매출-매입 순잔액** (net balance), not a separate paid/unpaid status field. No "결제 완료" tracking is built in this plan (explicit user decision — simpler, ship now).
- **Classification is manual only**: a dropdown at upload time (매출 or 매입), never auto-derived from `doc_type`. `doc_type` and `transaction_type` are independent fields.
- **New columns are nullable, and existing (pre-migration) documents are never backfilled.** A document with `transaction_type IS NULL` stays "미분류" forever unless someone edits it later (editing existing documents is out of scope for this plan) and is excluded from every aggregation in this plan — never coerced to a default classification.
- `transaction_type` is exactly `'매출' | '매입'`. Never a third value.
- `franchise_store_id` is optional (nullable) — not every document has a counterparty franchise store (e.g. a general company expense). Only documents with a `franchise_store_id` appear in the per-franchise-store balance list; all classified documents (with or without a franchise store) count toward the period P&L totals.
- Every task that adds logic without a live Supabase dependency must be TDD'd with Vitest (failing test written and run red before implementation).
- DB migrations in this plan are applied manually by the user via the Supabase SQL Editor (no live DB connection in this dev environment) — verification steps say so explicitly.

---

## File Structure

```
supabase/
  migrations/
    0010_document_transactions.sql   # NEW: transaction_type, amount, franchise_store_id on documents
lib/
  types.ts                           # MODIFIED: DocumentRecord + 3 new fields
  auth/
    permissions.ts                   # MODIFIED: + canViewProfitLoss
    permissions.test.ts              # MODIFIED
  validation/
    document.ts                      # MODIFIED: documentMetaSchema + transaction_type/amount/franchise_store_id
    document.test.ts                 # MODIFIED
  reports/
    profit-loss.ts                   # NEW: calculatePeriodTotals, calculateFranchiseBalances (tested)
    profit-loss.test.ts              # NEW
app/
  (dashboard)/
    layout.tsx                       # MODIFIED: + nav link
    documents/
      upload/
        page.tsx                     # MODIFIED: fetches franchise_stores, passes to form
        DocumentUploadForm.tsx       # MODIFIED: + transaction_type/amount/franchise_store_id inputs
      page.tsx                       # MODIFIED: list shows 거래구분/금액/가맹점 columns
    profit-loss/
      page.tsx                       # NEW: period P&L + per-franchise-store balance list
  api/
    documents/
      upload/route.ts                # MODIFIED: parses + inserts the 3 new fields
```

---

### Task 1: Database — Document Transaction Classification Columns

**Files:**
- Create: `supabase/migrations/0010_document_transactions.sql`

**Interfaces:**
- Produces: `documents.transaction_type`, `documents.amount`, `documents.franchise_store_id` columns, referenced by every later task.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0010_document_transactions.sql`:

```sql
-- All three columns are nullable by design: pre-existing documents keep
-- transaction_type/amount/franchise_store_id as NULL ("미분류") forever unless
-- someone edits them later (out of scope for this plan) — every aggregation
-- query in this plan explicitly filters transaction_type is not null, so
-- unclassified rows are silently excluded rather than coerced into a default.
alter table documents
  add column transaction_type text check (transaction_type in ('매출', '매입')),
  add column amount numeric(14, 2),
  add column franchise_store_id uuid references franchise_stores(id);
```

- [ ] **Step 2: Apply manually and verify**

This file is applied by the user in the Supabase SQL Editor — this dev environment has no live DB connection configured. After they confirm it ran without error, verify by asking them to run:

```sql
select column_name from information_schema.columns
where table_name = 'documents' and column_name in ('transaction_type', 'amount', 'franchise_store_id');
-- expect all 3 rows

select transaction_type, amount, franchise_store_id from documents limit 1;
-- expect all NULL on any pre-existing row
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0010_document_transactions.sql
git commit -m "feat: add transaction classification columns to documents"
```

---

### Task 2: Validation Schema + Permission + Type Extension

**Files:**
- Modify: `lib/validation/document.ts`
- Modify: `lib/validation/document.test.ts`
- Modify: `lib/types.ts`
- Modify: `lib/auth/permissions.ts`
- Modify: `lib/auth/permissions.test.ts`

**Interfaces:**
- Consumes: nothing (pure).
- Produces: extended `documentMetaSchema` (consumed by Task 3's upload route), extended `DocumentRecord` type (consumed by Tasks 3-4), `permissions.canViewProfitLoss` (consumed by Task 5's page and the nav link).

- [ ] **Step 1: Write the failing validation tests**

Replace `lib/validation/document.test.ts` entirely:

```typescript
import { describe, it, expect } from 'vitest'
import { documentMetaSchema } from './document'

describe('documentMetaSchema', () => {
  const valid = {
    doc_type: '세금계산서' as const,
    year: 2026,
    month: 8,
    vendor_name: '스터디원 주식회사',
    transaction_type: '매출' as const,
    amount: 500000,
    franchise_store_id: null,
  }

  it('accepts valid metadata', () => {
    expect(documentMetaSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects an invalid doc_type', () => {
    const result = documentMetaSchema.safeParse({ ...valid, doc_type: '영수증묶음' })
    expect(result.success).toBe(false)
  })

  it('rejects a month outside 1-12', () => {
    const result = documentMetaSchema.safeParse({ ...valid, month: 13 })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid transaction_type', () => {
    const result = documentMetaSchema.safeParse({ ...valid, transaction_type: '기타' })
    expect(result.success).toBe(false)
  })

  it('rejects a zero or negative amount', () => {
    expect(documentMetaSchema.safeParse({ ...valid, amount: 0 }).success).toBe(false)
    expect(documentMetaSchema.safeParse({ ...valid, amount: -100 }).success).toBe(false)
  })

  it('accepts a non-null franchise_store_id', () => {
    const result = documentMetaSchema.safeParse({
      ...valid,
      franchise_store_id: '11111111-1111-1111-1111-111111111111',
    })
    expect(result.success).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- document.test`
Expected: FAIL — `transaction_type`/`amount`/`franchise_store_id` are not yet recognized by the schema (extra keys are silently stripped by zod, so the "accepts valid metadata" test still passes, but the invalid-`transaction_type`/zero-`amount` rejection tests fail because those fields don't exist yet to be validated).

- [ ] **Step 3: Extend the schema**

Replace `lib/validation/document.ts` entirely:

```typescript
import { z } from 'zod'
import { ALLOWED_UPLOAD_MIME_TYPES, MAX_FILE_SIZE_BYTES } from './upload'

export const documentMetaSchema = z.object({
  doc_type: z.enum(['세금계산서', '계산서', '신용카드', '현금영수증', '기타']),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  vendor_name: z.string().optional(),
  transaction_type: z.enum(['매출', '매입']),
  amount: z.number().positive('금액은 0보다 커야 합니다'),
  franchise_store_id: z.string().uuid().nullable(),
})

export type DocumentMeta = z.infer<typeof documentMetaSchema>

// Re-exported from lib/validation/upload.ts so existing importers keep working while
// the payroll upload route shares the exact same limits.
export { MAX_FILE_SIZE_BYTES }
export const ALLOWED_MIME_TYPES = ALLOWED_UPLOAD_MIME_TYPES
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- document.test`
Expected: PASS (6 tests)

- [ ] **Step 5: Extend the `DocumentRecord` type**

In `lib/types.ts`, replace the `DocumentRecord` interface:

```typescript
export interface DocumentRecord {
  id: string
  doc_type: '세금계산서' | '계산서' | '신용카드' | '현금영수증' | '기타'
  year: number
  month: number
  vendor_name: string | null
  file_path: string
  file_name: string
  file_size: number
  uploaded_by: string | null
  deleted_at: string | null
  created_at: string
  transaction_type: '매출' | '매입' | null
  amount: number | null
  franchise_store_id: string | null
}
```

- [ ] **Step 6: Write the failing permission test**

In `lib/auth/permissions.test.ts`, add a new test case inside the existing `describe('permissions', ...)` block (after the franchise-store test added in the prior plan):

```typescript
  it('allows admin and staff to view profit/loss, blocks viewer', () => {
    expect(permissions.canViewProfitLoss('admin')).toBe(true)
    expect(permissions.canViewProfitLoss('staff')).toBe(true)
    expect(permissions.canViewProfitLoss('viewer')).toBe(false)
  })
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npm test -- permissions`
Expected: FAIL — `permissions.canViewProfitLoss` is not a function.

- [ ] **Step 8: Implement the permission**

In `lib/auth/permissions.ts`, add a line to the `permissions` object (after `canManageFranchiseStores`):

```typescript
  canManageFranchiseStores: (role: Role) => role === 'admin' || role === 'staff',
  canViewProfitLoss: (role: Role) => role === 'admin' || role === 'staff',
} as const
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npm test -- permissions`
Expected: PASS (6 tests)

- [ ] **Step 10: Commit**

```bash
git add lib/validation/document.ts lib/validation/document.test.ts lib/types.ts lib/auth/permissions.ts lib/auth/permissions.test.ts
git commit -m "feat: extend document schema/type and add profit-loss permission"
```

---

### Task 3: Wire Classification into Document Upload

**Files:**
- Modify: `app/api/documents/upload/route.ts`
- Modify: `app/(dashboard)/documents/upload/DocumentUploadForm.tsx`
- Modify: `app/(dashboard)/documents/upload/page.tsx`

**Interfaces:**
- Consumes: extended `documentMetaSchema` (Task 2).
- Produces: an upload flow that stores `transaction_type`, `amount`, and an optional `franchise_store_id` on every new document.

- [ ] **Step 1: Update the upload route to parse and insert the 3 new fields**

Replace `app/api/documents/upload/route.ts` entirely:

```typescript
import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { documentMetaSchema, MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES } from '@/lib/validation/document'
import { getCurrentUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!permissions.canUploadDocuments(user.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const supabase = await createServerSupabase()

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'no file' }, { status: 400 })
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: '파일이 20MB를 초과합니다' }, { status: 400 })
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ error: '허용되지 않는 파일 형식입니다' }, { status: 400 })
  }

  const franchiseStoreId = formData.get('franchise_store_id')

  const parsed = documentMetaSchema.safeParse({
    doc_type: formData.get('doc_type'),
    year: Number(formData.get('year')),
    month: Number(formData.get('month')),
    vendor_name: formData.get('vendor_name') || undefined,
    transaction_type: formData.get('transaction_type'),
    amount: Number(formData.get('amount')),
    franchise_store_id: franchiseStoreId ? String(franchiseStoreId) : null,
  })

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 })
  }

  const filePath = `${parsed.data.year}/${parsed.data.month}/${Date.now()}-${file.name}`
  const buffer = await file.arrayBuffer()

  const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, buffer, {
    contentType: file.type,
  })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { error: insertError } = await supabase.from('documents').insert({
    ...parsed.data,
    file_path: filePath,
    file_name: file.name,
    file_size: file.size,
    uploaded_by: user.userId,
  })

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Update the upload form to collect the 3 new fields**

Replace `app/(dashboard)/documents/upload/DocumentUploadForm.tsx` entirely:

```tsx
'use client'

import { useState } from 'react'

export interface FranchiseStoreOption {
  id: string
  name: string
}

export function DocumentUploadForm({ franchiseStores }: { franchiseStores: FranchiseStoreOption[] }) {
  const [message, setMessage] = useState<string | null>(null)

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const response = await fetch('/api/documents/upload', { method: 'POST', body: formData })
    const result = await response.json()
    setMessage(result.error ?? '업로드 완료')
    if (!result.error) e.currentTarget.reset()
  }

  const now = new Date()

  return (
    <form onSubmit={handleUpload} className="max-w-md space-y-3">
      <h1 className="text-xl font-bold">증빙 업로드</h1>
      {message && <p>{message}</p>}
      <select name="doc_type" className="w-full border p-2" required>
        <option value="세금계산서">세금계산서</option>
        <option value="계산서">계산서</option>
        <option value="신용카드">신용카드</option>
        <option value="현금영수증">현금영수증</option>
        <option value="기타">기타</option>
      </select>
      <div className="flex gap-2">
        <input type="number" name="year" defaultValue={now.getFullYear()} className="w-1/2 border p-2" required />
        <input type="number" name="month" min={1} max={12} defaultValue={now.getMonth() + 1} className="w-1/2 border p-2" required />
      </div>
      <input name="vendor_name" placeholder="거래처" className="w-full border p-2" />
      <label className="block text-sm">
        거래 구분
        <select name="transaction_type" className="w-full border p-2" required>
          <option value="매출">매출</option>
          <option value="매입">매입</option>
        </select>
      </label>
      <label className="block text-sm">
        금액
        <input type="number" name="amount" min={1} step="1" className="w-full border p-2" required />
      </label>
      <label className="block text-sm">
        가맹점 (선택)
        <select name="franchise_store_id" className="w-full border p-2" defaultValue="">
          <option value="">가맹점 미지정</option>
          {franchiseStores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </select>
      </label>
      <input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls" required />
      <button type="submit" className="rounded bg-black px-4 py-2 text-white">업로드</button>
    </form>
  )
}
```

- [ ] **Step 3: Fetch franchise stores server-side and pass them to the form**

Replace `app/(dashboard)/documents/upload/page.tsx` entirely:

```tsx
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'
import { createServerSupabase } from '@/lib/supabase/server'
import { DocumentUploadForm } from './DocumentUploadForm'

export default async function DocumentUploadPage() {
  const user = await requireUser()

  if (!permissions.canUploadDocuments(user.role)) {
    redirect('/employees')
  }

  const supabase = await createServerSupabase()
  const { data: franchiseStores } = await supabase
    .from('franchise_stores')
    .select('id, name')
    .eq('status', '운영중')
    .order('name')

  return <DocumentUploadForm franchiseStores={franchiseStores ?? []} />
}
```

- [ ] **Step 4: Verify manually**

Run `npm run dev`, log in as admin, go to `/documents/upload`, confirm the 거래 구분/금액/가맹점 fields appear, submit a test upload with `매출` + an amount + a franchise store selected, confirm it succeeds and (via the Supabase table editor) the new row has `transaction_type`, `amount`, and `franchise_store_id` populated. Submit a second test upload with 가맹점 left as "가맹점 미지정" and confirm `franchise_store_id` is `null` for that row.

- [ ] **Step 5: Commit**

```bash
git add app/api/documents/upload/route.ts "app/(dashboard)/documents/upload"
git commit -m "feat: collect transaction classification on document upload"
```

---

### Task 4: Show Classification on the Documents List

**Files:**
- Modify: `app/(dashboard)/documents/page.tsx`

**Interfaces:**
- Consumes: `franchise_stores` embedded relation via Supabase's PostgREST join (same pattern the `employees` list page already uses for `departments`).

- [ ] **Step 1: Add the 3 columns to the list page**

Replace `app/(dashboard)/documents/page.tsx` entirely:

```tsx
import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'
import { DeleteButton } from './DeleteButton'

export default async function DocumentsPage() {
  const user = await requireUser()
  const canUpload = permissions.canUploadDocuments(user.role)
  const canDelete = permissions.canDeleteDocuments(user.role)

  const supabase = await createServerSupabase()
  const { data: documents } = await supabase
    .from('documents')
    .select('*, franchise_stores(name)')
    .is('deleted_at', null)
    .order('year', { ascending: false })
    .order('month', { ascending: false })

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">증빙 관리</h1>
        <div className="flex gap-3">
          {canUpload && (
            <Link href="/documents/upload" className="rounded bg-black px-4 py-2 text-white">+ 증빙 업로드</Link>
          )}
          {canDelete && (
            <Link href="/documents/trash" className="rounded border px-4 py-2">휴지통</Link>
          )}
        </div>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">연/월</th>
            <th className="p-2">유형</th>
            <th className="p-2">거래처</th>
            <th className="p-2">거래구분</th>
            <th className="p-2">금액</th>
            <th className="p-2">가맹점</th>
            <th className="p-2">파일</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {documents?.map((doc) => (
            <tr key={doc.id} className="border-b">
              <td className="p-2">{doc.year}-{String(doc.month).padStart(2, '0')}</td>
              <td className="p-2">{doc.doc_type}</td>
              <td className="p-2">{doc.vendor_name ?? '-'}</td>
              <td className="p-2">{doc.transaction_type ?? '미분류'}</td>
              <td className="p-2">{doc.amount != null ? doc.amount.toLocaleString('ko-KR') : '-'}</td>
              <td className="p-2">{(doc.franchise_stores as unknown as { name: string } | null)?.name ?? '-'}</td>
              <td className="p-2">{doc.file_name}</td>
              <td className="p-2">
                {canDelete && <DeleteButton id={doc.id} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Verify manually**

Run `npm run dev`, go to `/documents`, confirm the new 거래구분/금액/가맹점 columns render — a classified document shows its type/amount/store name, a document with no `franchise_store_id` shows `-`, and (if any pre-migration document exists) it shows `미분류` and `-`/`-`.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/documents/page.tsx"
git commit -m "feat: show transaction classification on the documents list"
```

---

### Task 5: P&L Aggregation Functions (pure, TDD)

**Files:**
- Create: `lib/reports/profit-loss.ts`
- Create: `lib/reports/profit-loss.test.ts`

**Interfaces:**
- Consumes: nothing (pure).
- Produces: `calculatePeriodTotals(documents, year, month)` and `calculateFranchiseBalances(documents)`, consumed by Task 6's page.

- [ ] **Step 1: Write the failing tests**

Create `lib/reports/profit-loss.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { calculatePeriodTotals, calculateFranchiseBalances, type ClassifiedDocument } from './profit-loss'

const docs: ClassifiedDocument[] = [
  { transaction_type: '매출', amount: 1000000, year: 2026, month: 8, franchise_store_id: 'store-a' },
  { transaction_type: '매입', amount: 300000, year: 2026, month: 8, franchise_store_id: 'store-a' },
  { transaction_type: '매출', amount: 500000, year: 2026, month: 8, franchise_store_id: 'store-b' },
  { transaction_type: '매입', amount: 800000, year: 2026, month: 8, franchise_store_id: null },
  { transaction_type: '매출', amount: 200000, year: 2026, month: 7, franchise_store_id: 'store-a' },
]

describe('calculatePeriodTotals', () => {
  it('sums sales and purchases for the given year/month only', () => {
    const result = calculatePeriodTotals(docs, 2026, 8)
    expect(result.totalSales).toBe(1500000)
    expect(result.totalPurchases).toBe(1100000)
    expect(result.netProfit).toBe(400000)
  })

  it('returns zeros for a period with no matching documents', () => {
    const result = calculatePeriodTotals(docs, 2026, 1)
    expect(result).toEqual({ totalSales: 0, totalPurchases: 0, netProfit: 0 })
  })
})

describe('calculateFranchiseBalances', () => {
  it('nets sales minus purchases per franchise store across all periods', () => {
    const result = calculateFranchiseBalances(docs)
    expect(result).toEqual(
      expect.arrayContaining([
        { franchiseStoreId: 'store-a', totalSales: 1200000, totalPurchases: 300000, netBalance: 900000 },
        { franchiseStoreId: 'store-b', totalSales: 500000, totalPurchases: 0, netBalance: 500000 },
      ])
    )
  })

  it('excludes documents with no franchise_store_id', () => {
    const result = calculateFranchiseBalances(docs)
    expect(result).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- profit-loss`
Expected: FAIL with "Cannot find module './profit-loss'"

- [ ] **Step 3: Implement the functions**

Create `lib/reports/profit-loss.ts`:

```typescript
export interface ClassifiedDocument {
  transaction_type: '매출' | '매입'
  amount: number
  year: number
  month: number
  franchise_store_id: string | null
}

export interface PeriodTotals {
  totalSales: number
  totalPurchases: number
  netProfit: number
}

export function calculatePeriodTotals(
  documents: ClassifiedDocument[],
  year: number,
  month: number
): PeriodTotals {
  const inPeriod = documents.filter((d) => d.year === year && d.month === month)
  const totalSales = inPeriod
    .filter((d) => d.transaction_type === '매출')
    .reduce((sum, d) => sum + d.amount, 0)
  const totalPurchases = inPeriod
    .filter((d) => d.transaction_type === '매입')
    .reduce((sum, d) => sum + d.amount, 0)

  return { totalSales, totalPurchases, netProfit: totalSales - totalPurchases }
}

export interface FranchiseBalance {
  franchiseStoreId: string
  totalSales: number
  totalPurchases: number
  netBalance: number
}

/**
 * Cumulative (not period-scoped) net balance per franchise store: 미수금/미지급금
 * is a running balance-sheet concept, not a monthly flow, so this deliberately
 * ignores year/month and nets every classified document ever recorded for that store.
 */
export function calculateFranchiseBalances(documents: ClassifiedDocument[]): FranchiseBalance[] {
  const byStore = new Map<string, { totalSales: number; totalPurchases: number }>()

  for (const doc of documents) {
    if (!doc.franchise_store_id) continue
    const entry = byStore.get(doc.franchise_store_id) ?? { totalSales: 0, totalPurchases: 0 }
    if (doc.transaction_type === '매출') {
      entry.totalSales += doc.amount
    } else {
      entry.totalPurchases += doc.amount
    }
    byStore.set(doc.franchise_store_id, entry)
  }

  return Array.from(byStore.entries()).map(([franchiseStoreId, { totalSales, totalPurchases }]) => ({
    franchiseStoreId,
    totalSales,
    totalPurchases,
    netBalance: totalSales - totalPurchases,
  }))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- profit-loss`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/reports/profit-loss.ts lib/reports/profit-loss.test.ts
git commit -m "feat: add profit-loss aggregation functions"
```

---

### Task 6: Profit & Loss Summary Page

**Files:**
- Create: `app/(dashboard)/profit-loss/page.tsx`
- Modify: `app/(dashboard)/layout.tsx`

**Interfaces:**
- Consumes: `calculatePeriodTotals`, `calculateFranchiseBalances` (Task 5), `permissions.canViewProfitLoss` (Task 2).
- Produces: a reachable `/profit-loss` page, linked from the dashboard nav.

- [ ] **Step 1: Build the page**

Create `app/(dashboard)/profit-loss/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'
import { createServerSupabase } from '@/lib/supabase/server'
import { calculatePeriodTotals, calculateFranchiseBalances, type ClassifiedDocument } from '@/lib/reports/profit-loss'

export default async function ProfitLossPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const user = await requireUser()
  if (!permissions.canViewProfitLoss(user.role)) {
    redirect('/employees')
  }

  const now = new Date()
  const { year: yearParam, month: monthParam } = await searchParams
  const year = Number(yearParam) || now.getFullYear()
  const month = Number(monthParam) || now.getMonth() + 1

  const supabase = await createServerSupabase()
  const [{ data: documents }, { data: franchiseStores }] = await Promise.all([
    supabase
      .from('documents')
      .select('transaction_type, amount, year, month, franchise_store_id')
      .is('deleted_at', null)
      .not('transaction_type', 'is', null),
    supabase.from('franchise_stores').select('id, name'),
  ])

  const classified = (documents ?? []) as ClassifiedDocument[]
  const periodTotals = calculatePeriodTotals(classified, year, month)
  const franchiseBalances = calculateFranchiseBalances(classified)
  const storeNameById = new Map((franchiseStores ?? []).map((s) => [s.id, s.name]))

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="mb-4 text-xl font-bold">손익 정산</h1>
        <form className="mb-4 flex items-end gap-2">
          <label className="text-sm">
            연도
            <input type="number" name="year" defaultValue={year} className="block w-24 border p-2" />
          </label>
          <label className="text-sm">
            월
            <input type="number" name="month" min={1} max={12} defaultValue={month} className="block w-20 border p-2" />
          </label>
          <button type="submit" className="rounded bg-black px-4 py-2 text-white">조회</button>
        </form>
        <table className="w-full border-collapse text-sm">
          <tbody>
            <tr className="border-b">
              <td className="p-2 font-semibold">{year}년 {month}월 매출 합계</td>
              <td className="p-2 text-right">{periodTotals.totalSales.toLocaleString('ko-KR')}원</td>
            </tr>
            <tr className="border-b">
              <td className="p-2 font-semibold">{year}년 {month}월 매입 합계</td>
              <td className="p-2 text-right">{periodTotals.totalPurchases.toLocaleString('ko-KR')}원</td>
            </tr>
            <tr className="border-b">
              <td className="p-2 font-semibold">순손익</td>
              <td className="p-2 text-right">{periodTotals.netProfit.toLocaleString('ko-KR')}원</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-bold">가맹점별 누적 잔액 (미수금/미지급금)</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2">가맹점</th>
              <th className="p-2 text-right">매출 누계</th>
              <th className="p-2 text-right">매입 누계</th>
              <th className="p-2 text-right">순잔액</th>
            </tr>
          </thead>
          <tbody>
            {franchiseBalances.map((balance) => (
              <tr key={balance.franchiseStoreId} className="border-b">
                <td className="p-2">{storeNameById.get(balance.franchiseStoreId) ?? '-'}</td>
                <td className="p-2 text-right">{balance.totalSales.toLocaleString('ko-KR')}원</td>
                <td className="p-2 text-right">{balance.totalPurchases.toLocaleString('ko-KR')}원</td>
                <td className="p-2 text-right">
                  {balance.netBalance >= 0
                    ? `미수금 ${balance.netBalance.toLocaleString('ko-KR')}원`
                    : `미지급금 ${Math.abs(balance.netBalance).toLocaleString('ko-KR')}원`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add the nav link**

In `app/(dashboard)/layout.tsx`, add a new entry to the `navItems` array (after the `가맹점 관리` entry added in the prior plan):

```typescript
  const navItems: { href: string; label: string }[] = [
    { href: '/employees', label: '사원 관리' },
    { href: '/franchise-stores', label: '가맹점 관리' },
    ...(permissions.canViewPayroll(user.role) ? [{ href: '/payroll', label: '급여대장' }] : []),
    ...(permissions.canViewProfitLoss(user.role) ? [{ href: '/profit-loss', label: '손익 정산' }] : []),
    { href: '/documents', label: '증빙 관리' },
  ]
```

- [ ] **Step 3: Verify manually**

Run `npm run dev`, log in as admin, upload 2-3 test documents (a mix of 매출/매입, some with a franchise store, some without, across at least two different months), go to `/profit-loss`, confirm the period totals match the selected month's classified documents and the franchise balance table shows the correct cumulative net per store. Change the year/month inputs and re-submit, confirm the totals update. Log in as (or switch a test profile to) `viewer` and confirm `/profit-loss` redirects away and the nav link is hidden.

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/profit-loss" "app/(dashboard)/layout.tsx"
git commit -m "feat: add profit-loss summary page"
```

---

## Backlog (carried forward, unchanged)

- **Priority B** — Kakao AlimTalk integration (channel-agnostic, Slack preserved in parallel) — next in sequence.
- **Stage 2 franchise module** (owner info, contract dates, royalty logic, closure audit trail) — deferred until the user is in 기획운영팀 and the real business rules are known.
- **Paid/unpaid status tracking per document** — explicitly deferred in this plan (미수금/미지급금 is a pure 매출-매입 net balance for now, not a per-transaction settlement tracker). Revisit if the net-balance model turns out to be insufficient once real royalty/settlement rules are known.
- **Editing/reclassifying existing documents** (including bulk-reclassifying the "미분류" backlog created before this plan shipped) — out of scope; this plan only classifies documents at upload time going forward.
- Month 1's original backlog, still deferred: 이메일 자동 증빙 수집 (Gmail 연동), 은행/카드/홈택스 통합조회 + 자금일보, 정규직전환 평가프로세스 자체, 급여 계산 자체(4대보험/소득세 자동계산).
