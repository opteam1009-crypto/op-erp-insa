# 회사 ERP

사내 ERP (사원정보관리 · 증빙관리 · 급여대장 · Slack 리마인더).
Next.js 16 (App Router) + TypeScript + Tailwind v4 + Supabase (Postgres / Auth / Storage) + Vercel Cron.

---

## Setup runbook

이 순서대로 진행하세요. 1~5는 Supabase 프로젝트를 처음 만들 때 한 번만 하면 됩니다.

### 1. Supabase 프로젝트 생성

1. https://supabase.com/dashboard 에서 **New project** 생성.
2. Region은 `Northeast Asia (Seoul)` 권장.
3. 생성 후 **Project Settings → API** 에서 다음 값을 복사해 둡니다 (6단계에서 사용):
   - Project URL
   - `anon` public key
   - `service_role` secret key

### 2. 마이그레이션 실행

**SQL Editor** 에서 `supabase/migrations/` 의 파일을 **번호 순서대로** 실행합니다. 순서가 중요합니다 (뒤 마이그레이션이 앞 마이그레이션의 테이블/정책에 의존).

| 순서 | 파일 | 내용 |
| --- | --- | --- |
| 1 | `0001_init.sql` | 테이블 스키마 전체 |
| 2 | `0002_rls.sql` | `current_user_role()` + RLS 정책 |
| 3 | `0003_accept_invitation.sql` | `accept_invitation()` security definer 함수 |
| 4 | `0004_payroll_update_policy.sql` | `payroll_records` UPDATE 정책 (upsert 용) |
| 5 | `0005_birthday_notification_unique.sql` | 생일 알림 중복 방지 partial unique index |
| 6 | `0006_drop_profiles_insert_self.sql` | **보안**: 자가 admin 승격을 허용하던 죽은 정책 제거 + profiles DELETE 정책 |
| 7 | `0007_salary_dates.sql` | 연봉 협상 관련 날짜 컬럼(`salary_review_date`, `salary_announce_date`) 추가 |
| 8 | `0008_notification_log_salary_types.sql` | `notification_log` type CHECK 제약에 `salary_review`/`salary_announce` 포함하도록 확장 |
| 9 | `0009_franchise_stores.sql` | `franchise_stores` 테이블 + RLS |
| 10 | `0010_document_transactions.sql` | `documents` 에 거래구분/금액/가맹점 컬럼 추가 |

그 다음 `supabase/seed.sql` 을 실행해 부서 목록을 넣습니다. 실제 부서명이 이미
들어 있으므로 그대로 실행하면 됩니다.

마이그레이션 파일은 **append-only** 입니다. 기존 파일을 수정하지 말고 항상 새 번호의 파일을 추가하세요.

### 3. Google OAuth 활성화

로그인은 Google OAuth 단일 경로입니다.

1. **Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID → Web application**
2. Authorized redirect URI 에 Supabase 콜백 주소를 등록:
   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```
3. 발급된 **Client ID / Client Secret** 을 Supabase **Authentication → Sign In / Providers → Google** 에 입력하고 활성화.
4. Supabase **Authentication → URL Configuration**
   - Site URL: 배포 도메인 (로컬 개발 시 `http://localhost:3000`)
   - Additional Redirect URLs: `http://localhost:3000/auth/callback`, `https://<배포도메인>/auth/callback`

앱 자체의 콜백 라우트는 `/auth/callback` 이며, 여기서 `accept_invitation()` 을 호출해 초대 여부를 확인합니다. 초대되지 않은 계정은 즉시 로그아웃되고 `/login?error=not_invited` 로 되돌아갑니다.

### 4. Storage 버킷 생성 — ⚠️ 반드시 Private

**Storage → New bucket** 에서 버킷 2개를 만듭니다.

| 버킷 이름 | 용도 |
| --- | --- |
| `documents` | 증빙 파일 (세금계산서/계산서/카드/현금영수증) |
| `payroll` | 급여대장 파일 |

> ### 🔴 두 버킷 모두 "Public bucket" 체크를 반드시 해제하세요.
>
> 이 버킷에는 회사 재무 자료와 **급여대장**이 들어갑니다. 버킷을 public 으로 만들면 파일 URL 을 아는 사람은 **누구나 인증 없이** 급여대장과 증빙 파일을 내려받을 수 있습니다. 앱 어디에도 public read 가 필요한 경로는 없습니다.
>
> 이미 만들었다면 **Bucket settings** 에서 public 여부를 확인하고 꺼주세요.

(버킷 단위 `storage.objects` RLS 정책은 Month 2 후속 작업입니다. 현재 방어선은 "버킷을 private 으로 만든다" 입니다.)

### 5. 부트스트랩 admin 초대

첫 관리자는 앱에서 만들 수 없습니다 (초대받은 계정만 가입 가능하기 때문). **SQL Editor** 에서 직접 초대 행을 넣으세요.

```sql
insert into invitations (email, role) values ('you@yourcompany.com', 'admin');
```

이후 해당 Google 계정으로 `/login` 에서 로그인하면 `accept_invitation()` 이 `profiles` 행을 만들고 초대는 `accepted` 로 바뀝니다. 추가 사용자도 같은 방식으로 SQL Editor 에서 초대합니다 (`role` 은 `'admin' | 'staff' | 'viewer'`).

### 6. 환경 변수

로컬은 `.env.local`, 배포는 **Vercel → Project → Settings → Environment Variables** 에 동일하게 설정합니다.

| 변수 | 출처 | 비고 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL | 브라우저 노출됨 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public | 브라우저 노출됨 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role | **비밀. 절대 `NEXT_PUBLIC_` 접두사 금지.** cron 라우트 전용 |
| `SLACK_WEBHOOK_URL` | Slack → Incoming Webhooks | 알림을 보낼 채널의 webhook |
| `CRON_SECRET` | 직접 생성 (예: `openssl rand -hex 32`) | cron 라우트의 `Authorization: Bearer` 검증값. Vercel Cron 이 자동으로 이 헤더를 붙여 보냄 |

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
CRON_SECRET=...
```

### 7. Cron

`vercel.json` 에 스케줄이 이미 정의되어 있습니다. 별도 설정 없이, 위 환경 변수(특히 `CRON_SECRET`, `SLACK_WEBHOOK_URL`, `SUPABASE_SERVICE_ROLE_KEY`)가 채워진 상태로 **Vercel 에 배포하는 순간부터** 동작합니다.

| 경로 | 스케줄 (UTC) | 내용 |
| --- | --- | --- |
| `/api/cron/contract-reminders` | `0 0 * * *` (매일) | 정규직 전환 평가일/발표일 D-N 리마인더 |
| `/api/cron/birthday-reminders` | `30 0 * * 1` (매주 월요일) | 이번 주 생일자 주간 다이제스트 |

두 라우트 모두 `notification_log` 에 먼저 기록하고 중복 발송을 막습니다 (계약 알림은 사원/날짜별, 생일 알림은 주 단위).

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

## 권한 모델

`lib/auth/permissions.ts` 한 곳에서 정의합니다.

| | admin | staff | viewer |
| --- | --- | --- | --- |
| 사원 조회 | ✅ | ✅ | ✅ |
| 사원 등록/수정 | ✅ | ✅ | ❌ |
| 급여대장 | ✅ | ✅ | ❌ |
| 증빙 조회 | ✅ | ✅ | ✅ |
| 증빙 업로드 | ✅ | ✅ | ❌ |
| 증빙 삭제 / 휴지통 | ✅ | ❌ | ❌ |
| 사용자 관리 | ✅ | ❌ | ❌ |

서버 페이지·라우트는 `lib/auth/current-user.ts` 의 `requireUser()` / `getCurrentUser()` 로 세션과 role 을 얻고, `permissions.*` 로 게이트합니다. DB 쪽은 `0002_rls.sql` 의 RLS 정책이 같은 규칙을 강제합니다.
