# API_FLOW (현재 구현 기준)

## 현재 구현 기준

## 1) 인증/권한 흐름
1. 운영자가 `profiles`, `account_credentials`를 사전 등록
2. `/login`에서 로그인 유형 선택
   - teacher: 로그인 아이디 + 비밀번호
   - student: 이름 + 전화번호 뒤 4자리
3. 서버 액션이 `account_credentials` 해시 검증
4. 로그인 성공 시 서명 쿠키 `app_session` 발급
5. `proxy.ts`가 role 기반 route 접근 제어
   - teacher -> `/teacher/*`
   - student -> `/student/*`
6. 서버 컴포넌트/서버 액션이 세션 `profile_id` 기준으로 데이터 접근 제어

## 2) Teacher 데이터 흐름

### `/teacher/dashboard`
- Read:
  - 본인 assignment 목록
  - 해당 assignment들의 submission count
- 표시:
  - 총 숙제 수
  - 총 제출 수
  - 최근 숙제

### `/teacher/assignments`
- Read:
  - `assignments where teacher_id = session.profile_id`

### `/teacher/assignments/new`
- Write:
  - `assignments insert`
  - `assignment_targets bulk insert` (선택한 student 목록)
- 검증:
  - 대상 student 최소 1명 선택 필수
  - teacher 세션 사용자인지 검증

### `/teacher/assignments/[assignmentId]`
- Read:
  - assignment 단건
  - assignment target 목록(`assignment_targets + profiles`)
  - 해당 assignment의 submissions + student 이름
- 계산:
  - target count
  - submitted count (target 기준)
  - not submitted count / 미제출자 목록(`assignment_targets - submissions`)

### `/teacher/assignments/[assignmentId]/submissions/[submissionId]`
- Read:
  - submission 단건
- Write:
  - `submissions.feedback_text`, `submissions.feedback_updated_at` update
  - 업데이트 전 assignment 소유권(teacher_id) 검증

## 3) Student 데이터 흐름

### `/student/dashboard`
- Read:
  - 본인 대상 assignment(`assignment_targets.student_id = session.profile_id`)
  - 본인 submissions
- 계산:
  - 진행중/제출완료/피드백 수

### `/student/assignments`
- Read:
  - 본인 대상 assignment만
  - 본인 submissions
- 표시:
  - 진행중/제출완료 분리

### `/student/assignments/[assignmentId]`
- Read:
  - assignment target 존재 여부 확인
  - assignment 단건(대상일 때만)
  - 본인 submission 단건(`student_id = session.profile_id`)
- Write:
  - `submissions upsert (assignment_id, student_id = session.profile_id)`
- 예외:
  - 본인 대상이 아닌 assignment URL 직접 접근 시 404 처리

## 4) 현재 운영 리스크
- 기능 리스크:
  - assignment 생성 시 대상 student를 선택하지 않으면 생성 불가(운영자/teacher 안내 필요)
- 인증 리스크:
  - student 로그인은 동명이인 충돌 가능성이 있음(동일 이름 + 동일 last4 해시 일치 시 안전 실패)

## 향후 확장 기준
- class 기반 운영 모델(`classes`, `class_members`) 확장
- student 고유 코드(`student_code`) 로그인 방식 전환
- assignment 대상 수정/재할당 UI 추가
