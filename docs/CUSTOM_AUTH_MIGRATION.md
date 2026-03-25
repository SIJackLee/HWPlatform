# CUSTOM_AUTH_MIGRATION

## 왜 구조를 바꿨는가
- Supabase Auth 이메일 가입에서 메일 rate limit/운영 의존이 발생
- 서비스 요구사항이 “운영자 사전 등록 계정 로그인”에 더 적합
- 기존 숙제 도메인(`assignments`, `assignment_targets`, `submissions`)은 유지하고 인증 경계만 변경

## 기존 방식 vs 새 방식
- 기존
  - 로그인: 이메일 + 비밀번호
  - 회원가입: `/signup` 공개
  - 세션: Supabase Auth 세션
  - 권한 기준: `auth.uid()` RLS 의존
- 새 방식
  - teacher: 로그인 아이디 + 비밀번호
  - student: 이름 + 전화번호 뒤4자리
  - 회원가입: 공개 비활성화(운영자 사전 등록)
  - 세션: `app_session` 서명 쿠키
  - 권한 기준: 서버 세션 + 서버 권한검증

## 수정 파일 목록
- 인증/세션
  - `actions/auth.ts`
  - `lib/auth/custom-session.ts`
  - `lib/auth/session.ts`
  - `lib/auth/password.ts`
  - `proxy.ts`
- DB/타입
  - `supabase/schema.sql`
  - `supabase/migrations/004_switch_to_custom_auth_sessions.sql`
  - `supabase/seeds/001_custom_auth_accounts.sql`
  - `types/database.ts`
  - `types/auth.ts`
- UI/권한
  - `components/auth/login-form.tsx`
  - `app/(auth)/login/page.tsx`
  - `app/(auth)/signup/page.tsx`
  - `actions/student.ts`
  - `actions/teacher.ts`
  - `lib/student/queries.ts`
  - `lib/teacher/queries.ts`

## 보안 포인트
- 평문 비밀번호 저장 금지(`password_hash`)
- 평문 전화번호 뒤4자리 저장 금지(`student_phone_last4_hash`)
- 해시 비교는 서버에서만 수행
- DB 접근은 서버 전용 service-role 클라이언트로만 수행
- 쿠키는 `httpOnly`, `sameSite=lax`, `secure(prod)` 설정
- role mismatch와 직접 URL 접근은 `proxy.ts`에서 차단

## 남은 리스크
- student 이름 + 뒤4자리 조합은 장기적으로 충돌 리스크 존재
- 운영자가 계정/해시를 잘못 등록하면 로그인 실패가 발생
- service-role 키/세션 시크릿 유출 시 영향이 크므로 운영 보안 통제가 필수
