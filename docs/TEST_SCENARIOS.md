# TEST_SCENARIOS

## 테스트 목적
- 커스텀 인증 전환 후 기존 학습 도메인 기능이 정상 동작하는지 검증
- role/대상 제한/직접 URL 접근 차단이 유지되는지 검증

## 공통 사전 조건
- `schema.sql`, `001`, `002`, `004` migration 적용 완료
- `profiles` + `account_credentials`에 teacher/student 계정 사전 등록 완료
- `.env.local`에 `SUPABASE_SERVICE_ROLE_KEY`, `APP_SESSION_SECRET` 포함
- 앱 실행 중(`npm run dev` 또는 배포 URL)

## 필수 시나리오 1: teacher 로그인 성공
1. `/login` 접속
2. 로그인 유형 `teacher` 선택
3. 로그인 아이디 + 비밀번호 입력 후 로그인
4. `/teacher/dashboard` 이동 확인

## 필수 시나리오 2: student 로그인 성공
1. `/login` 접속
2. 로그인 유형 `student` 선택
3. 이름 + 전화번호 뒤4자리 입력 후 로그인
4. `/student/dashboard` 이동 확인

## 필수 시나리오 3: 잘못된 teacher 비밀번호 실패
1. teacher 로그인 아이디는 정확히 입력
2. 비밀번호를 틀리게 입력
3. “비밀번호가 올바르지 않습니다” 확인

## 필수 시나리오 4: 잘못된 student 전화번호 뒤4자리 실패
1. student 이름은 정확히 입력
2. 뒤4자리를 틀리게 입력
3. “계정을 찾을 수 없습니다” 확인

## 필수 시나리오 5: 비로그인 보호 경로 차단
1. 로그아웃 상태로 `/teacher/dashboard` 직접 접근
2. 로그아웃 상태로 `/student/dashboard` 직접 접근
3. 둘 다 `/login`으로 이동 확인

## 필수 시나리오 6: role mismatch 차단
1. teacher 로그인 후 `/student/dashboard` 접근
2. student 로그인 후 `/teacher/dashboard` 접근
3. 각자 본인 대시보드로 안전 리다이렉트 확인

## 필수 시나리오 7: student는 본인 대상 과제만 조회
1. teacher가 특정 assignment를 student A/B에만 할당
2. student A 로그인 -> assignment 보임
3. student C 로그인 -> assignment 안 보임

## 필수 시나리오 8: 직접 URL 접근 차단
1. student C가 `/student/assignments/{assignmentId}` 직접 입력
2. 404 또는 안전 차단 확인

## 필수 시나리오 9: 핵심 업무 플로우
1. teacher 과제 생성(대상 student 지정)
2. 대상 student 제출
3. teacher 피드백 작성
4. 대상 student 피드백 확인
5. teacher 상세에서 target/submitted/not submitted 계산 확인

## 필수 시나리오 10: 로그아웃 후 보호 경로 차단
1. teacher 또는 student 로그인
2. 로그아웃 수행
3. 이전 보호 경로 새로고침/직접 접근 시 `/login` 이동 확인

## 동명이인 충돌 테스트 (추가)
1. 동일 이름 student 2명 준비
2. 동일한 뒤4자리 해시를 두 계정에 등록
3. student 로그인 시 “동명이인 계정이 있어 운영자 확인이 필요합니다” 확인

## 실패 원인 공통 체크
- 계정 사전 등록 누락(`profiles`/`account_credentials`)
- 해시값 잘못 등록(plain text 저장 포함)
- `APP_SESSION_SECRET` 누락/불일치
- `assignment_targets` row 누락
- 브라우저의 오래된 쿠키 세션
