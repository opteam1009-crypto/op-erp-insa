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
| 3 | `db/migrations/*.sql` | 번호순으로 전부. 이미 돌린 DB에는 새 번호만 |

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

## 사원 일정 캘린더

사원 관리의 **캘린더** 탭(`/employees/calendar`)이 사원별 날짜를 달력 한 장에
모아 보여줍니다. 종류별로 색이 다르고, 범례를 눌러 켜고 끌 수 있습니다.

| 종류 | 컬럼 | 표시 |
| --- | --- | --- |
| 계약만료일 | `contract_end_date` | 해당 날짜 칸 |
| 정규직전환 평가일 · 발표일 | `contract_review_date` · `contract_announce_date` | 해당 날짜 칸 |
| 정규직전환일 | `regular_conversion_date` | 해당 날짜 칸 |
| 연봉협상 평가일 · 발표일 | `salary_review_date` · `salary_announce_date` | 해당 날짜 칸 |
| 연봉협상월 | `salary_negotiation_month` | 날짜가 아니라 달이므로 격자 위 띠에 대상자 이름으로 |

- 퇴사자는 기본으로 빠집니다. 지난 계약을 되짚어 볼 때만 "퇴사자 포함"을 켭니다.
- 달은 `?month=YYYY-MM`으로 주소에 남으므로 특정 달을 링크로 공유할 수 있습니다.
  이달은 파라미터 없이 `/employees/calendar`입니다.
- 캘린더에서 값을 고치지는 않습니다. 목록 탭의 인라인 편집이나 사원 상세에서 고칩니다.

## 연장근무 · 휴일근무 정산

급여대장 아래 **연장근무**(`/payroll/overtime`)와 **휴일근무**(`/payroll/holiday-work`)
메뉴입니다. 둘은 같은 표(`extra_work`)와 같은 화면을 쓰고 종류 값만 다릅니다.
`db/migrations/0002_extra_work.sql`을 적용해야 열립니다.

정산 단위는 **사원 · 종류 · 월**입니다. 날짜별로 쌓지 않습니다 — 서류는 사람마다
한 달에 한 장 오고, 정산도 말일에 달 단위로 합니다.

흐름은 이렇습니다.

1. **대상 추가** — 이달 해당 근무를 한 사원을 부서별 체크 목록에서 고릅니다. 같은
   사람을 두 번 올려도 한 건입니다.
2. **미제출 명단 복사** — 부서별로 묶은 미제출 명단을 클립보드에 복사해 팀 채팅에
   붙여 넣습니다. 서류 요청은 이걸로 합니다.
3. **서류 올리기 / 제출 표시** — 받은 서류 파일을 행에 올리면 저장되면서 제출로
   찍힙니다. 종이로 받았으면 제출 배지를 눌러 표시만 합니다. 배지를 되돌려도
   파일은 남습니다.
4. 미제출이 0이면 정산입니다. 시간과 메모는 칸에서 바로 고칩니다. 시간은 아직
   손으로 적습니다 — 출퇴근 기록 파서는 없습니다.

파일은 Vercel Blob의 `extra-work/` 접두사 아래에 비공개로 저장되고,
`/api/extra-work/{id}/file`이 세션을 확인한 뒤 읽어서 내려줍니다. 받는 형식은
pdf · 이미지 · 엑셀 · docx · hwp이고, MIME이 아니라 확장자로 거릅니다(hwp의 MIME은
브라우저마다 달라서). 대상을 지우면 파일도 함께 지워집니다.
