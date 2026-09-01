# ERP 디자인 시스템 및 사이드바 셸 개편

작성일: 2026-09-01

## 배경

현재 ERP는 `create-next-app` 기본값에서 시각적으로 거의 손대지 않은 상태다.

- 셸은 `app/(dashboard)/layout.tsx`의 `border-b p-4` 헤더 하나에 링크 5개가 전부다.
- 디자인 토큰은 `app/globals.css`에 `--background` / `--foreground` 2개뿐이고,
  `prefers-color-scheme: dark` 블록이 선언되어 있으나 어떤 컴포넌트도 이를 참조하지
  않는다. OS가 다크 모드면 흰 배경에 흰 글씨 같은 대비 파손이 발생할 수 있다.
- 15개 페이지가 각자 `border-b`, `p-2`, `bg-black px-4 py-2 text-white`,
  `w-full border p-2` 같은 원시 유틸리티를 반복한다. 공용 UI 컴포넌트가 없어
  한 곳을 고쳐도 나머지가 따라오지 않는다.
- 본문 폰트가 Geist(라틴 전용)여서 한글 전체가 시스템 폴백(맑은 고딕 등)으로
  떨어진다. 화면이 정돈되지 않아 보이는 주요 원인 중 하나다.
- 데이터가 없을 때 빈 `<tbody>`만 렌더링되어 빈 상태 안내가 없다.
- 로그아웃 기능이 앱 전체에 존재하지 않는다.

## 목표

1. 상단 네브바를 걷어내고 좌측 고정 사이드바 + 모바일 드로어 구조로 전환한다.
2. 시맨틱 디자인 토큰을 도입하고 라이트/다크 두 테마를 제대로 지원한다.
3. 공용 UI 프리미티브를 만들고 15개 페이지 전부를 그 위에 재구성한다.
4. 한글 웹폰트를 적용한다.

## 비목표

- 데이터 조회 쿼리, 서버 액션, 권한 로직 변경. (예외: 로그아웃 서버 액션 신규 추가)
- 차트/데이터 시각화 도입. 손익 페이지가 월별 시계열을 조회하지 않으므로 차트를
  그리려면 쿼리 변경이 필요하다. 이번 범위 밖이다.
- 신규 화면, 신규 도메인 기능.
- UI 라이브러리 의존성 추가. 아이콘은 인라인 SVG로 자체 제공한다.

## 디자인 방향

**정밀한 SaaS 콘솔** (Linear/Vercel 계열). 중성 회색 팔레트 + 인디고 액센트 1색,
얇은 보더, 촘촘한 표, 숫자는 `tabular-nums` 고정폭. 사내 ERP의 표·숫자 중심
성격에 맞추고 장기간 유지하기 쉬운 방향을 택했다.

## 선행 조건

`node_modules`가 설치되어 있지 않다. 구현 첫 단계에서 `npm install`을 실행하고,
`AGENTS.md`의 지시에 따라 `node_modules/next/dist/docs/`의 관련 가이드
(App Router 레이아웃, `next/font`, 메타데이터)를 읽은 뒤 코드를 작성한다.
Next.js 16은 학습 데이터와 API가 다를 수 있으므로 이 단계를 건너뛰지 않는다.

## 아키텍처

### 셸

`app/(dashboard)/layout.tsx`는 `requireUser()`를 호출하는 async 서버 컴포넌트이므로
그대로 서버 컴포넌트로 유지한다. 상호작용은 그 안에 중첩되는 클라이언트 컴포넌트가
전담한다.

```
components/
  shell/
    AppShell.tsx      'use client' — 드로어 열림 상태, 반응형 그리드
    Sidebar.tsx       'use client' — 브랜드 / 그룹 네비 / 하단 유저 블록
    MobileTopBar.tsx  'use client' — md:hidden, 햄버거 + 현재 페이지명
    ThemeToggle.tsx   'use client' — data-theme 토글 + localStorage
    icons.tsx         인라인 SVG 아이콘 세트
lib/
  nav/items.ts        buildNavItems(role) — 순수 함수
```

데이터 흐름: 서버 레이아웃이 `requireUser()`로 사용자를 얻고
`buildNavItems(user.role)`로 메뉴를 계산해 `<AppShell nav={...} user={...}>`에
props로 내린다. 클라이언트는 권한을 알 필요가 없고 `usePathname()`으로 활성 항목만
판별한다. 권한 필터링이 순수 함수로 분리되므로 단위 테스트가 가능하다.

### 사이드바 사양

- 데스크톱 폭 260px, `--surface-2` 배경, 우측 1px 보더, 세로 스크롤.
- 상단: 브랜드 블록 (마크 + "회사 ERP").
- 네비 그룹 2개:
  - **인사** — 사원 관리(`/employees`), 급여대장(`/payroll`)
  - **정산** — 가맹점 관리(`/franchise-stores`), 손익 정산(`/profit-loss`),
    증빙 관리(`/documents`)
  - 그룹 라벨은 11px, 자간 확장, `--fg-subtle`.
- 활성 상태: 은은한 채워진 배경 + 좌측 2px 액센트 바 + 텍스트 풀 컨트라스트.
  판별 기준은 `pathname === href` 또는 `pathname`이 `href + '/'`로 시작하는 경우.
- 하단 유저 블록: 이니셜 원형 아바타 + 이메일 + 역할 배지 + 테마 토글 + 로그아웃.
- 본문 영역: `max-w-[1400px]`, `px-8 py-7` (모바일 `px-4 py-5`).

### 모바일 (`< md`)

사이드바가 `fixed inset-y-0 left-0` 오버레이 + 반투명 백드롭으로 전환된다.
상단에 얇은 바(햄버거 + 현재 페이지명)를 둔다. 라우트 변경 시 드로어를 닫고,
`Escape` 키로도 닫는다.

### 로그아웃

`lib/auth/actions.ts`에 서버 액션 `signOut()`을 추가한다.
`createServerSupabase()`로 `auth.signOut()`을 호출하고 `redirect('/login')`한다.
사이드바 하단에서 `<form action={signOut}>`으로 제출한다.

## 디자인 토큰

`app/globals.css`의 기존 2개 토큰을 시맨틱 스케일로 교체하고 Tailwind v4 `@theme`에
등록한다. 컴포넌트는 `bg-surface`, `text-fg-muted`, `border-border` 같은 시맨틱
클래스만 사용한다.

**다크 모드는 유틸리티에 `dark:` 접두사를 뿌리지 않는다.** `:root[data-theme="dark"]`
에서 토큰 값만 재정의하여 컴포넌트 코드를 한 벌로 유지한다.

| 토큰 | 라이트 | 다크 | 용도 |
|---|---|---|---|
| `--bg` | `#fbfbfa` | `#0b0b0d` | 페이지 바닥 |
| `--surface` | `#ffffff` | `#141417` | 카드 / 표 본문 |
| `--surface-2` | `#f5f5f4` | `#0f0f12` | 사이드바 / 표 헤더 |
| `--surface-3` | `#ebeae8` | `#1c1c21` | hover / 활성 배경 |
| `--border` | `#e7e5e4` | `#26262b` | 기본 보더 |
| `--border-strong` | `#d6d3d1` | `#35353c` | 입력 컨트롤 보더 |
| `--fg` | `#1c1b1a` | `#ededec` | 본문 텍스트 |
| `--fg-muted` | `#57534e` | `#a1a1a6` | 보조 텍스트 |
| `--fg-subtle` | `#8b8682` | `#6e6e75` | 라벨 / 캡션 |
| `--accent` | `#4f46e5` | `#7c74f0` | 주요 액션 / 활성 |
| `--accent-fg` | `#ffffff` | `#0b0b0d` | 액센트 위 텍스트 |
| `--positive` | `#15803d` | `#4ade80` | 재직 / 활성 / 매출 / 양수 |
| `--warning` | `#b45309` | `#fbbf24` | 휴직 / 주의 |
| `--negative` | `#b91c1c` | `#f87171` | 퇴사 / 비활성 / 미지급 / 음수 / 삭제 |

### 테마 초기화 (FOUC 방지)

`app/layout.tsx`의 `<html>`에 `suppressHydrationWarning`을 주고, `<head>`에 인라인
스크립트를 넣어 페인트 전에 테마를 확정한다. 스크립트는 `localStorage`의 `theme`
값을 읽고, 없으면 `matchMedia`로 OS 설정을 판정해
`document.documentElement.dataset.theme`을 설정한다.

Tailwind v4에서 다크 변형이 필요한 예외 상황을 위해 `@custom-variant dark`를
`[data-theme="dark"]` 기준으로 선언해 두되, 사용은 최소화한다.

`globals.css`의 기존 `@media (prefers-color-scheme: dark)` 블록은 제거한다.

### 타이포그래피

`next/font/google`의 `Noto_Sans_KR`을 추가하고 폰트 스택을
`var(--font-geist-sans), var(--font-noto-kr), sans-serif`로 구성한다. 브라우저가
글리프 단위로 폴백하므로 숫자·영문은 Geist, 한글은 Noto Sans KR이 적용된다.

`subsets`는 `["latin"]`이고 `preload: false`다. 이 Next.js 버전의
`Noto_Sans_KR`은 `"korean"` 서브셋 이름을 받지 않지만(허용값:
`cyrillic | latin | latin-ext | vietnamese`), 한글은 `subsets` 배열과 무관하게
기본 커버리지로 실린다 — 빌드 산출물에서 `@font-face` 125개, 한글 음절
영역(U+AC00–D7A3)을 덮는 `unicode-range` 959개를 확인했다. 그 청크를 전부
preload하면 초기 로드가 수 MB로 불어나므로 `preload: false`로 둔다.

스케일 6단 고정. 이 여섯 개 밖의 크기를 쓰지 않는다:

| 단 | 크기 / 굵기 | 용도 |
|---|---|---|
| display | 22px / 600 | `StatCard`의 수치. 유일한 사용처 |
| title | 20px / 600 | 페이지 제목 |
| section | 15px / 600 | 카드 제목, 모바일 상단 바, 사이드바 워드마크 |
| body | 13.5px / 400 | 본문, 표 셀, 입력 컨트롤, `md` 버튼 |
| caption | 12px / 500 | 라벨, 힌트, 배지, 보조 텍스트, `sm`·`icon` 버튼 |
| eyebrow | 11px / 500 | 사이드바 그룹 라벨. 유일한 사용처 |

위계는 크기를 늘리는 대신 굵기와 색(`--fg` / `--fg-muted` / `--fg-subtle`)으로 만든다.

금액·사번 등 숫자 컬럼에는 `font-variant-numeric: tabular-nums`를 적용한다.

> **정정 (구현 후):** 최초 스펙은 4단을 선언했으나 스펙이 요구한 화면들과 맞지
> 않았다. `StatCard`의 수치와 사이드바 그룹 라벨은 어느 단에도 속하지 못했고,
> 그 결과 구현 계획이 11가지 크기(11 / 12 / 12.5 / 13 / 13.5 / 14 / 15 / 16 /
> 18 / 20 / 22px)를 쓰게 됐다. 위 6단은 그 11개를 정리한 결과다.

## 공용 컴포넌트

`components/ui/` 아래에 둔다.

| 컴포넌트 | 내용 |
|---|---|
| `Button` | `primary` / `secondary` / `ghost` / `danger` × `sm` / `md` / `icon`. `Link`에도 쓸 수 있도록 `buttonClass(variant, size, extra)` 헬퍼를 함께 export |
| `PageHeader` | 제목 + 설명 + 우측 액션 슬롯 |
| `Card` | `Card` / `CardHeader` / `CardTitle` / `CardBody`. `--surface` 배경, 1px 보더, `rounded-lg`. `CardBody`의 세로 패딩은 `padding="default" \| "tight" \| "snug"` prop으로 고른다 |
| `Table` | `Table` / `THead` / `TBody` / `TR` / `TH` / `TD` / `TableEmpty`. 헤더는 `--surface-2`, 본문 행만 hover, `align="right"` 시 우측 정렬 + `tabular-nums` |
| `Badge` | `tone` prop 또는 `status` 문자열 자동 매핑 |
| `Field` | 라벨 + 컨트롤 + 힌트 / 에러 문구 래퍼 |
| `Input` / `Select` | 통일된 보더·패딩·포커스 링 |
| `FileInput` | 점선 보더 영역, `type="file"` 내장 |
| `Alert` | `error` / `success` / `info`. `role="alert"` 포함 |
| `EmptyState` | 아이콘 + 문구 + 선택적 액션 |
| `DescriptionList` | 라벨/값 2열 정의형 목록 |
| `StatCard` | 라벨 + 큰 숫자 + 보조 문구, 숫자 tabular |

`buttonClass()`와 배지 톤 매핑은 JSX가 아닌 순수 함수로 분리해 테스트 대상으로
삼는다 (`lib/ui/button-class.ts`, `lib/ui/badge-tone.ts`). 두 파일이
`components/ui/`가 아니라 `lib/` 아래 있는 이유는 `vitest.config.ts`의
`include`가 `lib/**/*.test.ts`이기 때문이다.

> **정정 (구현 후):** 두 가지가 스펙과 달라졌다.
>
> 1. `Textarea`는 만들지 않았다. 15개 페이지 어디에도 `<textarea>`가 없다.
> 2. `CardBody`는 처음에 `px-4 py-4 ${className}`으로 구현됐고 호출부가
>    `className="py-1"`로 덮으려 했으나, `class` 속성의 단어 순서는 CSS
>    캐스케이드를 결정하지 않으므로 6곳 모두에서 `py-4`가 이겼다. 명시적
>    `padding` prop으로 교체했다. 일반 규칙: 유틸리티 클래스로 프리미티브의
>    내장 스타일을 덮으려 하지 말고 그 프리미티브에 prop을 추가한다.

### 배지 톤 매핑

| 값 | 톤 |
|---|---|
| 재직, 운영중, 매출, 미수금 | positive |
| 휴직 | warning |
| 퇴사, 폐업, 미지급금 | negative |
| 매입 | accent |
| 그 외 (미분류 등) | neutral |

> **정정 (구현 후):** 최초 스펙은 가맹점 상태를 '활성 / 비활성'으로 적었으나
> `lib/types.ts`의 실제 값은 `'운영중' | '폐업'`이다. 또한 매출과 매입이 같은
> 톤이면 표에서 구분되지 않아 매입을 accent로 분리했다.

## 페이지별 적용

전 페이지에 적용한다. 구조가 실제로 바뀌는 곳:

- **손익 정산** (`profit-loss/page.tsx`) — 상단 `StatCard` 3장(매출 / 매입 / 순손익)
  그리드. 순손익은 부호에 따라 positive/negative 색. 연·월 조회 폼은 `Card` 내
  인라인 필터 바. 가맹점 잔액표의 미수금/미지급금은 `Badge`로 구분.
  기존 `max-w-2xl` 제한을 해제해 표가 넓게 쓰이도록 한다.
- **급여대장** (`payroll/page.tsx`) — 현재 파란 링크만 나열된 `<ul>`을
  사번 / 이름 / 바로가기 3열 `Table`로 교체.
- **사원 등록 · 수정 폼** — 세로 1열 13개 입력을 `Card` 3개로 분할:
  기본 정보 / 근로 정보 / 일정(정규직전환·연봉협상). 2열 그리드.
  `placeholder`로만 존재하던 이름표를 실제 `<label>`로 승격한다 (접근성 개선).
- **사원 상세** (`employees/[id]/page.tsx`) — `사번: ...` 형태의 `<p>` 나열을
  `DescriptionList` 2열로. 상단에 이름 + 사번 + 상태 배지 헤더.
- **증빙 관리** (`documents/page.tsx`) — 금액 컬럼 우측 정렬 + tabular,
  유형·거래구분 배지, 파일명 truncate.
- **로그인** (`app/login/`) — 가운데 정렬 카드 하나. 브랜드 마크 + "회사 ERP" +
  설명 한 줄 + Google 로고 SVG가 포함된 버튼.
- **모든 목록 페이지** — 데이터가 비었을 때 `EmptyState` 렌더링.
- **`app/page.tsx`** — redirect 전용이므로 변경 없음.

대상 파일 전체:

```
app/layout.tsx
app/globals.css
app/login/page.tsx, app/login/LoginForm.tsx
app/(dashboard)/layout.tsx
lib/auth/actions.ts                             (신규 — signOut)
app/(dashboard)/employees/page.tsx
app/(dashboard)/employees/new/page.tsx, NewEmployeeForm.tsx
app/(dashboard)/employees/[id]/page.tsx
app/(dashboard)/employees/[id]/edit/page.tsx, EditEmployeeForm.tsx
app/(dashboard)/employees/bulk-upload/page.tsx, BulkUploadForm.tsx
app/(dashboard)/franchise-stores/page.tsx, CreateFranchiseStoreForm.tsx,
  StatusToggleButton.tsx
app/(dashboard)/payroll/page.tsx
app/(dashboard)/payroll/[employeeId]/upload/page.tsx
app/(dashboard)/profit-loss/page.tsx
app/(dashboard)/documents/page.tsx, DeleteButton.tsx
app/(dashboard)/documents/upload/page.tsx, DocumentUploadForm.tsx
app/(dashboard)/documents/trash/page.tsx, TrashList.tsx
```

## 오류 처리

기존 오류 처리 동작은 유지하고 표현만 교체한다.

- 페이지 수준 조회 실패(`documentsError` 등)의 빨간 `<p>`는
  `Alert variant="error"`로 대체한다. 메시지 문구는 그대로 둔다.
- 폼 오류(`NewEmployeeForm`의 `error` state 등)는 `Alert` 또는 `Field`의 에러
  슬롯으로 옮긴다. 검증 로직과 메시지는 변경하지 않는다.
- `LoginForm`의 `role="alert"`는 `Alert` 컴포넌트가 계승한다.

## 테스트

- 기존 vitest 스위트 전체 통과 유지 (`npm run test`). 이번 작업은 `lib/`의 도메인
  로직을 건드리지 않으므로 회귀가 발생하면 실수의 신호로 간주한다.
- 신규: `lib/nav/items.test.ts` — 역할별 메뉴 필터링. admin과 staff는 5개 전부,
  viewer는 급여대장·손익 정산이 제외되는지 검증.
- 신규: `lib/ui/badge-tone.test.ts` — 상태 문자열 → 톤 매핑, 미지의 값은
  neutral로 폴백.
- `npm run lint`, `npm run build` 통과.
- `npm run dev` 실행 후 라이트/다크 × 데스크톱/모바일 4개 조합 육안 확인.

## 위험 요소

- **`node_modules` 미설치** — 구현 첫 단계에서 `npm install` 필요. Next.js 16
  API가 기존 지식과 다를 수 있으므로 번들된 문서를 먼저 읽는다.
- **파일 수가 많다** — 20개 이상 파일을 수정한다. 프리미티브를 먼저 완성하고
  페이지는 그 다음에 한 도메인씩 옮기는 순서로 진행해 중간 상태에서도 앱이
  깨지지 않게 한다.
- **`AGENTS.md`의 자동 재생성** — `next dev` 실행 시 `AGENTS.md`가 다시 쓰여
  작업 트리에 변경이 생길 수 있다. 발생하면 작업과 함께 커밋한다.
