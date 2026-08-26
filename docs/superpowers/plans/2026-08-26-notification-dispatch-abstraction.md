# Notification Dispatch Abstraction (카카오 알림톡 대비 채널 추상화) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a channel-agnostic notification dispatch layer so the two existing cron routes stop calling `sendSlackNotification` directly, and instead call `dispatchNotification(text)`, which fans out to whichever channels are configured. Today that's Slack only (unchanged behavior). When a Kakao AlimTalk 발송대행사(vendor) is eventually contracted, adding it becomes a single new entry in `getConfiguredSenders` — no cron route ever needs to change again.

**Architecture:** No Kakao vendor is contracted yet (no Business Channel, no template approval, no vendor account) — this plan deliberately does NOT write any Kakao API code, since every vendor's API shape differs and there's nothing real to call yet. It builds only the seam: a small, pure, Vitest-tested dispatch module plus a thin Slack sender that wraps the existing (already-tested) `sendSlackNotification`.

**Tech Stack:** TypeScript, Vitest — no new libraries, no new external services.

## Global Constraints

- Do not write any Kakao AlimTalk API-calling code in this plan — there is no vendor contract, no credentials, no template ID to call against. This plan's entire scope is the dispatch abstraction + Slack wired through it.
- `dispatchNotification(text)` must return `true` if at least one configured sender succeeded, `false` otherwise — this preserves the existing `if (ok) sent += 1` counting behavior in both cron routes.
- With zero configured senders (e.g. `SLACK_WEBHOOK_URL` unset), `dispatchNotification` must return `false` without throwing — matches `sendSlackNotification`'s existing never-throws, fail-soft contract.
- Every task must be TDD'd with Vitest (failing test written and run red before implementation).

---

## File Structure

```
lib/
  notifications/
    dispatch.ts                          # NEW: getConfiguredSenders, dispatchToSenders, dispatchNotification
    dispatch.test.ts                     # NEW
app/
  api/
    cron/
      contract-reminders/route.ts        # MODIFIED: sendSlackNotification -> dispatchNotification
      birthday-reminders/route.ts        # MODIFIED: sendSlackNotification -> dispatchNotification
```

---

### Task 1: Dispatch Abstraction (pure, TDD)

**Files:**
- Create: `lib/notifications/dispatch.ts`
- Create: `lib/notifications/dispatch.test.ts`

**Interfaces:**
- Consumes: `sendSlackNotification` (`lib/slack/notify.ts`, existing, unchanged).
- Produces: `dispatchNotification(text)` — consumed by Task 2's two cron routes. `getConfiguredSenders`/`dispatchToSenders`/`NotificationSender` are exported for testability but not consumed outside this module.

- [ ] **Step 1: Write the failing tests**

Create `lib/notifications/dispatch.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { getConfiguredSenders, dispatchToSenders, type NotificationSender } from './dispatch'

describe('getConfiguredSenders', () => {
  it('includes a slack sender when SLACK_WEBHOOK_URL is set', () => {
    const senders = getConfiguredSenders({ SLACK_WEBHOOK_URL: 'https://hooks.slack.com/x' })
    expect(senders.map((s) => s.name)).toEqual(['slack'])
  })

  it('returns no senders when SLACK_WEBHOOK_URL is unset', () => {
    const senders = getConfiguredSenders({})
    expect(senders).toEqual([])
  })
})

describe('dispatchToSenders', () => {
  it('returns true if at least one sender succeeds', async () => {
    const senders: NotificationSender[] = [
      { name: 'a', send: vi.fn().mockResolvedValue(false) },
      { name: 'b', send: vi.fn().mockResolvedValue(true) },
    ]
    expect(await dispatchToSenders(senders, '안녕')).toBe(true)
  })

  it('returns false when there are no senders', async () => {
    expect(await dispatchToSenders([], '안녕')).toBe(false)
  })

  it('returns false when every sender fails', async () => {
    const senders: NotificationSender[] = [{ name: 'a', send: vi.fn().mockResolvedValue(false) }]
    expect(await dispatchToSenders(senders, '안녕')).toBe(false)
  })

  it('calls every sender with the same text', async () => {
    const sendA = vi.fn().mockResolvedValue(true)
    const sendB = vi.fn().mockResolvedValue(true)
    await dispatchToSenders([{ name: 'a', send: sendA }, { name: 'b', send: sendB }], '메시지')
    expect(sendA).toHaveBeenCalledWith('메시지')
    expect(sendB).toHaveBeenCalledWith('메시지')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- dispatch.test`
Expected: FAIL with "Cannot find module './dispatch'"

- [ ] **Step 3: Implement the dispatch module**

Create `lib/notifications/dispatch.ts`:

```typescript
import { sendSlackNotification } from '@/lib/slack/notify'

export interface NotificationSender {
  name: string
  send: (text: string) => Promise<boolean>
}

export interface NotificationEnv {
  SLACK_WEBHOOK_URL?: string
}

/**
 * Builds the list of active notification senders from environment config.
 * Kakao AlimTalk has no entry yet: no 발송대행사(vendor) is contracted, and
 * every vendor's API shape differs, so there is nothing real to call. Once a
 * vendor is chosen, add another `if (env.KAKAO_...) senders.push({ name: 'kakao', send: ... })`
 * here — dispatchNotification and every call site stay unchanged.
 */
export function getConfiguredSenders(env: NotificationEnv): NotificationSender[] {
  const senders: NotificationSender[] = []
  if (env.SLACK_WEBHOOK_URL) {
    senders.push({
      name: 'slack',
      send: (text) => sendSlackNotification({ webhookUrl: env.SLACK_WEBHOOK_URL!, text }),
    })
  }
  return senders
}

/** Sends `text` through every sender in parallel; returns true if at least one succeeded. */
export async function dispatchToSenders(senders: NotificationSender[], text: string): Promise<boolean> {
  if (senders.length === 0) return false
  const results = await Promise.all(senders.map((sender) => sender.send(text)))
  return results.some(Boolean)
}

/** Convenience wrapper used by cron routes: builds senders from process.env and dispatches. */
export async function dispatchNotification(text: string): Promise<boolean> {
  return dispatchToSenders(getConfiguredSenders(process.env), text)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- dispatch.test`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/notifications/dispatch.ts lib/notifications/dispatch.test.ts
git commit -m "feat: add channel-agnostic notification dispatch abstraction"
```

---

### Task 2: Wire Both Cron Routes to the Dispatch Layer

**Files:**
- Modify: `app/api/cron/contract-reminders/route.ts`
- Modify: `app/api/cron/birthday-reminders/route.ts`

**Interfaces:**
- Consumes: `dispatchNotification` (Task 1).

- [ ] **Step 1: Wire contract-reminders**

In `app/api/cron/contract-reminders/route.ts`, replace the import:

```typescript
import { sendSlackNotification } from '@/lib/slack/notify'
```

with:

```typescript
import { dispatchNotification } from '@/lib/notifications/dispatch'
```

Replace this block:

```typescript
      const daysLeft = differenceInCalendarDays(new Date(check.date), new Date(today))
      const message = buildReminderMessage(emp.name, check.kind, daysLeft)
      const ok = await sendSlackNotification({ webhookUrl: process.env.SLACK_WEBHOOK_URL!, text: message })
      if (ok) sent += 1
```

with:

```typescript
      const daysLeft = differenceInCalendarDays(new Date(check.date), new Date(today))
      const message = buildReminderMessage(emp.name, check.kind, daysLeft)
      const ok = await dispatchNotification(message)
      if (ok) sent += 1
```

- [ ] **Step 2: Wire birthday-reminders**

In `app/api/cron/birthday-reminders/route.ts`, replace the import:

```typescript
import { sendSlackNotification } from '@/lib/slack/notify'
```

with:

```typescript
import { dispatchNotification } from '@/lib/notifications/dispatch'
```

Replace this block:

```typescript
  const message = buildBirthdayMessage(birthdayEmployees.map((e) => e.name))
  const ok = await sendSlackNotification({ webhookUrl: process.env.SLACK_WEBHOOK_URL!, text: message })

  return NextResponse.json({ sent: ok ? 1 : 0, week: weekKey })
```

with:

```typescript
  const message = buildBirthdayMessage(birthdayEmployees.map((e) => e.name))
  const ok = await dispatchNotification(message)

  return NextResponse.json({ sent: ok ? 1 : 0, week: weekKey })
```

- [ ] **Step 3: Verify**

Run `npm test` (full suite) and `npx tsc --noEmit` — both cron routes no longer import `sendSlackNotification` directly, and behavior is unchanged as long as `SLACK_WEBHOOK_URL` is still set in the environment (it routes through `dispatchNotification` -> `getConfiguredSenders` -> the same `sendSlackNotification` call as before).

- [ ] **Step 4: Commit**

```bash
git add app/api/cron/contract-reminders/route.ts app/api/cron/birthday-reminders/route.ts
git commit -m "feat: route cron notifications through the dispatch abstraction"
```

---

## Backlog (carried forward, unchanged)

- **Kakao AlimTalk vendor integration** — blocked on choosing a 발송대행사 (알리고/비즈엠/NHN클라우드 등), signing up, contracting, and getting message templates approved. Once done, the only code change needed is a new `if (env.KAKAO_...) senders.push(...)` branch in `getConfiguredSenders` (`lib/notifications/dispatch.ts`) — no cron route changes.
- Everything else already in the backlog (Stage 2 franchise module, paid/unpaid document status, 이메일 자동 증빙 수집, 은행/카드/홈택스 통합조회 + 자금일보, 정규직전환 평가프로세스 자체, 급여 계산 자체) remains deferred, unchanged.
