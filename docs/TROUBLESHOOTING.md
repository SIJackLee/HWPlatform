# TROUBLESHOOTING

## 1) Supabase 연결 오류
증상:
- 로그인/조회 시 네트워크 에러
- `Missing env: NEXT_PUBLIC_SUPABASE_URL` 메시지

확인:
1. `.env.local` 값 입력 여부
2. URL 형식(`https://...supabase.co`) 정확성
3. 앱 재시작 여부

해결:
- env 수정 후 `npm run dev` 재실행

---

## 2) 인증 오류
증상:
- 로그인 실패 반복
- teacher/student 로그인이 모두 실패

확인:
1. `profiles` + `account_credentials` 계정 등록 여부
2. teacher는 `teacher_login_id`, `password_hash` 등록 여부
3. student는 `name`, `student_phone_last4_hash` 등록 여부
4. `APP_SESSION_SECRET` 설정 여부

해결:
- 계정/해시 재등록
- 잘못된 해시(평문 저장 포함) 교정
- 세션 시크릿 확인 후 서버 재시작

---

## 3) RLS 권한 오류
증상:
- 조회/저장 시 permission denied

확인:
1. `schema.sql` 정책 적용 여부
2. migration 정책 적용 여부
3. 사용자 role 값 정확성
4. 서버 권한 체크 로직(`getAuthState`, actions) 누락 여부

해결:
- SQL Editor에서 정책 재적용
- `profiles.role` 값 교정
- `assignment_targets` row 존재 여부 확인(대상 미지정이면 student 조회 불가가 정상)
- 서버 액션에 소유권 검증(teacher_id/student_id) 추가 확인

---

## 4) 환경변수 누락 오류
증상:
- 앱 시작 직후 서버 에러

확인:
- `.env.local`에 필수 키 4개가 있는지 확인
- `.env.local`에 필수 키 5개가 있는지 확인
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_APP_URL`
  - `APP_SESSION_SECRET`

해결:
- `.env.local.example`를 복사해 누락 항목 채움

---

## 5) 빌드 오류
증상:
- Vercel/로컬 `npm run build` 실패

확인:
1. `npm run lint` 통과 여부
2. 타입 에러 여부
3. 경로 import 오탈자 여부

해결:
- 로컬에서 먼저 `npm run build` 통과 후 배포

---

## 6) Vercel 배포 오류
증상:
- 배포 실패 또는 배포 후 500

확인:
1. Vercel env 누락/오탈자
2. 브랜치 최신 반영 여부
3. Supabase 프로젝트 접근 가능 여부
4. Vercel `Functions` 로그에서 runtime error 확인

해결:
- 환경변수 재등록 후 재배포
- 실패 커밋 직전/직후 변경점 비교
- Supabase migration 002 적용 여부 재확인

---

## 7) 페이지 접근 권한 오류
증상:
- teacher/student 페이지 진입 불가
- 잘못된 페이지로 계속 리다이렉트
- student가 특정 assignment 상세 URL에 접근 시 404

확인:
1. `proxy.ts` 동작 여부
2. `profiles.role` 값 확인
3. 세션 만료 여부

해결:
- 로그아웃 후 재로그인
- `profiles` role 값 수정
- 쿠키 초기화 후 재시도
- `/teacher`, `/student`는 redirect 경로이며 실대시보드는 `/teacher/dashboard`, `/student/dashboard`
- student 상세 404의 경우 `assignment_targets`에서 해당 `assignment_id`, `student_id` row를 확인

---

## 8) 장애 시 최소 확인 포인트 (5분 점검)
1. Vercel Dashboard -> `Deployments` -> 최근 배포 상태 확인
2. Vercel Dashboard -> `Functions` -> 최근 에러 로그 확인
3. Supabase Dashboard -> `Table Editor` -> `profiles`/`account_credentials` 상태 확인
4. Supabase Dashboard -> `SQL Editor`에서 간단 조회 쿼리 실행
5. 환경변수 4개(`URL`, `SERVICE_ROLE_KEY`, `APP_URL`, `APP_SESSION_SECRET`) 오탈자 재확인
6. `assignment_targets` 대상 row가 실제 생성되었는지 확인

---

## 9) assignment 생성은 됐는데 student에게 안 보임
증상:
- teacher는 assignment를 생성했는데 student 목록/상세에서 안 보임

확인:
1. `/teacher/assignments/new`에서 대상 학생 체크 여부
2. `assignment_targets`에 해당 assignment/student row 존재 여부
3. 대상 student 계정이 `profiles.role = 'student'`인지

해결:
- teacher가 대상을 체크해서 assignment를 다시 생성
- 필요 시 SQL로 누락된 target row 수동 삽입
