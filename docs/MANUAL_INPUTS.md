# MANUAL_INPUTS

운영자가 직접 입력해야 하는 항목만 모았습니다.  
아래 체크리스트를 순서대로 완료하면 오픈 준비가 끝납니다.

## 수동 입력 체크리스트
- [ ] Supabase 프로젝트 URL 입력
- [ ] Supabase service role key 입력
- [ ] 앱 기본 URL 입력
- [ ] `APP_SESSION_SECRET` 입력
- [ ] GitHub 저장소/브랜치 연결
- [ ] Vercel 프로젝트 생성 및 env 등록
- [ ] Supabase SQL 적용
- [ ] 운영자(teacher) 계정/로그인 자격 등록
- [ ] student 계정/로그인 자격 등록
- [ ] 사이트 제목/설명/브랜딩 문구 확정
- [ ] Vercel Production/Preview env 분리 등록

---

## 1) Supabase URL
- 항목명: `NEXT_PUBLIC_SUPABASE_URL`
- 어디에 넣는가: `.env.local`, Vercel Environment Variables
- 예시값: `https://abcxyz.supabase.co`
- 왜 필요한가: 앱이 어느 Supabase 프로젝트와 통신할지 결정
- 입력 안 하면: 로그인/DB 조회가 전부 실패

## 2) Supabase service role key
- 항목명: `SUPABASE_SERVICE_ROLE_KEY`
- 어디에 넣는가: 서버 환경변수(Vercel), 필요 시 `.env.local`
- 예시값: `eyJ...`
- 왜 필요한가: 서버 전용 DB 접근/커스텀 인증 검증에 필요
- 입력 안 하면: 로그인/보호 쿼리 실패
- 주의: 절대 클라이언트 코드에 넣지 않음

## 3) 앱 URL
- 항목명: `NEXT_PUBLIC_APP_URL`
- 어디에 넣는가: `.env.local`, Vercel Environment Variables
- 예시값(local): `http://localhost:3000`
- 예시값(prod): `https://hw.example.com`
- 왜 필요한가: 리다이렉트/링크/운영 환경 기준값
- 입력 안 하면: 인증 리다이렉트 및 환경 구분 혼선

## 4) 세션 시크릿 키
- 항목명: `APP_SESSION_SECRET`
- 어디에 넣는가: `.env.local`, Vercel Environment Variables
- 예시값: `TODO: fill by operator` (32자 이상 랜덤 문자열)
- 왜 필요한가: `app_session` 서명/검증
- 입력 안 하면: 로그인 상태 유지 불가

## 5) Git 원격 저장소 연결
- 항목명: `origin`
- 어디에 넣는가: 로컬 git 설정
- 예시값: `https://github.com/SIJackLee/HWPlatform.git`
- 왜 필요한가: 배포 트리거와 코드 백업
- 입력 안 하면: CI/CD 및 협업 불가

## 6) Vercel 프로젝트 연결
- 항목명: Vercel Git Integration
- 어디에 넣는가: Vercel Dashboard
- 예시값: GitHub repo `SIJackLee/HWPlatform`
- 왜 필요한가: 자동 배포 파이프라인 구성
- 입력 안 하면: 수동 배포만 가능, 운영 안정성 저하

## 6-1) Vercel 환경변수 환경별 등록
- 항목명: Production / Preview env 분리
- 어디에 넣는가: Vercel Project -> Settings -> Environment Variables
- 예시값:
  - Production `NEXT_PUBLIC_SUPABASE_URL=https://prod-ref.supabase.co`
  - Preview `NEXT_PUBLIC_SUPABASE_URL=https://staging-ref.supabase.co`
- 왜 필요한가: 테스트 배포가 운영 DB를 오염시키는 사고 방지
- 입력 안 하면: Preview 테스트 중 운영 데이터 변경 가능

## 7) DB 초기 SQL 적용
- 항목명: `schema.sql` / migration 실행
- 어디에 넣는가: Supabase SQL Editor
- 예시값:
  - `supabase/schema.sql`
  - `supabase/migrations/001_add_teacher_feedback_to_submissions.sql`
  - `supabase/migrations/002_add_assignment_targets_and_limit_student_assignment_visibility.sql`
  - `supabase/migrations/004_switch_to_custom_auth_sessions.sql`
- 왜 필요한가: 테이블/RLS가 없으면 앱 기능 불가
- 입력 안 하면: 로그인 후 데이터 페이지 오류 발생

## 8) 운영자 계정 생성
- 항목명: teacher 계정 + 로그인 자격
- 어디에 넣는가: Supabase SQL (`profiles`, `account_credentials`)
- 예시값: `name=김선생`, `teacher_login_id=teacher01`, `password_hash=TODO`
- 왜 필요한가: 숙제 생성/피드백 운영 주체 필요
- 입력 안 하면: 서비스 운영 시작 불가

## 9) 초기 student 계정 생성
 - 항목명: student 계정 + 로그인 자격
 - 어디에 넣는가: Supabase SQL (`profiles`, `account_credentials`)
 - 예시값: `name=이학생`, `student_phone_last4_hash=TODO`
- 왜 필요한가: 제출/피드백 흐름 검증
- 입력 안 하면: 운영 전 점검 불가

## 10) 브랜딩 문구
- 항목명: 사이트 제목/설명
- 어디에 넣는가: `app/layout.tsx` metadata
- 예시값:
  - 제목: `OO학원 숙제 플랫폼`
  - 설명: `숙제 등록, 제출, 피드백을 한 번에 관리`
- 왜 필요한가: 운영 서비스 식별성/신뢰성
- 입력 안 하면: 기본/임시 문구 노출

## 11) 해시 생성 방식
- 항목명: teacher 비밀번호 / student 전화번호 뒤4자리 해시 생성
- 어디에 넣는가: 로컬 터미널
- 예시값:
  - `npm run hash:auth -- "teacher-password"`
  - `npm run hash:auth -- "1234"`
- 왜 필요한가: 평문 저장 없이 로그인 검증
- 입력 안 하면: 계정 등록 불가 또는 보안 취약

## 12) 현재 권한 정책 인지 확인
- 항목명: student assignment 조회 정책 확인
- 어디에 넣는가: 운영 정책 문서/내부 공지
- 예시값: "현재 MVP는 student가 assignment_targets로 지정된 과제만 조회 가능"
- 왜 필요한가: 운영자가 데이터 노출 범위를 정확히 알고 오픈 판단해야 함
- 입력 안 하면: 오픈 후 권한 기대치와 실제 동작 불일치 발생

---

## 최종 오픈 절차 (1~12)
1. 저장소 clone 후 `npm install`
2. `.env.local` 생성 및 필수 env 입력
3. Supabase 프로젝트 준비
4. `schema.sql` 실행
5. migration SQL 실행
6. 해시 생성 후 `profiles` + `account_credentials` 계정 등록
7. 로컬에서 `npm run dev` 실행
8. 핵심 시나리오 테스트(등록/제출/피드백)
9. `npm run lint` + `npm run build` 통과 확인
10. Vercel 프로젝트 생성 및 env 등록
11. production 배포 후 동일 시나리오 재검증
12. 운영 시작 선언 및 점검 체크리스트 일일 운영 적용
