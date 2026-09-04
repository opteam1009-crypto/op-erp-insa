# 회사 ERP

사내 ERP (사원정보관리 · 증빙관리 · 급여대장 · Slack 리마인더).
Next.js 16 (App Router) + TypeScript + Tailwind v4 + Neon (Postgres) + Vercel Blob + Vercel Cron.

---

## 인증 모델 — 먼저 읽으세요

**이 앱의 인증은 공용 비밀번호 하나입니다.** 계정도 역할도 없습니다. 비밀번호를
아는 사람은 급여대장과 손익 정산을 포함해 전부 봅니다.

사용자가 한 명이라는 전제 위에 서 있습니다. **두 번째 사용자가 생기는 순간 이
전제가 깨집니다** — 그때는 계정별 비밀번호와 역할 구분으로 돌아와야 하고, 그건
스키마와 화면 양쪽을 건드리는 작업입니다.

Supabase 시절에는 RLS가 두 번째 방어선이었습니다. Neon에는 앱 role 하나로
붙으므로 **DB가 걸러 주는 것이 없습니다.** 인가는 `proxy.ts`의 세션 검사가
전담합니다. 새 라우트를 추가할 때 미들웨어 matcher에서 빠지지 않는지 확인하세요.
서버 액션과 API 라우트는 미들웨어를 우회할 수 있으므로 `isSignedIn()`으로 한 번
더 검사합니다.

---

## Setup runbook

### 1. Neon 데이터베이스

**Vercel → Storage → Create Database → Neon**. 프로젝트에 연결하면
`DATABASE_URL`이 환경변수로 자동 주입됩니다.

Neon 콘솔의 **SQL Editor**에서 순서대로 실행하세요.

| 순서 | 파일 | 내용 |
| --- | --- | --- |
| 1 | `db/schema.sql` | 테이블 · 인덱스 전체 |
| 2 | `db/seed.sql` | 부서 목록 |

`db/schema.sql`은 Supabase 시절 마이그레이션 10개를 합친 것입니다. 이후 스키마
변경은 `db/migrations/0001_*.sql` 부터 append-only로 쌓으세요. 기존 파일을
수정하지 마세요.

### 2. Vercel Blob

**Vercel → Storage → Create Database → Blob**. 연결하면
`BLOB_READ_WRITE_TOKEN`이 자동 주입됩니다.

파일은 `documents/`, `payroll/` 접두사로 구분해 저장합니다. `lib/storage/blob.ts`가
`access: 'private'`를 고정하고 호출부에 선택권을 주지 않습니다 — 여기에 급여대장이
들어가므로 public이 되면 URL을 아는 사람이 인증 없이 내려받습니다.

### 3. 환경 변수

로컬은 `.env.local`, 배포는 **Vercel → Project → Settings → Environment
Variables**.

| 변수 | 출처 | 비고 |
| --- | --- | --- |
| `DATABASE_URL` | Neon 연결 시 자동 주입 | |
| `BLOB_READ_WRITE_TOKEN` | Blob 연결 시 자동 주입 | |
| `APP_PASSWORD` | 직접 설정 | 로그인 비밀번호 |
| `SESSION_SECRET` | `openssl rand -hex 32` | 세션 쿠키 서명 키. 바꾸면 모든 세션이 즉시 만료됩니다 |
| `SLACK_WEBHOOK_URL` | Slack → Incoming Webhooks | **없으면 크론은 돌지만 아무 데도 안 보냅니다** |
| `CRON_SECRET` | `openssl rand -hex 32` | 크론 라우트의 `Authorization: Bearer` 검증값 |

### 4. Cron

`vercel.json`에 스케줄이 정의되어 있습니다. 위 환경변수가 채워진 상태로
**배포하는 순간부터** 동작합니다.

| 경로 | 스케줄 (UTC) | 내용 |
| --- | --- | --- |
| `/api/cron/contract-reminders` | `0 0 * * *` (매일) | 정규직 전환 · 연봉협상 평가일/발표일 D-N 리마인더 |
| `/api/cron/birthday-reminders` | `30 0 * * 1` (매주 월요일) | 이번 주 생일자 주간 다이제스트 |

크론 라우트는 쿠키 없이 호출되므로 `proxy.ts`의 세션 검사에서 제외됩니다.
`CRON_SECRET` 검증이 유일한 방어선이고, RLS가 없는 지금 여기가 뚫리면 DB 전체가
열립니다.

두 라우트 모두 `notification_log`로 중복 발송을 막습니다. 계약 알림은
사원/날짜별, 생일 알림은 주 단위입니다. 계약 알림은 로그를 먼저 넣어 자리를
잡고, **발송이 실패하면 그 행을 지웁니다** — 그러지 않으면 웹훅이 잠깐 죽은 날의
알림이 영영 재시도되지 않고 사라집니다.

---

## Local development

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm test         # vitest (lib/**/*.test.ts)
npm run lint     # eslint
npm run build    # 프로덕션 빌드
npx tsc --noEmit # 타입 체크
```

## 데이터 접근

`lib/db/sql.ts`의 태그드 템플릿 하나로만 붙습니다.

```ts
const rows = await sql`select * from employees where id = ${id}`
```

보간된 값은 파라미터로 바인딩되므로 SQL 인젝션이 구조적으로 막힙니다. **문자열을
이어붙여 쿼리를 만들지 마세요.**

주의: `numeric` 컬럼(`documents.amount`)은 드라이버가 **문자열로** 돌려줍니다.
계산에 쓰기 전에 `Number()`를 통과시켜야 합니다 — 안 그러면 합계가 문자열
이어붙이기가 됩니다.

## 사원 엑셀 일괄 등록

`/employees/bulk-upload`에서 올립니다. 파서(`lib/excel/employee-parser.ts`)가
읽는 열은 다음과 같고, 흔한 표기 변형을 별칭으로 받습니다.

| 열 | 별칭 | 필수 |
| --- | --- | --- |
| 사번 | 사원번호 | 아니오 — 비면 자동 채번 |
| 이름 | 성명 | **예** |
| 부서 | 소속부서, 소속 | 아니오 |
| 직급 | | 아니오 |
| 근로형태 | 계약형태, 고용형태 | **예** |
| 입사일 | | **예** |
| 퇴사일 | 퇴직일 | 아니오 |
| 재직상태 | 상태 | 아니오 |
| 생년월일 | 생일 | 아니오 |
| 연락처 | 전화번호 | 아니오 |
| 비상연락망 | 비상연락처 | 아니오 |

- 부서는 **이름으로 조회만 하고 만들지 않습니다.** `db/seed.sql`에 없는 이름은
  그 행이 실패합니다.
- 재직상태가 비어 있으면 퇴사일 유무로 판단합니다. 이게 없으면 DB 기본값이 붙어
  퇴사자가 전원 재직중으로 들어갑니다.
- 정규직전환 평가일은 입사일 + 3개월(주말이면 다음 월요일)로 자동 계산됩니다.

"현재 사원 목록 다운로드"가 주는 파일은 위 열 구성과 같으므로, 받아서 고친 뒤
그대로 다시 올릴 수 있습니다.
