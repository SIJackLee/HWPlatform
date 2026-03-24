# 학원 숙제 플랫폼 MVP API_FLOW

## 1) 전체 데이터 흐름

1. 사용자가 로그인하면 Supabase Auth 세션 발급
2. 앱 서버(Next.js)에서 세션 + `profiles.role` 확인
3. role에 따라 `teacher/*` 또는 `student/*` 페이지 접근
4. 각 페이지는 서버 컴포넌트/서버 액션에서 Supabase 호출
5. DB는 RLS 정책으로 최종 접근 제어

## 2) 페이지별 DB 작업

## 2.1 Teacher

### `/teacher` (대시보드)
- Read:
  - `assignments`(본인 teacher_id) 최근/진행 중 목록
  - `class_members` count(반별 인원)
  - `submissions` count(숙제별 제출 수)
- 계산:
  - 숙제별 제출률 = submissions / class_members

### `/teacher/assignments` (숙제 목록)
- Read:
  - `assignments` where `teacher_id = auth.uid()`
- 정렬:
  - `due_at asc` 또는 `created_at desc`

### `/teacher/assignments/new` (숙제 생성)
- Read:
  - `classes` where `teacher_id = auth.uid()` (선택 가능한 반 조회)
- Write:
  - `assignments` insert
- 검증:
  - 제목/설명 빈값 금지
  - `due_at` 현재 시각 이후

### `/teacher/assignments/[assignmentId]` (숙제 상세 + 제출현황)
- Read:
  - `assignments` 단건
  - 대상 반 학생 목록: `class_members + profiles`
  - 제출 목록: `submissions` where `assignment_id = :assignmentId`
- 계산:
  - 학생 목록과 제출 목록 비교하여 미제출자 계산

### `/teacher/assignments/[assignmentId]/submissions/[submissionId]` (제출 상세 + 피드백)
- Read:
  - `submissions` 단건
  - `feedbacks` by `submission_id`
- Write:
  - `feedbacks` upsert(없으면 insert, 있으면 update)

---

## 2.2 Student

### `/student` (대시보드)
- Read:
  - 본인 소속 반의 `assignments`
  - 본인 `submissions`
- 계산:
  - 미제출 수: assignments - submissions
  - 마감 임박: `due_at` 기준 N일 이내

### `/student/assignments` (내 숙제 목록)
- Read:
  - 본인 반의 `assignments`
  - 본인 `submissions` left join 형태로 제출 여부 표시
- 필터:
  - 전체 / 미제출 / 제출완료

### `/student/assignments/[assignmentId]` (숙제 상세 + 제출)
- Read:
  - `assignments` 단건(접근 가능 반인지 검증)
  - 본인 `submissions` existing row
  - 연결된 `feedbacks`(있을 경우)
- Write:
  - `submissions` upsert by `(assignment_id, student_id)`
- 규칙:
  - 마감 후 수정 허용 여부는 MVP에서 "허용 안 함" 권장
  - 답안 텍스트 최소 길이 검증(예: 10자 이상)

### `/student/feedbacks` (피드백 목록)
- Read:
  - 본인 `submissions` + `feedbacks` 조인
  - 최신 순 정렬(`feedbacks.updated_at desc`)

## 3) 인증/권한 흐름

## 3.1 인증
- 로그인: Supabase Auth
- 로그아웃: Supabase 세션 삭제
- 서버에서 매 요청 시 세션 유효성 체크

## 3.2 인가(Authorization)
- 앱 레벨:
  - `profiles.role` 조회 후 라우트 접근 제한
  - role 불일치 시 해당 role 홈으로 리다이렉트
- DB 레벨:
  - RLS로 소유권/역할 기반 접근 통제
  - 클라이언트에서 임의 파라미터 조작해도 차단

## 4) 권장 API 구현 패턴 (Next.js + Supabase)

### 서버 컴포넌트 조회
- 초기 렌더 데이터는 서버 컴포넌트에서 조회
- 장점: 보안(서비스 키 불필요), SEO/성능 개선

### 서버 액션 또는 Route Handler 쓰기
- 생성/수정/삭제는 서버 액션 우선
- 트랜잭션 성격이 필요한 경우 RPC(Postgres function) 고려

### 에러 처리 규칙
- 권한 에러: 403 메시지 + 안전한 리다이렉트
- 데이터 없음: 404 처리
- 유효성 실패: 필드별 에러 메시지 반환

## 5) 핵심 쿼리 예시(개념)

1) 학생 숙제 목록
- 기준: `class_members.student_id = auth.uid()`
- 결과: 해당 class의 assignments + 본인 submission 유무

2) 선생님 제출 현황
- 기준: `assignments.teacher_id = auth.uid()`
- 결과: assignment별 대상 학생 수, 제출 수, 미제출 수

3) 피드백 조회
- 학생: 본인 submission의 feedback만 조회
- 선생님: 본인 assignment에 연결된 submission의 feedback 조회

## 6) 이벤트 순서도 (요약)

### 숙제 등록
1) teacher가 입력 폼 제출
2) 서버 액션 검증
3) `assignments` insert
4) 성공 후 상세 페이지 이동

### 숙제 제출
1) student가 답안 제출
2) 서버 액션에서 접근/마감 검증
3) `submissions` upsert
4) 목록/상세에 제출 완료 반영

### 피드백 작성
1) teacher가 제출 상세에서 피드백 저장
2) `feedbacks` upsert
3) student 피드백 목록에 반영
