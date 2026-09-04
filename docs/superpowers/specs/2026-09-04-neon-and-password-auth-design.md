# Supabase 제거: Neon + 비밀번호 로그인 + Vercel Blob

작성일: 2026-09-04

## 배경

앱은 Supabase 하나에 Postgres, Auth, Storage를 모두 의존하고 있다. 운영 주체가
바뀌면서 인프라를 Vercel 쪽으로 모으기로 했고, 데이터베이스는 Vercel Storage가
제공하는 Neon을 쓴다. 동시에 구글 OAuth를 걷어내고 단일 비밀번호 로그인으로
바꾼다. 사용자는 한 명이다.

이전 시점의 DB에는 보존할 데이터가 없다 — 사원 0명, 증빙 0건. 마이그레이션이
아니라 신규 구축이다.

### 현재 결합도 (실측)

| 항목 | 규모 |
|---|---|
| Supabase를 import하는 파일 | 29개 |
| 쿼리 호출 지점 (`.from(...)`) | 34곳 |
| 인증 호출 지점 | 4곳 (`proxy.ts` 포함) |
| Storage 버킷 | `documents`, `payroll` |
| RLS 정책 | 마이그레이션 10개에 분산 |

## 목표

1. Supabase 의존을 완전히 제거한다.
2. 데이터베이스를 Neon으로 옮긴다.
3. 구글 OAuth를 단일 비밀번호 로그인으로 대체한다.
4. 파일 저장을 Vercel Blob으로 옮기되 반드시 비공개로 둔다.

## 비목표

- 기능 추가. 화면과 동작은 그대로 두고 기반만 바꾼다.
- 데이터 이관. 옮길 데이터가 없다.
- 파일 다운로드 경로 신설. 아래 "확인된 사실" 참고.

## 확인된 사실

구현 전에 검증한 것들이다. 추측이 아니다.

- **`@vercel/blob` 2.8.0은 `access: 'private'`를 지원하고, `access`는 필수
  인자다.** 타입 정의(`package/dist/create-folder-*.d.ts`)에서 확인했다. 실수로
  public이 될 수 없다는 뜻이라 급여대장을 담기에 적합하다.
- **앱에는 파일 다운로드 경로가 없다.** `file_path`는 업로드 시 기록되지만
  읽는 곳이 어디에도 없다 (`grep`으로 확인). 따라서 이번 이전에서 Blob은 쓰기만
  맞추면 되고, 읽기 경로는 나중에 필요해질 때 세션 검사를 붙인 라우트 핸들러로
  만든다.

## 결정과 그 대가

### 단일 공용 비밀번호

`APP_PASSWORD` 환경변수와 직접 비교한다. 해시하지 않는다 — `1234`는 해시해도
즉시 역산되므로 해싱이 안전을 더하지 않고 코드만 늘린다. 비밀번호를 저장소가
아닌 환경변수에 두는 것이 실질적인 방어선이다.

**대가:** URL과 비밀번호를 아는 사람은 급여대장과 손익을 전부 본다. 사용자가
한 명이라는 전제 위에서만 성립한다. 두 번째 사용자가 생기는 순간 계정별
비밀번호로 돌아와야 한다. 이 전제는 코드 주석과 README에 남긴다.

### 역할 체계 제거

`profiles`, `invitations`, `user_role` enum, `permissions.ts`, `route-guard.ts`,
`invitations.ts`를 모두 삭제한다. 사용자가 한 명이고 전권을 가지므로 역할이
표현할 것이 없다.

**대가:** 권한 분리가 사라진다. 되돌리려면 스키마와 30여 곳의 게이트를 다시
넣어야 한다.

### RLS 제거

Neon에 단일 앱 role로 붙으므로 DB 차원의 정책이 의미가 없다.

**대가:** 지금은 앱이 권한을 검사하고 DB가 한 번 더 막는다. 이전 후에는
`proxy.ts`의 세션 검사가 유일한 관문이다. 세션 검사를 우회하는 라우트가 하나라도
생기면 그대로 열린다. 새 라우트를 추가할 때 이 점을 기억해야 한다.

### 마이그레이션 통합

기존 마이그레이션 10개를 `db/schema.sql` 하나로 합친다. 보존할 데이터가 없어
증분 이력이 아무 일도 하지 않는다. Neon 콘솔에 한 번 붙여넣으면 끝난다.

**대가:** 마이그레이션 이력이 사라진다. 이후로는 다시 append-only 파일로
쌓는다 (`db/migrations/0001_*.sql`부터).

## 아키텍처

### 인증

```
lib/auth/session.ts     서명·검증 (순수 함수, 의존성 없음)
lib/auth/actions.ts     signIn / signOut 서버 액션
app/login/              비밀번호 폼
proxy.ts                쿠키 검증 → 없으면 /login
```

세션 쿠키 값은 `<만료시각ms>.<HMAC-SHA256>`이다. 서명 키는 `SESSION_SECRET`.
검증은 `crypto.timingSafeEqual`로 비교하고 만료를 확인한다. 유효기간 30일.
쿠키는 `HttpOnly`, `SameSite=Lax`, 프로덕션에서 `Secure`.

세션에 사용자 식별자는 없다. 담을 것이 없기 때문이다 — 쿠키의 존재 자체가
"비밀번호를 알고 있다"는 유일한 사실이다.

### 데이터 접근

```
lib/db/sql.ts           neon() 태그드 템플릿 하나
db/schema.sql           통합 스키마
```

`@neondatabase/serverless`의 태그드 템플릿을 쓴다. 값이 파라미터로 바인딩되어
SQL 인젝션이 구조적으로 막힌다. 문자열 연결로 쿼리를 만드는 코드는 두지 않는다.

34곳의 PostgREST 체인을 SQL로 옮긴다. 조인이 필요한 곳(`departments(name)`,
`franchise_stores(name)`)은 명시적 `left join`이 된다.

### 파일 저장

```
lib/storage/blob.ts     put 래퍼, access: 'private' 고정
```

버킷 대신 경로 접두사(`documents/`, `payroll/`)로 구분한다.

## 스키마 변경

기존 대비 빠지는 것:

- 테이블 `profiles`, `invitations`
- 타입 `user_role`
- 컬럼 `employees.created_by`, `documents.uploaded_by`, `payroll_records.uploaded_by`
- 함수 `current_user_role()`, `accept_invitation()`
- RLS 정책 전부

나머지 테이블(`departments`, `employees`, `payroll_records`, `documents`,
`franchise_stores`, `notification_log`)은 컬럼 구성을 그대로 유지한다.

## 딸려오는 화면 변화

- `buildNavItems(role)` → `buildNavItems()`. 필터링이 없어지고 메뉴 5개가 항상 보인다.
- 사이드바 하단에서 이메일과 역할 배지가 사라지고 테마 토글·로그아웃만 남는다.
- `permissions.canX()`로 감싸던 버튼·링크가 전부 항상 렌더링된다.

## 테스트

- 삭제: `lib/auth/permissions.test.ts`, `lib/auth/route-guard.test.ts` (대상 코드와 함께)
- 재작성: `lib/nav/items.test.ts` (역할 인자 소멸)
- 신규: `lib/auth/session.test.ts` — 서명·검증 왕복, 위조된 서명 거부, 만료 거부,
  잘못된 형식 거부
- 영향 없음: 엑셀 파서/내보내기, 알림, 손익, 계약일 계산

DB와 Blob은 외부 서비스라 이 프로젝트의 `environment: 'node'` 스위트에서 검증할
수 없다. 검증은 `tsc` / `lint` / `build`와 실제 배포 후 육안 확인이다.

## 환경변수

| 변수 | 출처 |
|---|---|
| `DATABASE_URL` | Vercel → Storage → Neon 연결 시 자동 주입 |
| `BLOB_READ_WRITE_TOKEN` | Vercel → Storage → Blob 연결 시 자동 주입 |
| `APP_PASSWORD` | 직접 설정 |
| `SESSION_SECRET` | `openssl rand -hex 32` |
| `SLACK_WEBHOOK_URL` | 기존과 동일 |
| `CRON_SECRET` | 기존과 동일 |

`NEXT_PUBLIC_SUPABASE_*`와 `SUPABASE_SERVICE_ROLE_KEY`는 제거한다.

## 작업 순서

기존 코드가 깨진 채로 오래 머무르지 않도록 새 기반을 먼저 세우고 옮긴 뒤
지운다.

1. 세션 인증 (TDD)
2. DB 접근 계층 + `db/schema.sql`
3. Blob 저장 계층
4. 쿼리 34곳 이전 (도메인별로)
5. 인증 경로 교체 (`proxy.ts`, `/login`, 로그아웃)
6. 역할 체계와 Supabase 잔재 삭제
7. README 런북 재작성
