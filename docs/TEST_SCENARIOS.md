# TEST_SCENARIOS

## 테스트 목적
- 반/초대코드 기반 guest 입장 흐름이 정상 동작하는지 검증
- guest 제출 upsert(재제출=수정) 및 선생 제출 현황 집계가 맞는지 검증

## 공통 사전 조건
- `007_guest_invite_class_flow.sql`까지 migration 적용 완료
- teacher 계정(`profiles` + `account_credentials(role=teacher)`) 사전 등록 완료
- `.env.local`에 `SUPABASE_SERVICE_ROLE_KEY`, `APP_SESSION_SECRET` 포함
- 앱 실행 중(`npm run dev` 또는 배포 URL)

## 필수 시나리오 1: teacher 로그인 성공
1. `/login` 접속
2. teacher 로그인 아이디 + 비밀번호 입력 후 로그인
4. `/teacher/dashboard` 이동 확인

## 필수 시나리오 2: 반 생성 및 초대코드 발급
1. `/teacher/classes` 접속
2. 반 이름 입력 후 생성
3. 반 상세에서 `초대코드 재발급` 클릭
4. 새 초대코드 표시 확인(기본 7일 만료)

## 필수 시나리오 3: 학생 guest 입장 성공
1. `/join` 접속
2. 초대코드 + 이름 + 숫자4자리 입력
3. `/student/dashboard` 이동 확인
4. `/student/assignments`에서 해당 반 숙제 목록 확인

## 필수 시나리오 4: 동일 이름 + 다른 PIN 차단
1. 같은 반에서 먼저 `홍길동 + 1234`로 입장
2. 다른 브라우저에서 `홍길동 + 9999`로 입장 시도
3. 충돌 에러 메시지 확인

## 필수 시나리오 5: 재접속 복구
1. 다른 브라우저/기기에서 동일 초대코드 + 동일 이름 + 동일 PIN4로 입장
2. 기존 guest 제출자 식별자로 접속되는지 확인(기존 제출 내역 유지)

## 필수 시나리오 6: 숙제 생성(반 스코프)
1. `/teacher/classes/{classId}/assignments/new`에서 숙제 생성
2. 생성 후 `/teacher/assignments/{assignmentId}` 이동 확인
3. 상세에서 반 등록 학생 수/제출 수/미제출 수 표시 확인

## 필수 시나리오 7: 제출 upsert(재제출=수정)
1. 학생이 답안 제출
2. 동일 학생이 같은 숙제 재제출
3. `submissions`가 1건으로 유지되는지 확인(`assignment_id, guest_student_id` 유니크)
4. `submitted_at`이 최신 시각으로 갱신되는지 확인

## 필수 시나리오 8: 선생 제출 현황 확인
1. `/teacher/assignments`에서 제출/미제출 집계 확인
2. `/teacher/assignments/{assignmentId}`에서 제출 목록/미제출 목록 확인
3. 제출 상세에서 학생 이름이 guest 기준으로 표시되는지 확인

## 필수 시나리오 9: 초대코드 만료/폐기 처리
1. 만료된 코드로 `/join` 시도 -> 차단 확인
2. 반 상세에서 코드 폐기 후 해당 코드 재사용 시도 -> 차단 확인

## 필수 시나리오 10: 로그아웃 후 보호 경로 차단
1. teacher 또는 guest 입장 상태
2. 로그아웃 수행
3. teacher 보호 경로는 `/login`, student 보호 경로는 `/join`으로 이동 확인

## 실패 원인 공통 체크
- teacher 계정 사전 등록 누락
- 초대코드 해시/만료값 저장 오류
- guest_students 중복키(`class_id,name_norm,pin4_hmac`) 충돌 처리 누락
- `APP_SESSION_SECRET` 누락/불일치
- 브라우저의 오래된 쿠키 세션
