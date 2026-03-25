# SCENARIO_B_IMPLEMENTATION

## 변경 목적
- student assignment 전체 조회 정책을 폐기하고, 본인 대상 assignment만 조회되도록 권한을 축소
- MVP 구조를 유지한 채 production 차단 이슈를 최소 변경으로 해소

## 수정 파일 목록
- SQL
  - `supabase/migrations/002_add_assignment_targets_and_limit_student_assignment_visibility.sql` (신규)
  - `supabase/schema.sql`
- 타입/로직
  - `types/database.ts`
  - `actions/teacher.ts`
  - `lib/teacher/queries.ts`
  - `lib/student/queries.ts`
- UI/페이지
  - `components/teacher/assignment-form.tsx`
  - `app/teacher/assignments/new/page.tsx`
  - `app/teacher/assignments/[assignmentId]/page.tsx`
  - `app/student/dashboard/page.tsx`
  - `app/student/assignments/page.tsx`
  - `app/student/assignments/[assignmentId]/page.tsx`
  - `components/student/assignment-list-table.tsx`
- 문서
  - `docs/DECISIONS.md`
  - `docs/FINAL_HANDOFF.md`
  - `docs/DB_SCHEMA.md`
  - `docs/API_FLOW.md`
  - `docs/OPEN_READY_STATUS.md`
  - `docs/GO_LIVE_DECISION.md`
  - `docs/GO_LIVE_RUNBOOK.md`
  - `docs/FINAL_OPEN_CHECKLIST.md`
  - `docs/TEST_SCENARIOS.md`
  - `docs/TROUBLESHOOTING.md`
  - `docs/PRODUCTION_PATHS.md`

## SQL 변경 요약
- `assignment_targets` 테이블 추가
  - 컬럼: `id`, `assignment_id`, `student_id`, `created_at`
  - 제약: FK 2개, unique(`assignment_id`, `student_id`)
  - 인덱스: `assignment_id`, `student_id`
- RLS 추가/변경
  - `assignment_targets`
    - teacher: 본인 assignment target 조회/삽입/삭제
    - student: 본인 target row 조회만 허용
  - `assignments`
    - student 전체 조회 정책 제거
    - student 대상 기반 조회 정책(`assignments_select_student_targeted`) 추가
  - `submissions`
    - student insert 시 target row 존재 검증 추가

## 쿼리 변경 요약
- teacher
  - assignment 생성 시 `assignments` + `assignment_targets` bulk insert
  - 대상 student 최소 1명 검증
  - assignment 상세에서 target/submitted/not submitted 계산
- student
  - 목록/대시보드는 `assignment_targets`를 기준으로 assignment 조회
  - 상세는 대상 여부 선검증 후 미대상일 때 404 처리

## UI 변경 요약
- teacher 숙제 생성 화면
  - student 체크박스 다중 선택 추가
  - 대상 미선택 시 생성 불가
- teacher 숙제 상세 화면
  - 대상 학생 수 / 제출 수 / 미제출 수 표시
  - 대상 학생 목록, 미제출 학생 목록 표시
- student 화면 문구
  - 전체 숙제 의미를 제거하고 “내게 할당된 숙제” 기준으로 정리

## 남은 리스크
- 운영자가 migration 002를 Production Supabase에 적용하지 않으면 권한 모델이 코드/문서와 불일치
- teacher 운영 과정에서 대상 선택 실수가 발생할 수 있으므로 운영 체크리스트 준수 필요
- Next 16의 `middleware` deprecation 경고는 추후 `proxy` 전환이 필요
