# ERP 디자인 시스템 및 사이드바 셸 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 상단 네브바를 좌측 고정 사이드바 + 모바일 드로어로 교체하고, 시맨틱 라이트/다크 토큰과 공용 UI 프리미티브를 도입해 15개 페이지 전부를 그 위에 재구성한다.

**Architecture:** `app/(dashboard)/layout.tsx`는 `requireUser()`를 쓰는 async 서버 컴포넌트로 남기고, 권한 필터링을 거친 네비 데이터를 클라이언트 `AppShell`에 props로 내린다. 색은 전부 `globals.css`의 시맨틱 CSS 변수로 정의하고 다크 모드는 `:root[data-theme="dark"]`에서 값만 뒤집는다 — 컴포넌트에 `dark:` 유틸리티를 뿌리지 않는다. 테스트 가능한 순수 로직(네비 구성, 배지 톤, 버튼 클래스)은 `lib/` 아래로 분리해 기존 vitest 스위트가 그대로 수집하게 한다.

**Tech Stack:** Next.js 16.3.2 (App Router), React 19.2.8, Tailwind CSS v4, TypeScript strict, vitest 4 (`environment: 'node'`), Supabase SSR.

**Spec:** [docs/superpowers/specs/2026-09-01-erp-design-system-design.md](../specs/2026-09-01-erp-design-system-design.md)

## Global Constraints

- **의존성 추가 금지.** 아이콘은 인라인 SVG로 자체 제공한다. UI 라이브러리를 설치하지 않는다. `package.json`의 dependencies는 변경하지 않는다.
- **도메인 로직 불변.** Supabase 쿼리, 서버 액션 시그니처, `lib/auth/permissions.ts`, `lib/validation/*`, `lib/reports/*` 등을 변경하지 않는다. 유일한 예외는 신규 `lib/auth/actions.ts`(로그아웃)이다.
- **오류 메시지 문구 불변.** 표현만 `Alert`로 교체하고 텍스트는 그대로 둔다.
- **다크 모드는 토큰으로만.** 컴포넌트 코드에 `dark:` 접두사를 쓰지 않는다.
- **유틸리티 클래스로 프리미티브의 내장 스타일을 덮으려 하지 않는다.** Tailwind에서 `class` 속성의 단어 순서는 우선순위를 만들지 않는다 — 컴파일된 CSS에서 나중에 정의된 규칙이 이긴다. `<CardBody className="py-1">`처럼 쓰면 `px-4 py-4 py-1`이 되고 `py-4`가 그대로 적용된다. 프리미티브가 이미 지정한 속성을 바꿔야 하면 그 프리미티브에 명시적 prop을 추가한다 (`CardBody`의 `padding="default" | "tight" | "snug"`이 그 예다). `className`은 프리미티브가 건드리지 않는 속성(grid 배치, `max-w-*` 등)에만 쓴다.
- **테스트 파일 위치.** `vitest.config.ts`의 `include`는 `['lib/**/*.test.ts']`이다. 새 단위 테스트는 반드시 `lib/` 아래에 둔다. `vitest.config.ts`는 수정하지 않는다.
- **`environment: 'node'`.** JSX 렌더링 테스트는 불가능하다. 테스트 대상은 순수 함수뿐이다.
- **실제 enum 값** (`lib/types.ts` 기준, 임의로 바꾸지 말 것):
  - `Employee.status`: `'재직' | '휴직' | '퇴사'`
  - `Employee.employment_type`: `'정규직' | '계약직' | '인턴' | '프리랜서'`
  - `FranchiseStore.status`: `'운영중' | '폐업'`
  - `DocumentRecord.doc_type`: `'세금계산서' | '계산서' | '신용카드' | '현금영수증' | '기타'`
  - `DocumentRecord.transaction_type`: `'매출' | '매입' | null`
  - `Role`: `'admin' | 'staff' | 'viewer'`
- **타이포 스케일 6단 고정.** 이 여섯 개 밖의 크기를 쓰지 않는다. 각 단은 용도가 정해져 있다:

  | 단 | 크기 | 용도 |
  |---|---|---|
  | display | `text-[22px] font-semibold` | `StatCard`의 수치. 유일한 사용처다. |
  | title | `text-[20px] font-semibold` | 페이지 제목 (`PageHeader`, 로그인 화면 제목) |
  | section | `text-[15px] font-semibold` | 카드 제목, 모바일 상단 바 제목, 사이드바 워드마크 |
  | body | `text-[13.5px]` | 본문, 표 셀, 입력 컨트롤, `md` 버튼 |
  | caption | `text-[12px]` | 라벨, 힌트, 배지, 보조 텍스트, `sm`·`icon` 버튼 |
  | eyebrow | `text-[11px]` | 사이드바 그룹 라벨. 유일한 사용처다. |

  위계는 크기를 늘리는 대신 `font-weight`와 색(`text-fg` / `text-fg-muted` / `text-fg-subtle`)으로 만든다.
- **`AGENTS.md` 자동 재생성:** `next dev` 실행 시 `AGENTS.md`가 다시 쓰일 수 있다. diff에 뜨면 되돌리지 말고 작업과 함께 커밋한다.
- **브랜치:** `design/sidebar-shell-and-design-system`. 모든 커밋은 이 브랜치에.

## 스펙 대비 의도된 변경

실제 코드를 확인한 뒤 반영한 것이다. 스펙보다 이 계획이 우선한다.

1. **순수 함수 위치** — 스펙은 `components/ui/badge-tone.ts`라고 했으나, `vitest.config.ts`가 `lib/**/*.test.ts`만 수집하므로 `lib/ui/badge-tone.ts`와 `lib/ui/button-class.ts`에 둔다.
2. **로그아웃 액션 위치** — 스펙은 `app/(dashboard)/actions.ts`라고 했으나, `components/shell/`에서 `@/app/(dashboard)/actions`를 import하는 모양이 나빠 `lib/auth/actions.ts`에 둔다.
3. **배지 톤 매핑** — 스펙의 '활성/비활성'은 실재하지 않는 값이었다. 실제 값 `운영중`/`폐업`으로 매핑한다.
4. **`Textarea` 프리미티브를 만들지 않는다** — 15개 페이지 어디에도 `<textarea>`가 없다. 필요해질 때 `Field.tsx`에 추가한다.
5. **데이터 조회만 하는 서버 `page.tsx`는 수정하지 않는다** — `employees/new/page.tsx`, `employees/[id]/edit/page.tsx`, `employees/bulk-upload/page.tsx`, `documents/upload/page.tsx`, `documents/trash/page.tsx` 다섯 개는 권한 검사와 쿼리만 하고 마크업이 없다. 화면 구성은 각각이 렌더링하는 클라이언트 컴포넌트가 담당하므로 그쪽만 고친다.

---

### Task 1: 의존성 설치 및 기준선 확인

`node_modules`가 없어 아무것도 실행할 수 없는 상태다. 코드를 건드리기 전에 기준선이 그린인지 확인한다.

**Files:**
- 변경 없음 (검증 전용 태스크)

**Interfaces:**
- Consumes: 없음
- Produces: 실행 가능한 `npm run test` / `lint` / `build`, 그리고 읽을 수 있는 `node_modules/next/dist/docs/`

- [ ] **Step 1: 의존성 설치**

```bash
npm install
```

- [ ] **Step 2: 기준선 테스트 통과 확인**

```bash
npm run test
```

기대: 전부 PASS. `lib/` 아래 테스트 파일 12개(`permissions`, `route-guard`, `trash`, `employee-export`, `employee-parser`, `payroll-parser`, `birthday-reminders`, `contract-reminders`, `dispatch`, `profit-loss`, `contract-dates`, `notify`, `document`, `employee`, `franchise-store`)가 수집된다.

여기서 실패하는 테스트가 있으면 **작업을 멈추고 보고한다.** 이번 계획은 도메인 로직을 건드리지 않으므로, 이후 단계에서 발생하는 실패는 전부 이번 작업의 회귀로 간주해야 한다. 기준선이 빨간 상태면 그 판단이 불가능하다.

- [ ] **Step 3: lint / build 기준선 확인**

```bash
npm run lint
npm run build
```

기대: 둘 다 통과.

`build`는 `NEXT_PUBLIC_SUPABASE_*` 환경변수가 없어도 통과해야 한다 (`app/login/LoginForm.tsx`의 주석 참고 — 브라우저 클라이언트를 핸들러 안에서 생성하는 이유가 이것이다). 실패하면 `.env.local.example`을 `.env.local`로 복사하고 재시도한다.

- [ ] **Step 4: Next.js 16 문서 확인**

`AGENTS.md`의 지시사항이다. 이 저장소의 Next.js는 학습 데이터와 API가 다를 수 있다.

```bash
ls node_modules/next/dist/docs/
```

최소한 다음 주제의 가이드를 읽는다:
- App Router 레이아웃 / 라우트 그룹
- `next/font` (특히 `next/font/google`의 `subsets`, `preload`, `variable` 옵션)
- 서버 액션 (`'use server'`)을 클라이언트 컴포넌트에서 import 하는 방법
- `metadata` / `<head>` 처리

Task 2와 Task 6에서 쓰는 API가 이 문서와 다르면 **문서를 따르고** 계획에서 벗어난 점을 보고한다.

- [ ] **Step 5: 커밋 없음**

이 태스크는 소스 변경이 없다. 커밋하지 않고 Task 2로 넘어간다.

---

### Task 2: 디자인 토큰 · 폰트 · 테마 부트스트랩

색 토큰과 폰트 스택을 깔고, 페인트 전에 테마를 확정하는 인라인 스크립트를 넣는다. 이 시점에서 기존 페이지는 아직 원시 유틸리티를 쓰므로 화면은 거의 그대로다 — 배경색과 한글 폰트만 바뀐다.

**Files:**
- Modify: `app/globals.css` (전체 교체)
- Modify: `app/layout.tsx` (전체 교체)

**Interfaces:**
- Consumes: 없음
- Produces: Tailwind 유틸리티로 노출되는 색 토큰 —
  `bg-bg` `bg-surface` `bg-surface-2` `bg-surface-3`,
  `text-fg` `text-fg-muted` `text-fg-subtle`,
  `border-border` `border-border-strong`,
  `bg-accent` `text-accent` `text-accent-fg`,
  `text-positive` `text-warning` `text-negative` (및 각각의 `bg-*`, `border-*`, `/불투명도` 변형).
  그리고 `document.documentElement.dataset.theme`이 항상 `'light'` 또는 `'dark'`로 설정된 상태.

- [ ] **Step 1: `app/globals.css` 전체 교체**

기존 `@media (prefers-color-scheme: dark)` 블록은 제거된다. 그 블록은 어떤 컴포넌트도 참조하지 않으면서 OS 다크 모드에서 대비 파손만 유발하고 있었다.

```css
@import "tailwindcss";

@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));

:root {
  --bg: #fbfbfa;
  --surface: #ffffff;
  --surface-2: #f5f5f4;
  --surface-3: #ebeae8;
  --border: #e7e5e4;
  --border-strong: #d6d3d1;
  --fg: #1c1b1a;
  --fg-muted: #57534e;
  --fg-subtle: #8b8682;
  --accent: #4f46e5;
  --accent-fg: #ffffff;
  --positive: #15803d;
  --warning: #b45309;
  --negative: #b91c1c;
}

:root[data-theme="dark"] {
  --bg: #0b0b0d;
  --surface: #141417;
  --surface-2: #0f0f12;
  --surface-3: #1c1c21;
  --border: #26262b;
  --border-strong: #35353c;
  --fg: #ededec;
  --fg-muted: #a1a1a6;
  --fg-subtle: #6e6e75;
  --accent: #7c74f0;
  --accent-fg: #0b0b0d;
  --positive: #4ade80;
  --warning: #fbbf24;
  --negative: #f87171;
}

@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-surface-3: var(--surface-3);
  --color-border: var(--border);
  --color-border-strong: var(--border-strong);
  --color-fg: var(--fg);
  --color-fg-muted: var(--fg-muted);
  --color-fg-subtle: var(--fg-subtle);
  --color-accent: var(--accent);
  --color-accent-fg: var(--accent-fg);
  --color-positive: var(--positive);
  --color-warning: var(--warning);
  --color-negative: var(--negative);

  --font-sans: var(--font-geist-sans), var(--font-noto-kr), ui-sans-serif, system-ui,
    "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, monospace;
}

html {
  color-scheme: light;
}

html[data-theme="dark"] {
  color-scheme: dark;
}

body {
  background: var(--bg);
  color: var(--fg);
  font-family: var(--font-sans);
  font-size: 13.5px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}

/* 숫자 컬럼의 자릿수 정렬용. Table의 align="right" 셀과 StatCard가 사용한다. */
.tnum {
  font-variant-numeric: tabular-nums;
}
```

`--font-sans`에서 Geist가 먼저, Noto Sans KR이 뒤에 오는 순서가 중요하다. 브라우저는 글리프 단위로 폴백하므로 숫자·영문은 Geist가, 한글은 Noto Sans KR이 렌더링한다.

- [ ] **Step 2: `app/layout.tsx` 전체 교체**

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// preload: false — 한글 서브셋은 unicode-range 청크가 수백 개라 전부 preload하면
// 초기 로드가 수 MB로 불어난다. 브라우저가 실제로 필요한 청크만 받게 둔다.
const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-kr",
  subsets: ["korean", "latin"],
  preload: false,
});

// 페인트 전에 테마를 확정해 라이트/다크 깜빡임을 막는다.
const THEME_INIT = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='light';}})();`;

export const metadata: Metadata = {
  title: "회사 ERP",
  description: "사원정보·증빙·급여대장을 관리하는 사내 ERP 시스템",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${notoSansKr.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-fg">{children}</body>
    </html>
  );
}
```

`lang`을 `"en"`에서 `"ko"`로 고친다. 화면 전체가 한국어인데 `en`으로 선언되어 있어 스크린리더가 잘못 읽는다.

- [ ] **Step 3: 빌드로 폰트 옵션 검증**

```bash
npm run build
```

기대: 통과.

`next/font`가 `subsets: ["korean", ...]`를 거부하면 에러 메시지에 **허용되는 서브셋 목록이 그대로 출력된다.** 그 목록에서 한글에 해당하는 이름을 골라 교체하고 다시 빌드한다. `weight`를 요구하는 에러가 나오면 (Noto Sans KR이 이 버전에서 가변 폰트로 제공되지 않는 경우) `weight: ["400", "500", "700"]`을 추가한다.

`LayoutProps<"/">` 타입이 없다고 하면 Task 1 Step 4에서 읽은 문서의 시그니처를 따른다.

- [ ] **Step 4: lint 통과 확인**

```bash
npm run lint
```

기대: 통과. `dangerouslySetInnerHTML`은 `eslint-config-next`에서 금지되지 않는다. 만약 규칙에 걸리면 해당 줄에만 `// eslint-disable-next-line` 을 붙이고 이유를 주석으로 남긴다 (FOUC 방지 목적).

- [ ] **Step 5: 육안 확인**

```bash
npm run dev
```

`/login`을 연다. 확인 사항:
- 배경이 순백(`#ffffff`)이 아니라 미세하게 따뜻한 `#fbfbfa`다.
- 브라우저 devtools에서 `<html>`에 `data-theme="light"` 또는 `"dark"`가 붙어 있다.
- devtools 콘솔에서 `localStorage.setItem('theme','dark'); location.reload()` 실행 시 배경이 `#0b0b0d`로 바뀌고, **새로고침 순간 흰 화면 깜빡임이 없다.**
- 한글 텍스트가 맑은 고딕이 아닌 Noto Sans KR로 렌더링된다 (devtools Computed → Rendered Fonts에서 확인).

확인 후 `localStorage.removeItem('theme')`로 되돌리고 dev 서버를 종료한다.

- [ ] **Step 6: 커밋**

```bash
git add app/globals.css app/layout.tsx AGENTS.md
git commit -m "feat: add semantic design tokens, Korean webfont, and theme bootstrap"
```

`AGENTS.md`가 `next dev`에 의해 재생성되지 않았다면 `git add`에서 빠지고 경고도 나지 않는다. 그대로 진행한다.

---

### Task 3: 순수 로직 — 네비 구성 · 배지 톤 · 버튼 클래스 (TDD)

UI 컴포넌트에서 테스트 가능한 부분만 떼어낸다. 세 파일 모두 JSX가 없는 순수 함수라 `environment: 'node'`에서 그대로 돌아간다.

**Files:**
- Create: `lib/nav/items.ts`
- Create: `lib/nav/items.test.ts`
- Create: `lib/ui/badge-tone.ts`
- Create: `lib/ui/badge-tone.test.ts`
- Create: `lib/ui/button-class.ts`
- Create: `lib/ui/button-class.test.ts`

**Interfaces:**
- Consumes: `permissions` from `@/lib/auth/permissions`, `Role` from `@/lib/types` (Task 1에서 확인한 기존 코드)
- Produces:
  - `type NavIconName = 'users' | 'wallet' | 'store' | 'chart' | 'file'`
  - `interface NavItem { href: string; label: string; icon: NavIconName }`
  - `interface NavGroup { label: string; items: NavItem[] }`
  - `buildNavItems(role: Role): NavGroup[]`
  - `isNavItemActive(pathname: string, href: string): boolean`
  - `findNavLabel(groups: NavGroup[], pathname: string): string | null`
  - `type BadgeTone = 'positive' | 'warning' | 'negative' | 'accent' | 'neutral'`
  - `toneForStatus(status: string | null | undefined): BadgeTone`
  - `type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'`
  - `type ButtonSize = 'sm' | 'md' | 'icon'`
  - `buttonClass(variant?: ButtonVariant, size?: ButtonSize, extra?: string): string`

- [ ] **Step 1: 실패하는 테스트 작성 — `lib/nav/items.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { buildNavItems, isNavItemActive, findNavLabel } from './items'

function hrefs(role: 'admin' | 'staff' | 'viewer') {
  return buildNavItems(role).flatMap((g) => g.items.map((i) => i.href))
}

describe('buildNavItems', () => {
  it('gives admin every menu item', () => {
    expect(hrefs('admin')).toEqual([
      '/employees',
      '/payroll',
      '/franchise-stores',
      '/profit-loss',
      '/documents',
    ])
  })

  it('gives staff every menu item', () => {
    expect(hrefs('staff')).toEqual(hrefs('admin'))
  })

  it('hides payroll and profit-loss from viewer', () => {
    expect(hrefs('viewer')).toEqual(['/employees', '/franchise-stores', '/documents'])
  })

  it('groups items under 인사 and 정산', () => {
    expect(buildNavItems('admin').map((g) => g.label)).toEqual(['인사', '정산'])
  })

  it('drops a group that has no visible items', () => {
    // viewer의 인사 그룹에는 /employees가 남으므로 그룹은 유지된다.
    // 빈 그룹 제거 자체는 항상 성립해야 한다.
    for (const role of ['admin', 'staff', 'viewer'] as const) {
      for (const group of buildNavItems(role)) {
        expect(group.items.length).toBeGreaterThan(0)
      }
    }
  })

  it('assigns an icon name to every item', () => {
    for (const group of buildNavItems('admin')) {
      for (const item of group.items) {
        expect(item.icon).toBeTruthy()
      }
    }
  })
})

describe('isNavItemActive', () => {
  it('matches the exact path', () => {
    expect(isNavItemActive('/employees', '/employees')).toBe(true)
  })

  it('matches a nested path', () => {
    expect(isNavItemActive('/employees/abc/edit', '/employees')).toBe(true)
  })

  it('does not match a sibling path with a shared prefix', () => {
    expect(isNavItemActive('/employees-archive', '/employees')).toBe(false)
  })

  it('does not match an unrelated path', () => {
    expect(isNavItemActive('/documents', '/employees')).toBe(false)
  })
})

describe('findNavLabel', () => {
  it('returns the label of the active item', () => {
    expect(findNavLabel(buildNavItems('admin'), '/profit-loss')).toBe('손익 정산')
  })

  it('returns the label for a nested route', () => {
    expect(findNavLabel(buildNavItems('admin'), '/documents/trash')).toBe('증빙 관리')
  })

  it('returns null when nothing matches', () => {
    expect(findNavLabel(buildNavItems('admin'), '/nowhere')).toBeNull()
  })
})
```

- [ ] **Step 2: 실패하는 테스트 작성 — `lib/ui/badge-tone.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { toneForStatus } from './badge-tone'

describe('toneForStatus', () => {
  it('maps healthy states to positive', () => {
    expect(toneForStatus('재직')).toBe('positive')
    expect(toneForStatus('운영중')).toBe('positive')
    expect(toneForStatus('매출')).toBe('positive')
    expect(toneForStatus('미수금')).toBe('positive')
  })

  it('maps 휴직 to warning', () => {
    expect(toneForStatus('휴직')).toBe('warning')
  })

  it('maps ended and owed states to negative', () => {
    expect(toneForStatus('퇴사')).toBe('negative')
    expect(toneForStatus('폐업')).toBe('negative')
    expect(toneForStatus('미지급금')).toBe('negative')
  })

  it('maps 매입 to accent so it reads apart from 매출', () => {
    expect(toneForStatus('매입')).toBe('accent')
  })

  it('falls back to neutral for an unknown value', () => {
    expect(toneForStatus('미분류')).toBe('neutral')
    expect(toneForStatus('정규직')).toBe('neutral')
  })

  it('falls back to neutral for null and undefined', () => {
    expect(toneForStatus(null)).toBe('neutral')
    expect(toneForStatus(undefined)).toBe('neutral')
    expect(toneForStatus('')).toBe('neutral')
  })
})
```

- [ ] **Step 3: 실패하는 테스트 작성 — `lib/ui/button-class.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { buttonClass } from './button-class'

describe('buttonClass', () => {
  it('defaults to the primary variant at md size', () => {
    const cls = buttonClass()
    expect(cls).toContain('bg-accent')
    expect(cls).toContain('h-9')
  })

  it('renders the secondary variant with a border', () => {
    expect(buttonClass('secondary')).toContain('border-border-strong')
  })

  it('renders the danger variant in the negative colour', () => {
    expect(buttonClass('danger')).toContain('text-negative')
  })

  it('renders the ghost variant without a background', () => {
    expect(buttonClass('ghost')).not.toContain('bg-accent')
  })

  it('applies the small size', () => {
    expect(buttonClass('primary', 'sm')).toContain('h-8')
  })

  it('makes the icon size square', () => {
    const cls = buttonClass('ghost', 'icon')
    expect(cls).toContain('h-8')
    expect(cls).toContain('w-8')
  })

  it('appends extra classes at the end', () => {
    expect(buttonClass('primary', 'md', 'w-full').endsWith('w-full')).toBe(true)
  })

  it('omits a falsy extra without leaving a trailing space', () => {
    expect(buttonClass('primary', 'md')).toBe(buttonClass('primary', 'md').trim())
  })

  it('always includes a visible focus ring', () => {
    for (const v of ['primary', 'secondary', 'ghost', 'danger'] as const) {
      expect(buttonClass(v)).toContain('focus-visible:ring-2')
    }
  })
})
```

- [ ] **Step 4: 테스트가 실패하는지 확인**

```bash
npx vitest run lib/nav lib/ui
```

기대: FAIL — `Failed to resolve import "./items"`, `"./badge-tone"`, `"./button-class"`. 모듈이 아직 없으므로 수집 단계에서 터진다.

- [ ] **Step 5: `lib/nav/items.ts` 구현**

```ts
import { permissions } from '@/lib/auth/permissions'
import type { Role } from '@/lib/types'

export type NavIconName = 'users' | 'wallet' | 'store' | 'chart' | 'file'

export interface NavItem {
  href: string
  label: string
  icon: NavIconName
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

/**
 * 사이드바 메뉴를 역할에 따라 구성한다.
 *
 * 서버 레이아웃에서 호출해 결과를 클라이언트 셸에 props로 내린다. 덕분에
 * 클라이언트 번들은 권한 규칙을 알 필요가 없고, 이 함수는 순수 함수로 남아
 * 단위 테스트가 가능하다.
 */
export function buildNavItems(role: Role): NavGroup[] {
  const groups: NavGroup[] = [
    {
      label: '인사',
      items: [
        { href: '/employees', label: '사원 관리', icon: 'users' },
        ...(permissions.canViewPayroll(role)
          ? [{ href: '/payroll', label: '급여대장', icon: 'wallet' as const }]
          : []),
      ],
    },
    {
      label: '정산',
      items: [
        { href: '/franchise-stores', label: '가맹점 관리', icon: 'store' },
        ...(permissions.canViewProfitLoss(role)
          ? [{ href: '/profit-loss', label: '손익 정산', icon: 'chart' as const }]
          : []),
        { href: '/documents', label: '증빙 관리', icon: 'file' },
      ],
    },
  ]

  return groups.filter((group) => group.items.length > 0)
}

/**
 * 현재 경로가 이 메뉴에 속하는지 판별한다.
 *
 * `href + '/'`로 비교하는 이유: `/employees-archive` 같은 형제 경로가
 * `startsWith('/employees')`에 걸려 잘못 활성화되는 것을 막는다.
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** 모바일 상단 바에 표시할 현재 페이지 이름. */
export function findNavLabel(groups: NavGroup[], pathname: string): string | null {
  for (const group of groups) {
    for (const item of group.items) {
      if (isNavItemActive(pathname, item.href)) return item.label
    }
  }
  return null
}
```

- [ ] **Step 6: `lib/ui/badge-tone.ts` 구현**

```ts
export type BadgeTone = 'positive' | 'warning' | 'negative' | 'accent' | 'neutral'

/**
 * 도메인 상태 문자열 → 배지 색조.
 *
 * 키는 전부 lib/types.ts의 실제 유니온 값이거나 손익 화면이 만들어내는
 * 파생 라벨(미수금/미지급금)이다. 모르는 값은 neutral로 떨어뜨려
 * DB에 새 상태가 생겨도 화면이 깨지지 않게 한다.
 */
const TONE_BY_STATUS: Record<string, BadgeTone> = {
  재직: 'positive',
  운영중: 'positive',
  매출: 'positive',
  미수금: 'positive',
  휴직: 'warning',
  퇴사: 'negative',
  폐업: 'negative',
  미지급금: 'negative',
  매입: 'accent',
}

export function toneForStatus(status: string | null | undefined): BadgeTone {
  if (!status) return 'neutral'
  return TONE_BY_STATUS[status] ?? 'neutral'
}
```

- [ ] **Step 7: `lib/ui/button-class.ts` 구현**

```ts
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'icon'

const BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ' +
  'disabled:pointer-events-none disabled:opacity-50'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-fg hover:bg-accent/90',
  secondary: 'border border-border-strong bg-surface text-fg hover:bg-surface-3',
  ghost: 'text-fg-muted hover:bg-surface-3 hover:text-fg',
  danger: 'text-negative hover:bg-negative/10',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-2.5 text-[12px]',
  md: 'h-9 px-3.5 text-[13.5px]',
  icon: 'h-8 w-8 p-0 text-[13.5px]',
}

/**
 * <button>과 <Link>가 같은 모양을 갖도록 클래스 문자열만 만들어 준다.
 * Button 컴포넌트도 내부적으로 이걸 쓴다.
 */
export function buttonClass(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  extra?: string,
): string {
  return [BASE, VARIANTS[variant], SIZES[size], extra].filter(Boolean).join(' ')
}
```

- [ ] **Step 8: 테스트 통과 확인**

```bash
npx vitest run lib/nav lib/ui
```

기대: PASS (28개 테스트 — items 13, badge-tone 6, button-class 9).

- [ ] **Step 9: 전체 스위트 회귀 확인**

```bash
npm run test
```

기대: 기존 테스트 전부 PASS + 신규 28개 PASS.

- [ ] **Step 10: 커밋**

```bash
git add lib/nav lib/ui
git commit -m "feat: add pure nav, badge tone, and button class helpers"
```

---

### Task 4: UI 프리미티브 A — Button, Badge, Alert, Card, PageHeader, EmptyState

레이아웃과 액션 계열 프리미티브. 아직 어떤 페이지도 이걸 쓰지 않으므로 화면은 변하지 않는다.

**Files:**
- Create: `components/ui/Button.tsx`
- Create: `components/ui/Badge.tsx`
- Create: `components/ui/Alert.tsx`
- Create: `components/ui/Card.tsx`
- Create: `components/ui/PageHeader.tsx`
- Create: `components/ui/EmptyState.tsx`

**Interfaces:**
- Consumes: `buttonClass`, `ButtonVariant`, `ButtonSize` from `@/lib/ui/button-class`; `toneForStatus`, `BadgeTone` from `@/lib/ui/badge-tone`
- Produces:
  - `<Button variant? size? {...ButtonHTMLAttributes}>`
  - `<Badge tone? status? children>` — `status`를 주면 톤을 자동 판별, `tone`을 주면 그게 우선
  - `<Alert variant="error" | "success" | "info" children>`
  - `<Card className?>`, `<CardHeader>`, `<CardTitle>`, `<CardBody className?>`
  - `<PageHeader title description? actions?>`
  - `<EmptyState title description? action?>`

- [ ] **Step 1: `components/ui/Button.tsx` 작성**

```tsx
import type { ButtonHTMLAttributes } from 'react'
import { buttonClass, type ButtonSize, type ButtonVariant } from '@/lib/ui/button-class'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return <button {...props} className={buttonClass(variant, size, className)} />
}
```

- [ ] **Step 2: `components/ui/Badge.tsx` 작성**

```tsx
import { toneForStatus, type BadgeTone } from '@/lib/ui/badge-tone'

const TONE_CLASS: Record<BadgeTone, string> = {
  positive: 'bg-positive/12 text-positive',
  warning: 'bg-warning/12 text-warning',
  negative: 'bg-negative/12 text-negative',
  accent: 'bg-accent/12 text-accent',
  neutral: 'bg-surface-3 text-fg-muted',
}

export function Badge({
  children,
  tone,
  status,
}: {
  children: React.ReactNode
  /** 명시적 색조. 주면 status 자동 판별보다 우선한다. */
  tone?: BadgeTone
  /** 도메인 상태 문자열. 색조를 자동으로 정한다. */
  status?: string | null
}) {
  const resolved = tone ?? toneForStatus(status)
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-medium ${TONE_CLASS[resolved]}`}
    >
      {children}
    </span>
  )
}
```

- [ ] **Step 3: `components/ui/Alert.tsx` 작성**

```tsx
const VARIANT_CLASS = {
  error: 'border-negative/30 bg-negative/8 text-negative',
  success: 'border-positive/30 bg-positive/8 text-positive',
  info: 'border-border bg-surface-2 text-fg-muted',
} as const

export type AlertVariant = keyof typeof VARIANT_CLASS

export function Alert({
  variant = 'info',
  children,
  className,
}: {
  variant?: AlertVariant
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      role="alert"
      className={`rounded-md border px-3 py-2 text-[13.5px] ${VARIANT_CLASS[variant]} ${className ?? ''}`}
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 4: `components/ui/Card.tsx` 작성**

```tsx
export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-border bg-surface ${className ?? ''}`}>
      {children}
    </section>
  )
}

export function CardHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
      {children}
    </div>
  )
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[15px] font-semibold text-fg">{children}</h2>
}

/**
 * 세로 패딩은 `padding` prop으로만 고른다. `className`으로 `py-*`를 넘기면
 * 안 된다 — 클래스 문자열의 순서는 캐스케이드를 결정하지 않고, 컴파일된
 * CSS에서 나중에 정의된 규칙이 이기므로 기본값 `py-4`가 그대로 남는다.
 * `className`은 패딩과 충돌하지 않는 것(grid 배치 등)에만 쓴다.
 */
const CARD_BODY_PADDING = {
  /** 일반 카드 본문. */
  default: 'px-4 py-4',
  /** 행마다 자체 패딩이 있는 내용(DescriptionList, divide-y 목록)을 담을 때. */
  tight: 'px-4 py-1',
  /** 한 줄짜리 필터·액션 바. */
  snug: 'px-4 py-3',
} as const

export type CardBodyPadding = keyof typeof CARD_BODY_PADDING

export function CardBody({
  children,
  padding = 'default',
  className,
}: {
  children: React.ReactNode
  padding?: CardBodyPadding
  className?: string
}) {
  return <div className={`${CARD_BODY_PADDING[padding]} ${className ?? ''}`}>{children}</div>
}
```

- [ ] **Step 5: `components/ui/PageHeader.tsx` 작성**

```tsx
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-[20px] font-semibold tracking-tight text-fg">{title}</h1>
        {description && <p className="mt-1 text-[13.5px] text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
```

- [ ] **Step 6: `components/ui/EmptyState.tsx` 작성**

```tsx
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div
        aria-hidden
        className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-surface-3 text-fg-subtle"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M4 7h16M4 12h16M4 17h9" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-[13.5px] font-medium text-fg">{title}</p>
      {description && <p className="max-w-sm text-[12px] text-fg-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
```

- [ ] **Step 7: 타입 검사와 lint 통과 확인**

```bash
npx tsc --noEmit
npm run lint
```

기대: 둘 다 통과. 아직 이 컴포넌트들을 쓰는 곳이 없으므로 `build`는 트리셰이킹으로 넘어간다 — `tsc --noEmit`으로 타입을 직접 확인하는 이유다.

- [ ] **Step 8: 커밋**

```bash
git add components/ui
git commit -m "feat: add Button, Badge, Alert, Card, PageHeader, EmptyState primitives"
```

---

### Task 5: UI 프리미티브 B — Table, 폼 컨트롤, DescriptionList, StatCard

데이터 표시와 폼 입력 계열. Task 4와 마찬가지로 아직 사용처가 없다.

**Files:**
- Create: `components/ui/Table.tsx`
- Create: `components/ui/Field.tsx`
- Create: `components/ui/DescriptionList.tsx`
- Create: `components/ui/StatCard.tsx`

**Interfaces:**
- Consumes: `EmptyState` from `@/components/ui/EmptyState` (Task 4)
- Produces:
  - `<Table>`, `<THead>`, `<TBody>`, `<TR className?>`, `<TH align?>`, `<TD align? className?>` — `align`은 `'left' | 'right'`, `'right'`면 우측 정렬 + `tabular-nums`
  - `<TableEmpty colSpan title description?>` — 표 안의 빈 상태 행
  - `<Field label htmlFor? hint? error? children>`, `<Input>`, `<Select>`, `<FileInput>`
  - `<DescriptionList items={{ label, value }[]}>`
  - `<StatCard label value tone? hint?>`

- [ ] **Step 1: `components/ui/Table.tsx` 작성**

```tsx
import { EmptyState } from './EmptyState'

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full border-collapse text-[13.5px]">{children}</table>
    </div>
  )
}

export function THead({ children }: { children: React.ReactNode }) {
  return <thead className="bg-surface-2">{children}</thead>
}

/** hover는 tbody 행에만 걸린다 — 헤더 행까지 반응하면 클릭 가능해 보인다. */
export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="[&_tr:hover]:bg-surface-3/50">{children}</tbody>
}

export function TR({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <tr className={`border-b border-border last:border-b-0 ${className ?? ''}`}>{children}</tr>
  )
}

export function TH({
  children,
  align = 'left',
}: {
  children?: React.ReactNode
  align?: 'left' | 'right'
}) {
  return (
    <th
      className={`px-3 py-2.5 text-[12px] font-medium tracking-wide text-fg-subtle ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  )
}

export function TD({
  children,
  align = 'left',
  className,
}: {
  children?: React.ReactNode
  align?: 'left' | 'right'
  className?: string
}) {
  return (
    <td
      className={`px-3 py-2.5 align-middle ${
        align === 'right' ? 'text-right tnum' : 'text-left'
      } ${className ?? ''}`}
    >
      {children}
    </td>
  )
}

/** 목록이 비었을 때 표 안에 그대로 넣는 행. */
export function TableEmpty({
  colSpan,
  title,
  description,
}: {
  colSpan: number
  title: string
  description?: string
}) {
  return (
    <tr>
      <td colSpan={colSpan}>
        <EmptyState title={title} description={description} />
      </td>
    </tr>
  )
}
```

- [ ] **Step 2: `components/ui/Field.tsx` 작성**

```tsx
import type { InputHTMLAttributes, SelectHTMLAttributes } from 'react'

const CONTROL =
  'w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-[13.5px] text-fg ' +
  'placeholder:text-fg-subtle transition-colors ' +
  'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 ' +
  'disabled:opacity-50'

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string
  htmlFor?: string
  hint?: string
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <label htmlFor={htmlFor} className="text-[12px] font-medium text-fg-muted">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-[12px] text-fg-subtle">{hint}</p>}
      {error && <p className="text-[12px] text-negative">{error}</p>}
    </div>
  )
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${CONTROL} ${className ?? ''}`} />
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${CONTROL} ${className ?? ''}`} />
}

/**
 * 파일 입력은 브라우저 기본 위젯 모양이 제각각이라 ::file-selector-button만
 * 다시 칠하고 나머지는 컨트롤 스타일을 공유한다.
 */
export function FileInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      type="file"
      className={
        'w-full rounded-md border border-dashed border-border-strong bg-surface-2 px-2.5 py-2 text-[13.5px] text-fg-muted ' +
        'file:mr-3 file:rounded file:border-0 file:bg-surface-3 file:px-2.5 file:py-1 ' +
        'file:text-[12px] file:font-medium file:text-fg ' +
        'focus:outline-none focus:ring-2 focus:ring-accent/25 ' +
        (className ?? '')
      }
    />
  )
}
```

- [ ] **Step 3: `components/ui/DescriptionList.tsx` 작성**

```tsx
export interface DescriptionItem {
  label: string
  value: React.ReactNode
}

export function DescriptionList({ items }: { items: DescriptionItem[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-0 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 last:border-b-0"
        >
          <dt className="shrink-0 text-[12px] font-medium text-fg-subtle">{item.label}</dt>
          <dd className="text-right text-[13.5px] text-fg">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
```

- [ ] **Step 4: `components/ui/StatCard.tsx` 작성**

```tsx
const TONE_CLASS = {
  neutral: 'text-fg',
  positive: 'text-positive',
  negative: 'text-negative',
} as const

export type StatTone = keyof typeof TONE_CLASS

export function StatCard({
  label,
  value,
  tone = 'neutral',
  hint,
}: {
  label: string
  value: string
  tone?: StatTone
  hint?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3.5">
      <p className="text-[12px] font-medium text-fg-subtle">{label}</p>
      <p className={`mt-1.5 text-[22px] font-semibold tracking-tight tnum ${TONE_CLASS[tone]}`}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[12px] text-fg-subtle">{hint}</p>}
    </div>
  )
}
```

- [ ] **Step 5: 타입 검사와 lint 통과 확인**

```bash
npx tsc --noEmit
npm run lint
```

기대: 둘 다 통과.

- [ ] **Step 6: 커밋**

```bash
git add components/ui
git commit -m "feat: add Table, form control, DescriptionList, and StatCard primitives"
```

---

### Task 6: 아이콘 · 로그아웃 액션 · 테마 토글

셸에 필요한 조각들. 이것들만으로는 화면이 변하지 않는다.

**Files:**
- Create: `components/shell/icons.tsx`
- Create: `components/shell/ThemeToggle.tsx`
- Create: `lib/auth/actions.ts`

**Interfaces:**
- Consumes: `NavIconName` from `@/lib/nav/items`; `buttonClass` from `@/lib/ui/button-class`; `createServerSupabase` from `@/lib/supabase/server`
- Produces:
  - `type IconName = NavIconName | 'menu' | 'close' | 'sun' | 'moon' | 'logout'`
  - `<Icon name size?>` — 기본 `size` 16
  - `<ThemeToggle />`
  - `async function signOut(): Promise<void>` — 서버 액션, `/login`으로 리다이렉트

- [ ] **Step 1: `components/shell/icons.tsx` 작성**

의존성 없이 인라인 SVG로 제공한다. 전부 24×24 viewBox, `currentColor` 스트로크로 통일해 색은 부모가 정한다.

```tsx
import type { NavIconName } from '@/lib/nav/items'

export type IconName = NavIconName | 'menu' | 'close' | 'sun' | 'moon' | 'logout'

const PATHS: Record<IconName, React.ReactNode> = {
  users: (
    <>
      <path d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19" />
      <circle cx="10" cy="8" r="3.2" />
      <path d="M20 19v-1.4a3.5 3.5 0 0 0-2.6-3.4M15.6 5.2a3.2 3.2 0 0 1 0 5.6" />
    </>
  ),
  wallet: (
    <>
      <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5.5A2.5 2.5 0 0 1 3 16.5z" />
      <path d="M3 8.5V7a2 2 0 0 1 2-2h10" />
      <circle cx="16.5" cy="12.5" r="1.1" />
    </>
  ),
  store: (
    <>
      <path d="M4 9.5V19a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9.5" />
      <path d="M3.2 9.5 5 5h14l1.8 4.5a2.6 2.6 0 0 1-4.6 2 2.6 2.6 0 0 1-4.2 0 2.6 2.6 0 0 1-4.2 0 2.6 2.6 0 0 1-4.6-2Z" />
      <path d="M9.5 20v-5h5v5" />
    </>
  ),
  chart: (
    <>
      <path d="M4 4v15a1 1 0 0 0 1 1h15" />
      <path d="M8 15.5v-3M12 15.5v-7M16 15.5v-5" strokeLinecap="round" />
    </>
  ),
  file: (
    <>
      <path d="M14 3.5H7.5a1.5 1.5 0 0 0-1.5 1.5v14a1.5 1.5 0 0 0 1.5 1.5h9a1.5 1.5 0 0 0 1.5-1.5V7.5z" />
      <path d="M14 3.5v4h4" />
      <path d="M9.5 13h5M9.5 16.5h3" strokeLinecap="round" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />,
  close: <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" strokeLinecap="round" />
    </>
  ),
  moon: <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.2 8.2 0 1 0 10.2 10.2Z" />,
  logout: (
    <>
      <path d="M9 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3" />
      <path d="M15.5 15.5 19 12l-3.5-3.5M19 12H9.5" strokeLinecap="round" />
    </>
  ),
}

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      {PATHS[name]}
    </svg>
  )
}
```

- [ ] **Step 2: `lib/auth/actions.ts` 작성**

```ts
'use server'

import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'

/**
 * 세션을 파기하고 로그인 화면으로 보낸다.
 *
 * 사이드바 하단의 <form action={signOut}>에서 호출한다. 서버 액션이므로
 * 클라이언트 컴포넌트가 직접 import해도 함수 본문이 번들에 들어가지 않는다.
 */
export async function signOut(): Promise<void> {
  const supabase = await createServerSupabase()
  await supabase.auth.signOut()
  redirect('/login')
}
```

- [ ] **Step 3: `components/shell/ThemeToggle.tsx` 작성**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { buttonClass } from '@/lib/ui/button-class'
import { Icon } from './icons'

type Theme = 'light' | 'dark'

/**
 * 실제 테마 값은 app/layout.tsx의 인라인 스크립트가 하이드레이션 전에 이미
 * <html data-theme>에 박아 놓았다. 여기서는 그 값을 읽어와 표시만 맞춘다.
 * 첫 렌더에서 'light'로 시작하는 이유: 서버 HTML과 어긋나지 않게 하기 위함이고,
 * 마운트 직후 useEffect가 실제 값으로 교정한다.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const current = document.documentElement.dataset.theme
    setTheme(current === 'dark' ? 'dark' : 'light')
  }, [])

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('theme', next)
    } catch {
      // 사파리 프라이빗 모드 등 localStorage가 막힌 환경. 이번 세션에만 적용된다.
    }
    setTheme(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
      title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
      className={buttonClass('ghost', 'icon')}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </button>
  )
}
```

- [ ] **Step 4: 타입 검사와 lint 통과 확인**

```bash
npx tsc --noEmit
npm run lint
```

기대: 둘 다 통과.

- [ ] **Step 5: 커밋**

```bash
git add components/shell lib/auth/actions.ts
git commit -m "feat: add shell icon set, theme toggle, and sign-out action"
```

---

### Task 7: 사이드바 셸 — 상단 네브바 제거

이 태스크가 눈에 보이는 첫 변화다. 완료 시점에 상단 네브바가 사라지고 좌측 사이드바가 뜬다.

**Files:**
- Create: `components/shell/Sidebar.tsx`
- Create: `components/shell/MobileTopBar.tsx`
- Create: `components/shell/AppShell.tsx`
- Modify: `app/(dashboard)/layout.tsx` (전체 교체)

**Interfaces:**
- Consumes: `buildNavItems`, `isNavItemActive`, `findNavLabel`, `NavGroup` from `@/lib/nav/items`; `Icon` from `./icons`; `ThemeToggle` from `./ThemeToggle`; `signOut` from `@/lib/auth/actions`; `buttonClass` from `@/lib/ui/button-class`; `Badge` from `@/components/ui/Badge`; `requireUser` from `@/lib/auth/current-user`
- Produces:
  - `interface ShellUser { email: string; role: string }`
  - `<AppShell nav={NavGroup[]} user={ShellUser}>{children}</AppShell>`

- [ ] **Step 1: `components/shell/Sidebar.tsx` 작성**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { isNavItemActive, type NavGroup } from '@/lib/nav/items'
import { signOut } from '@/lib/auth/actions'
import { buttonClass } from '@/lib/ui/button-class'
import { Badge } from '@/components/ui/Badge'
import { Icon } from './icons'
import { ThemeToggle } from './ThemeToggle'

export interface ShellUser {
  email: string
  role: string
}

export function Sidebar({
  nav,
  user,
  open,
  onClose,
}: {
  nav: NavGroup[]
  user: ShellUser
  open: boolean
  onClose: () => void
}) {
  const pathname = usePathname()

  return (
    <aside
      className={[
        'fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-border bg-surface-2',
        'transition-transform duration-200 ease-out md:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}
    >
      <div className="flex h-14 items-center justify-between gap-2 px-4">
        <Link href="/employees" className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex h-6 w-6 items-center justify-center rounded bg-accent text-[12px] font-bold text-accent-fg"
          >
            E
          </span>
          <span className="text-[15px] font-semibold text-fg">회사 ERP</span>
        </Link>
        <button
          type="button"
          onClick={onClose}
          aria-label="메뉴 닫기"
          className={buttonClass('ghost', 'icon', 'md:hidden')}
        >
          <Icon name="close" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-2">
        {nav.map((group) => (
          <div key={group.label} className="mb-4 last:mb-0">
            <p className="px-2 pb-1.5 text-[11px] font-medium tracking-wider text-fg-subtle">
              {group.label}
            </p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = isNavItemActive(pathname, item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={[
                        'relative flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13.5px] transition-colors',
                        active
                          ? 'bg-surface-3 font-medium text-fg'
                          : 'text-fg-muted hover:bg-surface-3/60 hover:text-fg',
                      ].join(' ')}
                    >
                      {active && (
                        <span
                          aria-hidden
                          className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent"
                        />
                      )}
                      <Icon name={item.icon} />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-border px-3 py-3">
        <div className="mb-2 flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[12px] font-semibold text-fg-muted"
          >
            {user.email.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 truncate text-[12px] text-fg-muted" title={user.email}>
            {user.email}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Badge tone="neutral">{user.role}</Badge>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <form action={signOut}>
              <button
                type="submit"
                aria-label="로그아웃"
                title="로그아웃"
                className={buttonClass('ghost', 'icon')}
              >
                <Icon name="logout" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: `components/shell/MobileTopBar.tsx` 작성**

```tsx
'use client'

import { usePathname } from 'next/navigation'
import { findNavLabel, type NavGroup } from '@/lib/nav/items'
import { buttonClass } from '@/lib/ui/button-class'
import { Icon } from './icons'

export function MobileTopBar({ nav, onOpen }: { nav: NavGroup[]; onOpen: () => void }) {
  const pathname = usePathname()
  const title = findNavLabel(nav, pathname) ?? '회사 ERP'

  return (
    <div className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-surface px-3 md:hidden">
      <button type="button" onClick={onOpen} aria-label="메뉴 열기" className={buttonClass('ghost', 'icon')}>
        <Icon name="menu" size={18} />
      </button>
      <span className="text-[15px] font-semibold text-fg">{title}</span>
    </div>
  )
}
```

- [ ] **Step 3: `components/shell/AppShell.tsx` 작성**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import type { NavGroup } from '@/lib/nav/items'
import { Sidebar, type ShellUser } from './Sidebar'
import { MobileTopBar } from './MobileTopBar'

export type { ShellUser }

export function AppShell({
  nav,
  user,
  children,
}: {
  nav: NavGroup[]
  user: ShellUser
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // 라우트가 바뀌면 드로어를 닫는다. 안 그러면 메뉴를 누른 뒤에도 덮여 있다.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <div className="min-h-full">
      <MobileTopBar nav={nav} onOpen={() => setOpen(true)} />

      {open && (
        <div
          aria-hidden
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}

      <Sidebar nav={nav} user={user} open={open} onClose={() => setOpen(false)} />

      <main className="md:pl-[260px]">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-5 md:px-8 md:py-7">{children}</div>
      </main>
    </div>
  )
}
```

- [ ] **Step 4: `app/(dashboard)/layout.tsx` 전체 교체**

기존 `<header>` 네브바가 전부 사라진다.

```tsx
import { requireUser } from '@/lib/auth/current-user'
import { buildNavItems } from '@/lib/nav/items'
import { AppShell } from '@/components/shell/AppShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()

  // 권한 필터링은 서버에서 끝낸다. 클라이언트 셸은 결과만 받는다.
  const nav = buildNavItems(user.role)

  return (
    <AppShell nav={nav} user={{ email: user.email, role: user.role }}>
      {children}
    </AppShell>
  )
}
```

- [ ] **Step 5: 빌드와 lint 통과 확인**

```bash
npx tsc --noEmit
npm run lint
npm run build
```

기대: 전부 통과.

`signOut`을 클라이언트 컴포넌트에서 import하는 것이 이 Next.js 버전에서 문제가 되면 (Task 1 Step 4에서 읽은 문서 확인), `AppShell`에 `signOut` 함수를 props로 내려 `Sidebar`까지 전달하는 방식으로 바꾼다. 서버 액션은 직렬화 가능한 참조이므로 props 전달이 허용된다.

- [ ] **Step 6: 육안 확인**

```bash
npm run dev
```

로그인 후 확인:
- 상단 네브바가 없다. 좌측에 260px 사이드바가 있다.
- 그룹 라벨 "인사", "정산"이 보이고 각 메뉴에 아이콘이 붙어 있다.
- 현재 페이지 메뉴에 배경과 좌측 액센트 바가 있다. `/employees/<id>` 같은 하위 경로에서도 "사원 관리"가 활성 상태다.
- 하단에 이메일 + 역할 배지 + 테마 토글 + 로그아웃 아이콘이 있다.
- 테마 토글을 누르면 사이드바·배경·텍스트가 전부 다크로 바뀐다. 새로고침해도 유지된다.
- 로그아웃을 누르면 `/login`으로 이동하고, 뒤로 가기로 `/employees`에 접근하면 다시 `/login`으로 튕긴다.
- 브라우저 폭을 768px 미만으로 줄이면 사이드바가 사라지고 상단에 햄버거 바가 뜬다. 햄버거를 누르면 드로어가 슬라이드인하고, 백드롭 클릭 / `Escape` / 메뉴 항목 클릭 셋 다 닫힌다.

- [ ] **Step 7: 커밋**

```bash
git add components/shell "app/(dashboard)/layout.tsx" AGENTS.md
git commit -m "feat: replace top navbar with sidebar shell and mobile drawer"
```

---

### Task 8: 로그인 화면

**Files:**
- Modify: `app/login/page.tsx` (전체 교체)
- Modify: `app/login/LoginForm.tsx` (전체 교체)

**Interfaces:**
- Consumes: `Alert` from `@/components/ui/Alert`; `buttonClass` from `@/lib/ui/button-class`
- Produces: 없음

- [ ] **Step 1: `app/login/page.tsx` 교체**

```tsx
import { Suspense } from 'react'
import { LoginForm } from './LoginForm'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface px-7 py-8">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span
            aria-hidden
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-[15px] font-bold text-accent-fg"
          >
            E
          </span>
          <div>
            <h1 className="text-[20px] font-semibold text-fg">회사 ERP</h1>
            <p className="mt-1 text-[13.5px] text-fg-muted">
              사원정보 · 증빙 · 급여대장을 관리합니다
            </p>
          </div>
        </div>
        {/* useSearchParams() needs a Suspense boundary so the rest of this prerendered
            route can still be served as static HTML. */}
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
        <p className="mt-6 text-center text-[12px] text-fg-subtle">
          초대받은 계정만 로그인할 수 있습니다
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `app/login/LoginForm.tsx` 교체**

`ERROR_MESSAGES` 상수와 `signIn` 핸들러, 그리고 브라우저 클라이언트를 핸들러 안에서 만드는 주석은 **그대로 유지한다.** 빌드가 깨지는 이유가 거기 적혀 있다.

```tsx
'use client'

import { useSearchParams } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { Alert } from '@/components/ui/Alert'
import { buttonClass } from '@/lib/ui/button-class'

const ERROR_MESSAGES: Record<string, string> = {
  not_invited: '초대받지 않은 계정입니다. 관리자에게 문의해주세요.',
  auth_failed: '로그인에 실패했습니다. 다시 시도해주세요.',
}

export function LoginForm() {
  const searchParams = useSearchParams()
  const errorCode = searchParams.get('error')
  const errorMessage = errorCode ? ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.auth_failed : null

  const signIn = async () => {
    // Created inside the handler, not at render time: /login is prerendered at build,
    // and constructing the browser client with empty NEXT_PUBLIC_SUPABASE_* env vars
    // throws, which would fail `next build` on any preview/CI build without real vars.
    const supabase = createBrowserSupabase()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {errorMessage && <Alert variant="error">{errorMessage}</Alert>}
      <button onClick={signIn} className={buttonClass('secondary', 'md', 'w-full')}>
        <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden>
          <path
            fill="#4285F4"
            d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z"
          />
          <path
            fill="#34A853"
            d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18Z"
          />
          <path
            fill="#FBBC05"
            d="M3.96 10.71a5.4 5.4 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l3-2.33Z"
          />
          <path
            fill="#EA4335"
            d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58Z"
          />
        </svg>
        Google로 로그인
      </button>
    </div>
  )
}
```

- [ ] **Step 3: 빌드와 육안 확인**

```bash
npm run build
npm run dev
```

`/login`을 연다. 확인 사항:
- 가운데 카드 하나. 배경은 `--bg`, 카드는 `--surface`.
- 다크 모드에서도 카드와 배경이 구분되고 Google 로고 색이 유지된다.
- `/login?error=not_invited`로 접속하면 빨간 `Alert`가 뜨고 `role="alert"`가 붙어 있다.

- [ ] **Step 4: 커밋**

```bash
git add app/login
git commit -m "feat: restyle the login screen as a centered card"
```

---

### Task 9: 사원 목록 · 상세

**Files:**
- Modify: `app/(dashboard)/employees/page.tsx` (전체 교체)
- Modify: `app/(dashboard)/employees/[id]/page.tsx` (전체 교체)

**Interfaces:**
- Consumes: `PageHeader`, `Badge`, `Table`/`THead`/`TBody`/`TR`/`TH`/`TD`/`TableEmpty`, `Card`/`CardBody`, `DescriptionList`, `buttonClass`
- Produces: 없음

- [ ] **Step 1: `app/(dashboard)/employees/page.tsx` 교체**

Supabase 쿼리와 `departments` 캐스팅은 **한 글자도 바꾸지 않는다.**

```tsx
import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/components/ui/Table'
import { buttonClass } from '@/lib/ui/button-class'

export default async function EmployeesPage() {
  const user = await requireUser()
  const canManage = permissions.canManageEmployees(user.role)

  const supabase = await createServerSupabase()

  const { data: employees } = await supabase
    .from('employees')
    .select('id, employee_number, name, employment_type, status, department_id, departments(name)')
    .order('employee_number')

  return (
    <div>
      <PageHeader
        title="사원 관리"
        description={`총 ${employees?.length ?? 0}명`}
        actions={
          canManage && (
            <>
              <Link href="/employees/bulk-upload" className={buttonClass('secondary')}>
                엑셀 일괄 등록
              </Link>
              <Link href="/employees/new" className={buttonClass('primary')}>
                + 사원 등록
              </Link>
            </>
          )
        }
      />
      <Table>
        <THead>
          <TR>
            <TH>사번</TH>
            <TH>이름</TH>
            <TH>부서</TH>
            <TH>근로형태</TH>
            <TH>재직상태</TH>
          </TR>
        </THead>
        <TBody>
          {employees?.length ? (
            employees.map((emp) => (
              <TR key={emp.id}>
                <TD className="tnum">
                  <Link href={`/employees/${emp.id}`} className="font-medium text-accent hover:underline">
                    {emp.employee_number}
                  </Link>
                </TD>
                <TD>{emp.name}</TD>
                <TD>{(emp.departments as unknown as { name: string } | null)?.name ?? '-'}</TD>
                <TD>{emp.employment_type}</TD>
                <TD>
                  <Badge status={emp.status}>{emp.status}</Badge>
                </TD>
              </TR>
            ))
          ) : (
            <TableEmpty
              colSpan={5}
              title="등록된 사원이 없습니다"
              description={canManage ? '사원 등록 또는 엑셀 일괄 등록으로 시작하세요.' : undefined}
            />
          )}
        </TBody>
      </Table>
    </div>
  )
}
```

- [ ] **Step 2: `app/(dashboard)/employees/[id]/page.tsx` 교체**

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { DescriptionList } from '@/components/ui/DescriptionList'
import { buttonClass } from '@/lib/ui/button-class'

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()
  const supabase = await createServerSupabase()
  const { data: employee } = await supabase.from('employees').select('*').eq('id', id).single()

  if (!employee) notFound()

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={employee.name}
        description={`사번 ${employee.employee_number}`}
        actions={
          <>
            <Badge status={employee.status}>{employee.status}</Badge>
            {permissions.canManageEmployees(user.role) && (
              <Link href={`/employees/${id}/edit`} className={buttonClass('secondary', 'sm')}>
                수정
              </Link>
            )}
          </>
        }
      />

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>근로 정보</CardTitle>
          </CardHeader>
          <CardBody padding="tight">
            <DescriptionList
              items={[
                { label: '직급', value: employee.position ?? '-' },
                { label: '근로형태', value: employee.employment_type },
                { label: '입사일', value: employee.hire_date },
                { label: '재직상태', value: <Badge status={employee.status}>{employee.status}</Badge> },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>연락처</CardTitle>
          </CardHeader>
          <CardBody padding="tight">
            <DescriptionList
              items={[
                { label: '연락처', value: employee.phone ?? '-' },
                { label: '비상연락망', value: employee.emergency_contact ?? '-' },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>일정</CardTitle>
          </CardHeader>
          <CardBody padding="tight">
            <DescriptionList
              items={[
                { label: '정규직전환 평가일', value: employee.contract_review_date ?? '-' },
                { label: '정규직전환 발표일', value: employee.contract_announce_date ?? '-' },
                { label: '연봉협상 평가일', value: employee.salary_review_date ?? '-' },
                { label: '연봉협상 발표일', value: employee.salary_announce_date ?? '-' },
              ]}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 빌드와 육안 확인**

```bash
npx tsc --noEmit
npm run build
npm run dev
```

`/employees`와 `/employees/<id>`를 연다. 확인:
- 사번 컬럼이 고정폭 숫자로 정렬되어 있다.
- 재직상태가 배지로 뜨고, 재직=초록, 휴직=주황, 퇴사=빨강이다.
- 사원이 0명이면 `EmptyState`가 표 안에 뜬다.
- 상세 화면이 카드 3장으로 나뉘고 라벨/값이 2열로 배치된다.

- [ ] **Step 4: 커밋**

```bash
git add "app/(dashboard)/employees/page.tsx" "app/(dashboard)/employees/[id]/page.tsx"
git commit -m "feat: restyle employee list and detail pages"
```

---

### Task 10: 사원 폼 3종 — 등록 · 수정 · 일괄 등록

세로 1열로 늘어선 입력들을 카드 3장 + 2열 그리드로 재배치하고, `placeholder`로만 존재하던 이름표를 실제 `<label>`로 승격한다.

**Files:**
- Modify: `app/(dashboard)/employees/new/NewEmployeeForm.tsx` (전체 교체)
- Modify: `app/(dashboard)/employees/[id]/EditEmployeeForm.tsx` (전체 교체)
- Modify: `app/(dashboard)/employees/bulk-upload/BulkUploadForm.tsx` (전체 교체)

**Interfaces:**
- Consumes: `PageHeader`, `Card`/`CardHeader`/`CardTitle`/`CardBody`, `Field`/`Input`/`Select`/`FileInput`, `Alert`, `Button`, `buttonClass`
- Produces: `DepartmentOption`은 `NewEmployeeForm.tsx`에서 계속 export한다 (`EditEmployeeForm.tsx`와 `new/page.tsx`가 import 중)

- [ ] **Step 1: `NewEmployeeForm.tsx` 교체**

`handleSubmit`의 `input` 객체와 `createEmployee` 호출은 **필드 이름·순서까지 그대로 유지한다.** 서버 액션 검증이 이 키들에 의존한다.

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createEmployee } from '../actions'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Field, Input, Select } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'

export interface DepartmentOption {
  id: string
  name: string
}

export function NewEmployeeForm({ departments }: { departments: DepartmentOption[] }) {
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
      contract_announce_date: String(formData.get('contract_announce_date') ?? ''),
      salary_review_date: String(formData.get('salary_review_date') ?? ''),
      salary_announce_date: String(formData.get('salary_announce_date') ?? ''),
    }

    const result = await createEmployee(input)
    if (result.error) {
      setError(result.error)
      return
    }
    router.push('/employees')
  }

  return (
    <form action={handleSubmit} className="max-w-3xl">
      <PageHeader title="사원 등록" />

      <div className="flex flex-col gap-4">
        {error && <Alert variant="error">{error}</Alert>}

        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="사번" htmlFor="employee_number">
              <Input id="employee_number" name="employee_number" required />
            </Field>
            <Field label="이름" htmlFor="name">
              <Input id="name" name="name" required />
            </Field>
            <Field label="생년월일" htmlFor="birth_date">
              <Input id="birth_date" type="date" name="birth_date" />
            </Field>
            <Field label="연락처" htmlFor="phone">
              <Input id="phone" name="phone" />
            </Field>
            <Field label="비상연락망" htmlFor="emergency_contact" className="sm:col-span-2">
              <Input id="emergency_contact" name="emergency_contact" />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>근로 정보</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="부서" htmlFor="department_id">
              <Select id="department_id" name="department_id" defaultValue="">
                <option value="">부서 미지정</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="직급" htmlFor="position">
              <Input id="position" name="position" />
            </Field>
            <Field label="근로형태" htmlFor="employment_type">
              <Select id="employment_type" name="employment_type" required>
                <option value="정규직">정규직</option>
                <option value="계약직">계약직</option>
                <option value="인턴">인턴</option>
                <option value="프리랜서">프리랜서</option>
              </Select>
            </Field>
            <Field label="입사일" htmlFor="hire_date">
              <Input id="hire_date" type="date" name="hire_date" required />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>일정</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <p className="text-[12px] text-fg-subtle sm:col-span-2">
              정규직전환 평가일은 입사일 기준 3개월 후로 자동 계산됩니다 (등록 후 필요시 수정 가능).
            </p>
            <Field label="정규직전환 발표일" htmlFor="contract_announce_date">
              <Input id="contract_announce_date" type="date" name="contract_announce_date" />
            </Field>
            <Field label="연봉협상 평가일" htmlFor="salary_review_date">
              <Input id="salary_review_date" type="date" name="salary_review_date" />
            </Field>
            <Field label="연봉협상 발표일" htmlFor="salary_announce_date">
              <Input id="salary_announce_date" type="date" name="salary_announce_date" />
            </Field>
          </CardBody>
        </Card>

        <div className="flex justify-end">
          <Button type="submit">저장</Button>
        </div>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: `EditEmployeeForm.tsx` 교체**

등록 폼과 같은 구조에 `defaultValue`를 채우고, 등록 폼에는 없는 `contract_review_date` 필드가 하나 더 있다. `input` 객체는 그대로 유지한다.

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateEmployee } from '../actions'
import type { Employee } from '@/lib/types'
import type { DepartmentOption } from '../new/NewEmployeeForm'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Field, Input, Select } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'

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
    <form action={handleSubmit} className="max-w-3xl">
      <PageHeader title="사원 정보 수정" description={`${employee.name} · ${employee.employee_number}`} />

      <div className="flex flex-col gap-4">
        {error && <Alert variant="error">{error}</Alert>}

        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="사번" htmlFor="employee_number">
              <Input id="employee_number" name="employee_number" defaultValue={employee.employee_number} required />
            </Field>
            <Field label="이름" htmlFor="name">
              <Input id="name" name="name" defaultValue={employee.name} required />
            </Field>
            <Field label="생년월일" htmlFor="birth_date">
              <Input id="birth_date" type="date" name="birth_date" defaultValue={employee.birth_date ?? ''} />
            </Field>
            <Field label="연락처" htmlFor="phone">
              <Input id="phone" name="phone" defaultValue={employee.phone ?? ''} />
            </Field>
            <Field label="비상연락망" htmlFor="emergency_contact" className="sm:col-span-2">
              <Input
                id="emergency_contact"
                name="emergency_contact"
                defaultValue={employee.emergency_contact ?? ''}
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>근로 정보</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="부서" htmlFor="department_id">
              <Select id="department_id" name="department_id" defaultValue={employee.department_id ?? ''}>
                <option value="">부서 미지정</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="직급" htmlFor="position">
              <Input id="position" name="position" defaultValue={employee.position ?? ''} />
            </Field>
            <Field label="근로형태" htmlFor="employment_type">
              <Select id="employment_type" name="employment_type" defaultValue={employee.employment_type} required>
                <option value="정규직">정규직</option>
                <option value="계약직">계약직</option>
                <option value="인턴">인턴</option>
                <option value="프리랜서">프리랜서</option>
              </Select>
            </Field>
            <Field label="입사일" htmlFor="hire_date">
              <Input id="hire_date" type="date" name="hire_date" defaultValue={employee.hire_date} required />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>일정</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="정규직전환 평가일"
              htmlFor="contract_review_date"
              hint="입사일 기준으로 자동 계산됩니다. 필요시 수정하세요."
              className="sm:col-span-2"
            >
              <Input
                id="contract_review_date"
                type="date"
                name="contract_review_date"
                defaultValue={employee.contract_review_date ?? ''}
              />
            </Field>
            <Field label="정규직전환 발표일" htmlFor="contract_announce_date">
              <Input
                id="contract_announce_date"
                type="date"
                name="contract_announce_date"
                defaultValue={employee.contract_announce_date ?? ''}
              />
            </Field>
            <Field label="연봉협상 평가일" htmlFor="salary_review_date">
              <Input
                id="salary_review_date"
                type="date"
                name="salary_review_date"
                defaultValue={employee.salary_review_date ?? ''}
              />
            </Field>
            <Field label="연봉협상 발표일" htmlFor="salary_announce_date">
              <Input
                id="salary_announce_date"
                type="date"
                name="salary_announce_date"
                defaultValue={employee.salary_announce_date ?? ''}
              />
            </Field>
          </CardBody>
        </Card>

        <div className="flex justify-end">
          <Button type="submit">저장</Button>
        </div>
      </div>
    </form>
  )
}
```

- [ ] **Step 3: `BulkUploadForm.tsx` 교체**

`handleUpload`의 fetch 경로와 `result` 형태는 그대로 유지한다.

```tsx
'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Field, FileInput } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { buttonClass } from '@/lib/ui/button-class'

export function BulkUploadForm() {
  const [result, setResult] = useState<{ inserted: number; errors: { row: number; message: string }[] } | null>(null)

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const response = await fetch('/api/employees/bulk-upload', { method: 'POST', body: formData })
    setResult(await response.json())
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="사원 엑셀 일괄 등록"
        description="현재 사원 목록을 내려받아 같은 양식으로 채운 뒤 업로드하세요."
        actions={
          <a href="/api/employees/export" className={buttonClass('secondary', 'sm')}>
            현재 사원 목록 다운로드
          </a>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>파일 업로드</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleUpload} className="flex flex-col gap-4">
            <Field label="엑셀 파일" htmlFor="file" hint=".xlsx 또는 .xls">
              <FileInput id="file" name="file" accept=".xlsx,.xls" required />
            </Field>
            <div className="flex justify-end">
              <Button type="submit">업로드</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {result && (
        <div className="mt-4 flex flex-col gap-3">
          <Alert variant={result.errors.length > 0 ? 'info' : 'success'}>
            {result.inserted}건 등록 완료
          </Alert>
          {result.errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>실패한 행 {result.errors.length}건</CardTitle>
              </CardHeader>
              <CardBody padding="tight">
                <ul className="flex flex-col divide-y divide-border">
                  {result.errors.map((e, i) => (
                    <li key={i} className="flex gap-3 py-2 text-[13.5px]">
                      <span className="shrink-0 font-medium tnum text-fg-subtle">{e.row}행</span>
                      <span className="text-negative">{e.message}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: 빌드와 육안 확인**

```bash
npx tsc --noEmit
npm run lint
npm run build
npm run dev
```

`/employees/new`, `/employees/<id>/edit`, `/employees/bulk-upload`를 연다. 확인:
- 모든 입력에 실제 `<label>`이 붙어 있고, 라벨을 클릭하면 해당 입력에 포커스가 간다.
- 포커스 시 액센트 링이 보인다.
- 사원을 실제로 등록해 보고 저장 후 `/employees`로 이동하는지 확인한다.
- 사번을 중복으로 넣어 서버 오류를 유발하고 `Alert`가 뜨는지 확인한다.

- [ ] **Step 5: 커밋**

```bash
git add "app/(dashboard)/employees"
git commit -m "feat: restructure employee forms into labelled card sections"
```

---

### Task 11: 가맹점 관리

**Files:**
- Modify: `app/(dashboard)/franchise-stores/page.tsx` (전체 교체)
- Modify: `app/(dashboard)/franchise-stores/CreateFranchiseStoreForm.tsx` (전체 교체)
- Modify: `app/(dashboard)/franchise-stores/StatusToggleButton.tsx` (전체 교체)

**Interfaces:**
- Consumes: `PageHeader`, `Card`/`CardBody`, `Table` 계열, `Badge`, `Field`/`Input`, `Alert`, `Button`
- Produces: 없음

- [ ] **Step 1: `page.tsx` 교체**

```tsx
import { requireUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'
import { createServerSupabase } from '@/lib/supabase/server'
import { CreateFranchiseStoreForm } from './CreateFranchiseStoreForm'
import { StatusToggleButton } from './StatusToggleButton'
import type { FranchiseStore } from '@/lib/types'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/components/ui/Table'

export default async function FranchiseStoresPage() {
  const user = await requireUser()
  const canManage = permissions.canManageFranchiseStores(user.role)

  const supabase = await createServerSupabase()
  const { data: stores } = await supabase
    .from('franchise_stores')
    .select('*')
    .order('name')

  const rows = stores as FranchiseStore[] | null

  return (
    <div className="max-w-3xl">
      <PageHeader title="가맹점 관리" description={`총 ${rows?.length ?? 0}곳`} />
      {canManage && <CreateFranchiseStoreForm />}
      <Table>
        <THead>
          <TR>
            <TH>가맹점명</TH>
            <TH>상태</TH>
            {canManage && <TH align="right">관리</TH>}
          </TR>
        </THead>
        <TBody>
          {rows?.length ? (
            rows.map((store) => (
              <TR key={store.id}>
                <TD>{store.name}</TD>
                <TD>
                  <Badge status={store.status}>{store.status}</Badge>
                </TD>
                {canManage && (
                  <TD align="right">
                    <StatusToggleButton id={store.id} status={store.status} />
                  </TD>
                )}
              </TR>
            ))
          ) : (
            <TableEmpty
              colSpan={canManage ? 3 : 2}
              title="등록된 가맹점이 없습니다"
              description={canManage ? '위 입력창에서 가맹점을 추가하세요.' : undefined}
            />
          )}
        </TBody>
      </Table>
    </div>
  )
}
```

- [ ] **Step 2: `CreateFranchiseStoreForm.tsx` 교체**

`handleSubmit`과 `createFranchiseStore` 호출은 그대로 유지한다.

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createFranchiseStore } from './actions'
import { Card, CardBody } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'

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
    <Card className="mb-4">
      <CardBody padding="snug">
        <form action={handleSubmit} className="flex flex-wrap items-end gap-3">
          <Field label="가맹점명" htmlFor="name" className="min-w-[220px] flex-1">
            <Input id="name" name="name" required />
          </Field>
          <Button type="submit">추가</Button>
        </form>
        {error && (
          <Alert variant="error" className="mt-3">
            {error}
          </Alert>
        )}
      </CardBody>
    </Card>
  )
}
```

- [ ] **Step 3: `StatusToggleButton.tsx` 교체**

`toggleFranchiseStoreStatus` 호출과 상태 처리는 그대로 유지한다.

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toggleFranchiseStoreStatus } from './actions'
import { Button } from '@/components/ui/Button'

export function StatusToggleButton({ id, status }: { id: string; status: '운영중' | '폐업' }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    const result = await toggleFranchiseStoreStatus(id, status)
    if (result.error) {
      setError(result.error)
      return
    }
    setError(null)
    router.refresh()
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {error && <span className="text-[12px] text-negative">{error}</span>}
      <Button type="button" variant="secondary" size="sm" onClick={handleClick}>
        {status === '운영중' ? '폐업 처리' : '운영 재개'}
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: 빌드와 육안 확인**

```bash
npx tsc --noEmit
npm run build
npm run dev
```

`/franchise-stores`를 연다. 확인:
- 추가 폼이 카드 안 인라인 바로 뜬다.
- 운영중=초록 배지, 폐업=빨강 배지.
- 상태 토글이 동작하고 표가 갱신된다.

- [ ] **Step 5: 커밋**

```bash
git add "app/(dashboard)/franchise-stores"
git commit -m "feat: restyle franchise store management"
```

---

### Task 12: 급여대장 목록 · 업로드

목록이 지금은 파란 링크만 나열된 `<ul>`이다. 표로 교체한다.

**Files:**
- Modify: `app/(dashboard)/payroll/page.tsx` (전체 교체)
- Modify: `app/(dashboard)/payroll/[employeeId]/upload/page.tsx` (전체 교체)

**Interfaces:**
- Consumes: `PageHeader`, `Table` 계열, `Card`, `Field`/`Input`/`FileInput`, `Badge`, `buttonClass`, `Button`
- Produces: 없음

- [ ] **Step 1: `payroll/page.tsx` 교체**

```tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'
import { PageHeader } from '@/components/ui/PageHeader'
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/components/ui/Table'
import { buttonClass } from '@/lib/ui/button-class'

export default async function PayrollPage() {
  const user = await requireUser()

  if (!permissions.canViewPayroll(user.role)) {
    redirect('/employees')
  }

  const supabase = await createServerSupabase()
  const { data: employees } = await supabase.from('employees').select('id, employee_number, name').order('employee_number')

  return (
    <div className="max-w-3xl">
      <PageHeader title="급여대장 조회" description="사원을 선택해 급여대장을 올리거나 확인하세요." />
      <Table>
        <THead>
          <TR>
            <TH>사번</TH>
            <TH>이름</TH>
            <TH align="right">급여대장</TH>
          </TR>
        </THead>
        <TBody>
          {employees?.length ? (
            employees.map((emp) => (
              <TR key={emp.id}>
                <TD className="tnum">{emp.employee_number}</TD>
                <TD>{emp.name}</TD>
                <TD align="right">
                  <Link href={`/payroll/${emp.id}/upload`} className={buttonClass('secondary', 'sm')}>
                    열기
                  </Link>
                </TD>
              </TR>
            ))
          ) : (
            <TableEmpty colSpan={3} title="등록된 사원이 없습니다" />
          )}
        </TBody>
      </Table>
    </div>
  )
}
```

- [ ] **Step 2: `payroll/[employeeId]/upload/page.tsx` 교체**

`<form action="/api/payroll/upload" method="post">`의 속성과 hidden 필드는 그대로 유지한다. 이 폼은 서버 액션이 아니라 라우트 핸들러로 직접 제출된다.

```tsx
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Field, Input, FileInput } from '@/components/ui/Field'
import { Badge } from '@/components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/components/ui/Table'
import { buttonClass } from '@/lib/ui/button-class'

export default async function PayrollUploadPage({ params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params
  const user = await requireUser()

  if (!permissions.canViewPayroll(user.role)) {
    redirect('/employees')
  }

  const supabase = await createServerSupabase()
  const { data: records } = await supabase
    .from('payroll_records')
    .select('*')
    .eq('employee_id', employeeId)
    .order('period', { ascending: false })

  return (
    <div className="max-w-3xl">
      <PageHeader title="급여대장 업로드" />

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>새 급여대장</CardTitle>
          </CardHeader>
          <CardBody>
            <form
              action={`/api/payroll/upload`}
              method="post"
              encType="multipart/form-data"
              className="flex flex-col gap-4"
            >
              <input type="hidden" name="employee_id" value={employeeId} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="귀속 월" htmlFor="period">
                  <Input id="period" type="month" name="period" required />
                </Field>
                <Field label="파일" htmlFor="file" hint=".xlsx, .xls, .pdf">
                  <FileInput id="file" name="file" accept=".xlsx,.xls,.pdf" required />
                </Field>
              </div>
              <div className="flex justify-end">
                <button type="submit" className={buttonClass('primary')}>
                  업로드
                </button>
              </div>
            </form>
          </CardBody>
        </Card>

        <Table>
          <THead>
            <TR>
              <TH>기간</TH>
              <TH>파일</TH>
              <TH align="right">상태</TH>
            </TR>
          </THead>
          <TBody>
            {records?.length ? (
              records.map((r) => (
                <TR key={r.id}>
                  <TD className="tnum">{r.period}</TD>
                  <TD className="max-w-[320px] truncate">{r.file_name}</TD>
                  <TD align="right">
                    <Badge tone={r.parse_status === 'parsed' ? 'positive' : 'neutral'}>
                      {r.parse_status === 'parsed' ? '파싱됨' : '원본 보관'}
                    </Badge>
                  </TD>
                </TR>
              ))
            ) : (
              <TableEmpty colSpan={3} title="업로드된 급여대장이 없습니다" />
            )}
          </TBody>
        </Table>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 빌드와 육안 확인**

```bash
npx tsc --noEmit
npm run build
npm run dev
```

`/payroll`과 `/payroll/<id>/upload`를 연다. 확인:
- 급여대장 목록이 표로 뜨고 사번이 고정폭이다.
- 업로드 폼이 카드 안에 2열로 배치된다.
- 파싱 상태가 배지로 뜬다.

- [ ] **Step 4: 커밋**

```bash
git add "app/(dashboard)/payroll"
git commit -m "feat: restyle payroll list and upload pages"
```

---

### Task 13: 증빙 관리 — 목록 · 업로드 · 휴지통

**Files:**
- Modify: `app/(dashboard)/documents/page.tsx` (전체 교체)
- Modify: `app/(dashboard)/documents/DeleteButton.tsx` (전체 교체)
- Modify: `app/(dashboard)/documents/upload/DocumentUploadForm.tsx` (전체 교체)
- Modify: `app/(dashboard)/documents/trash/TrashList.tsx` (전체 교체)

**Interfaces:**
- Consumes: `PageHeader`, `Table` 계열, `Badge`, `Card`, `Field`/`Input`/`Select`/`FileInput`, `Alert`, `Button`, `buttonClass`
- Produces: 없음

- [ ] **Step 1: `documents/page.tsx` 교체**

쿼리와 `documentsError` 분기, 오류 문구는 그대로 유지한다.

```tsx
import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'
import { DeleteButton } from './DeleteButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Alert } from '@/components/ui/Alert'
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/components/ui/Table'
import { buttonClass } from '@/lib/ui/button-class'

export default async function DocumentsPage() {
  const user = await requireUser()
  const canUpload = permissions.canUploadDocuments(user.role)
  const canDelete = permissions.canDeleteDocuments(user.role)

  const supabase = await createServerSupabase()
  const { data: documents, error: documentsError } = await supabase
    .from('documents')
    .select('*, franchise_stores(name)')
    .is('deleted_at', null)
    .order('year', { ascending: false })
    .order('month', { ascending: false })

  if (documentsError) {
    console.error('Failed to load documents:', documentsError)
    return <Alert variant="error">증빙 데이터를 불러오지 못했습니다. 관리자에게 문의하세요.</Alert>
  }

  const colSpan = canDelete ? 8 : 7

  return (
    <div>
      <PageHeader
        title="증빙 관리"
        description={`총 ${documents?.length ?? 0}건`}
        actions={
          <>
            {canDelete && (
              <Link href="/documents/trash" className={buttonClass('secondary')}>
                휴지통
              </Link>
            )}
            {canUpload && (
              <Link href="/documents/upload" className={buttonClass('primary')}>
                + 증빙 업로드
              </Link>
            )}
          </>
        }
      />
      <Table>
        <THead>
          <TR>
            <TH>연/월</TH>
            <TH>유형</TH>
            <TH>거래처</TH>
            <TH>거래구분</TH>
            <TH align="right">금액</TH>
            <TH>가맹점</TH>
            <TH>파일</TH>
            {canDelete && <TH align="right" />}
          </TR>
        </THead>
        <TBody>
          {documents?.length ? (
            documents.map((doc) => (
              <TR key={doc.id}>
                <TD className="tnum whitespace-nowrap">
                  {doc.year}-{String(doc.month).padStart(2, '0')}
                </TD>
                <TD>{doc.doc_type}</TD>
                <TD>{doc.vendor_name ?? '-'}</TD>
                <TD>
                  <Badge status={doc.transaction_type}>{doc.transaction_type ?? '미분류'}</Badge>
                </TD>
                <TD align="right">
                  {doc.amount != null ? `${doc.amount.toLocaleString('ko-KR')}원` : '-'}
                </TD>
                <TD>{(doc.franchise_stores as unknown as { name: string } | null)?.name ?? '-'}</TD>
                <TD className="max-w-[220px] truncate" title={doc.file_name}>
                  {doc.file_name}
                </TD>
                {canDelete && (
                  <TD align="right">
                    <DeleteButton id={doc.id} />
                  </TD>
                )}
              </TR>
            ))
          ) : (
            <TableEmpty
              colSpan={colSpan}
              title="등록된 증빙이 없습니다"
              description={canUpload ? '증빙 업로드로 첫 자료를 추가하세요.' : undefined}
            />
          )}
        </TBody>
      </Table>
    </div>
  )
}
```

- [ ] **Step 2: `DeleteButton.tsx` 교체**

`fetch` + `window.location.reload()` 동작은 그대로 유지한다.

```tsx
'use client'

import { Button } from '@/components/ui/Button'

export function DeleteButton({ id }: { id: string }) {
  return (
    <Button
      type="button"
      variant="danger"
      size="sm"
      onClick={async () => {
        await fetch(`/api/documents/${id}`, { method: 'DELETE' })
        window.location.reload()
      }}
    >
      삭제
    </Button>
  )
}
```

- [ ] **Step 3: `DocumentUploadForm.tsx` 교체**

`handleUpload`의 fetch와 `e.currentTarget.reset()` 처리는 그대로 유지한다.

```tsx
'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Field, Input, Select, FileInput } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'

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
    <div className="max-w-2xl">
      <PageHeader title="증빙 업로드" />
      <form onSubmit={handleUpload} className="flex flex-col gap-4">
        {message && (
          <Alert variant={message === '업로드 완료' ? 'success' : 'error'}>{message}</Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>증빙 정보</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="증빙 유형" htmlFor="doc_type">
              <Select id="doc_type" name="doc_type" required>
                <option value="세금계산서">세금계산서</option>
                <option value="계산서">계산서</option>
                <option value="신용카드">신용카드</option>
                <option value="현금영수증">현금영수증</option>
                <option value="기타">기타</option>
              </Select>
            </Field>
            <Field label="거래 구분" htmlFor="transaction_type">
              <Select id="transaction_type" name="transaction_type" required>
                <option value="매출">매출</option>
                <option value="매입">매입</option>
              </Select>
            </Field>
            <Field label="연도" htmlFor="year">
              <Input id="year" type="number" name="year" defaultValue={now.getFullYear()} required />
            </Field>
            <Field label="월" htmlFor="month">
              <Input
                id="month"
                type="number"
                name="month"
                min={1}
                max={12}
                defaultValue={now.getMonth() + 1}
                required
              />
            </Field>
            <Field label="거래처" htmlFor="vendor_name">
              <Input id="vendor_name" name="vendor_name" />
            </Field>
            <Field label="금액" htmlFor="amount">
              <Input id="amount" type="number" name="amount" min={1} step="1" required />
            </Field>
            <Field label="가맹점" htmlFor="franchise_store_id" hint="선택 사항" className="sm:col-span-2">
              <Select id="franchise_store_id" name="franchise_store_id" defaultValue="">
                <option value="">가맹점 미지정</option>
                {franchiseStores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </Select>
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>파일</CardTitle>
          </CardHeader>
          <CardBody>
            <Field label="증빙 파일" htmlFor="file" hint=".pdf, .jpg, .jpeg, .png, .xlsx, .xls">
              <FileInput
                id="file"
                name="file"
                accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
                required
              />
            </Field>
          </CardBody>
        </Card>

        <div className="flex justify-end">
          <Button type="submit">업로드</Button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: `TrashList.tsx` 교체**

`useEffect`의 Supabase 조회와 `restore` 함수, `isPurgeable` 호출은 그대로 유지한다.

```tsx
'use client'

import { useEffect, useState } from 'react'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { isPurgeable } from '@/lib/documents/trash'
import type { DocumentRecord } from '@/lib/types'
import { PageHeader } from '@/components/ui/PageHeader'
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'

export function TrashList() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([])

  useEffect(() => {
    const supabase = createBrowserSupabase()
    supabase
      .from('documents')
      .select('*')
      .not('deleted_at', 'is', null)
      .then(({ data }) => setDocuments((data ?? []) as DocumentRecord[]))
  }, [])

  async function restore(id: string) {
    await fetch(`/api/documents/${id}/restore`, { method: 'POST' })
    setDocuments((docs) => docs.filter((d) => d.id !== id))
  }

  const now = new Date()

  return (
    <div className="max-w-3xl">
      <PageHeader title="휴지통" description="삭제 후 30일이 지나면 영구 삭제됩니다." />
      <Table>
        <THead>
          <TR>
            <TH>파일</TH>
            <TH>유형</TH>
            <TH>삭제일</TH>
            <TH align="right">관리</TH>
          </TR>
        </THead>
        <TBody>
          {documents.length ? (
            documents.map((doc) => (
              <TR key={doc.id}>
                <TD className="max-w-[260px] truncate" title={doc.file_name}>
                  {doc.file_name}
                </TD>
                <TD>{doc.doc_type}</TD>
                <TD className="tnum whitespace-nowrap">{doc.deleted_at}</TD>
                <TD align="right">
                  {isPurgeable(doc.deleted_at, now) ? (
                    <span className="text-[12px] text-fg-subtle">복원 불가</span>
                  ) : (
                    <Button type="button" variant="secondary" size="sm" onClick={() => restore(doc.id)}>
                      복원
                    </Button>
                  )}
                </TD>
              </TR>
            ))
          ) : (
            <TableEmpty colSpan={4} title="휴지통이 비어 있습니다" />
          )}
        </TBody>
      </Table>
    </div>
  )
}
```

- [ ] **Step 5: 빌드와 육안 확인**

```bash
npx tsc --noEmit
npm run lint
npm run build
npm run dev
```

`/documents`, `/documents/upload`, `/documents/trash`를 연다. 확인:
- 금액 컬럼이 우측 정렬 + 고정폭 숫자다.
- 거래구분 배지가 매출=초록, 매입=인디고, 미분류=회색이다.
- 긴 파일명이 잘리고 hover 시 툴팁으로 전체가 보인다.
- 삭제 → 휴지통에 나타남 → 복원이 동작한다.

- [ ] **Step 6: 커밋**

```bash
git add "app/(dashboard)/documents"
git commit -m "feat: restyle document list, upload, and trash"
```

---

### Task 14: 손익 정산

상단에 지표 카드 3장을 추가하고 `max-w-2xl` 제한을 푼다.

**Files:**
- Modify: `app/(dashboard)/profit-loss/page.tsx` (전체 교체)

**Interfaces:**
- Consumes: `PageHeader`, `StatCard`, `Card`/`CardBody`, `Table` 계열, `Badge`, `Field`/`Input`, `Alert`, `Button`
- Produces: 없음

- [ ] **Step 1: `profit-loss/page.tsx` 교체**

`calculatePeriodTotals` / `calculateFranchiseBalances` 호출과 두 Supabase 쿼리, 오류 분기, 미수금/미지급금 판정 로직은 **그대로 유지한다.**

```tsx
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'
import { createServerSupabase } from '@/lib/supabase/server'
import {
  calculatePeriodTotals,
  calculateFranchiseBalances,
  type ClassifiedDocument,
} from '@/lib/reports/profit-loss'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardBody } from '@/components/ui/Card'
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Field, Input } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'

const won = (value: number) => `${value.toLocaleString('ko-KR')}원`

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
  const [{ data: documents, error: documentsError }, { data: franchiseStores, error: storesError }] =
    await Promise.all([
      supabase
        .from('documents')
        .select('transaction_type, amount, year, month, franchise_store_id')
        .is('deleted_at', null)
        .not('transaction_type', 'is', null),
      supabase.from('franchise_stores').select('id, name'),
    ])

  if (documentsError || storesError) {
    console.error('Failed to load profit-loss data:', documentsError ?? storesError)
    return <Alert variant="error">손익 데이터를 불러오지 못했습니다. 관리자에게 문의하세요.</Alert>
  }

  const classified = (documents ?? []) as ClassifiedDocument[]
  const periodTotals = calculatePeriodTotals(classified, year, month)
  const franchiseBalances = calculateFranchiseBalances(classified)
  const storeNameById = new Map((franchiseStores ?? []).map((s) => [s.id, s.name]))

  return (
    <div className="max-w-5xl">
      <PageHeader title="손익 정산" description={`${year}년 ${month}월 기준`} />

      <div className="flex flex-col gap-4">
        <Card>
          <CardBody padding="snug">
            <form className="flex flex-wrap items-end gap-3">
              <Field label="연도" htmlFor="year" className="w-28">
                <Input id="year" type="number" name="year" defaultValue={year} />
              </Field>
              <Field label="월" htmlFor="month" className="w-24">
                <Input id="month" type="number" name="month" min={1} max={12} defaultValue={month} />
              </Field>
              <Button type="submit" variant="secondary">
                조회
              </Button>
            </form>
          </CardBody>
        </Card>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label="매출 합계" value={won(periodTotals.totalSales)} hint={`${year}년 ${month}월`} />
          <StatCard label="매입 합계" value={won(periodTotals.totalPurchases)} hint={`${year}년 ${month}월`} />
          <StatCard
            label="순손익"
            value={won(periodTotals.netProfit)}
            tone={periodTotals.netProfit < 0 ? 'negative' : 'positive'}
            hint={`${year}년 ${month}월`}
          />
        </div>

        <section>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-fg">가맹점별 누적 잔액</h2>
            <span className="text-[12px] text-fg-subtle">미수금 / 미지급금</span>
          </div>
          <Table>
            <THead>
              <TR>
                <TH>가맹점</TH>
                <TH align="right">매출 누계</TH>
                <TH align="right">매입 누계</TH>
                <TH align="right">순잔액</TH>
              </TR>
            </THead>
            <TBody>
              {franchiseBalances.length ? (
                franchiseBalances.map((balance) => {
                  const owed = balance.netBalance >= 0
                  const label = owed ? '미수금' : '미지급금'
                  return (
                    <TR key={balance.franchiseStoreId}>
                      <TD>{storeNameById.get(balance.franchiseStoreId) ?? '-'}</TD>
                      <TD align="right">{won(balance.totalSales)}</TD>
                      <TD align="right">{won(balance.totalPurchases)}</TD>
                      <TD align="right">
                        <span className="inline-flex items-center justify-end gap-2">
                          <Badge status={label}>{label}</Badge>
                          <span className="tnum">{won(Math.abs(balance.netBalance))}</span>
                        </span>
                      </TD>
                    </TR>
                  )
                })
              ) : (
                <TableEmpty colSpan={4} title="집계할 거래가 없습니다" />
              )}
            </TBody>
          </Table>
        </section>
      </div>
    </div>
  )
}
```

`Table`은 이미 자체 보더와 `rounded-lg`를 갖고 있으므로 `Card`로 한 번 더 감싸지 않는다. 감싸면 보더가 이중으로 겹친다. 제목은 표 위에 일반 `<h2>`로 둔다.

- [ ] **Step 2: 손익 계산 회귀 확인**

```bash
npm run test
```

기대: `lib/reports/profit-loss.test.ts`를 포함한 전체 PASS. 이 페이지는 계산 로직을 호출만 하므로 실패하면 안 된다.

- [ ] **Step 3: 빌드와 육안 확인**

```bash
npx tsc --noEmit
npm run build
npm run dev
```

`/profit-loss`를 연다. 확인:
- 상단에 지표 카드 3장이 가로로 놓인다.
- 순손익이 음수면 빨강, 양수면 초록이다.
- 연/월을 바꿔 조회하면 카드 값과 설명이 갱신된다.
- 잔액표의 금액이 전부 우측 정렬 + 고정폭이다.

- [ ] **Step 4: 커밋**

```bash
git add "app/(dashboard)/profit-loss/page.tsx"
git commit -m "feat: restyle profit-loss with stat cards and wider layout"
```

---

### Task 15: 전체 검증 및 마감

**Files:**
- Modify: 필요 시 발견된 결함만

**Interfaces:**
- Consumes: 앞선 모든 태스크
- Produces: 없음

- [ ] **Step 1: 원시 유틸리티 잔재 검색**

교체하지 못하고 남은 곳이 있는지 확인한다.

`border-collapse`는 `components/ui/Table.tsx`에만 남아 있어야 정상이므로 `app` 아래만 검색한다.

```bash
grep -rn "bg-black\|text-blue-600\|text-red-600\|text-gray-500\|border-collapse\|border-b p-4\|w-full border p-2" app --include=*.tsx
```

기대: 결과 없음. 나오면 해당 파일을 프리미티브로 교체한다.

- [ ] **Step 2: 다크 모드 미대응 색 검색**

시맨틱 토큰을 우회한 하드코딩 색이 남아 있는지 본다.

```bash
grep -rn "text-white\|bg-white\|text-black\|bg-gray-\|text-gray-\|bg-slate-\|dark:" app components --include=*.tsx
```

기대: `bg-black/40`(AppShell 백드롭) 한 건만 나온다. 백드롭은 라이트/다크 양쪽에서 같은 반투명 검정이 맞으므로 그대로 둔다. 다른 결과가 나오면 토큰으로 교체한다.

- [ ] **Step 3: 전체 스위트 실행**

```bash
npm run test
npm run lint
npm run build
```

기대: 전부 통과. 기존 테스트 + Task 3의 신규 28개.

- [ ] **Step 4: 4조합 육안 점검**

```bash
npm run dev
```

라이트/다크 × 데스크톱(1440px)/모바일(390px) 4조합으로 다음 경로를 전부 돈다:

`/login` → `/employees` → `/employees/<id>` → `/employees/<id>/edit` → `/employees/new` → `/employees/bulk-upload` → `/franchise-stores` → `/payroll` → `/payroll/<id>/upload` → `/profit-loss` → `/documents` → `/documents/upload` → `/documents/trash`

각 화면에서 확인:
- 흰 배경에 흰 글씨, 검은 배경에 검은 글씨 같은 대비 파손이 없다.
- 모바일에서 가로 스크롤이 페이지 전체에 생기지 않는다 (넓은 표는 표 안에서만 스크롤된다).
- 키보드 `Tab`으로 이동할 때 포커스 링이 항상 보인다.

발견된 문제는 이 태스크 안에서 고친다.

- [ ] **Step 5: viewer 역할 확인**

DB에서 자기 계정의 `profiles.role`을 `viewer`로 바꾸고 `/employees`를 새로고침한다.

확인:
- 사이드바에 "급여대장"과 "손익 정산"이 없다.
- "인사" 그룹에 "사원 관리"만 남는다.
- URL로 `/payroll`에 직접 접근하면 `/employees`로 리다이렉트된다.
- 사원 목록의 "+ 사원 등록" 버튼이 없다.

확인 후 역할을 원래대로 되돌린다.

- [ ] **Step 6: 스펙 문서의 오류 정정**

`docs/superpowers/specs/2026-09-01-erp-design-system-design.md`에서 사실과 다른 두 곳을 고친다:

1. "배지 톤 매핑" 표의 `활성` → `운영중`, `비활성` → `폐업`으로 수정하고 `매입 → accent` 행을 추가한다.
2. "공용 컴포넌트" 절과 "테스트" 절의 `components/ui/badge-tone.ts` / `components/ui/badge-tone.test.ts` 경로를 `lib/ui/badge-tone.ts` / `lib/ui/badge-tone.test.ts`로 수정하고, `lib/ui/button-class.ts`를 추가한다.
3. "로그아웃" 절의 `app/(dashboard)/actions.ts`를 `lib/auth/actions.ts`로 수정한다.
4. "타이포그래피" 절의 4단 스케일 표를 이 계획의 Global Constraints에 있는 6단 표(display / title / section / body / caption / eyebrow)로 교체한다. 4단 선언은 스펙 자신이 요구한 화면들과 맞지 않았다 — `StatCard`의 수치와 사이드바 그룹 라벨은 어느 단에도 속하지 않았다.

- [ ] **Step 7: 최종 커밋**

```bash
git add -A
git commit -m "docs: correct spec paths and status values to match implementation"
git log --oneline main..HEAD
```

기대: Task 2부터 이 태스크까지의 커밋이 순서대로 나열된다.

---

## 완료 조건

- [ ] 상단 네브바가 코드베이스에서 사라졌다.
- [ ] 사이드바가 데스크톱에서 고정, 모바일에서 드로어로 동작한다.
- [ ] 라이트/다크 두 테마에서 모든 화면이 읽힌다.
- [ ] `app` 아래에 원시 색 유틸리티(`bg-black`, `text-gray-*` 등)가 남아 있지 않다.
- [ ] 모든 폼 입력에 실제 `<label>`이 연결되어 있다.
- [ ] 모든 목록 화면이 빈 상태를 표시한다.
- [ ] 로그아웃이 동작한다.
- [ ] `npm run test`, `npm run lint`, `npm run build` 전부 통과.
