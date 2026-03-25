# OPEN_AUDIT

기준 문서: `DECISIONS.md`, `FINAL_HANDOFF.md`, `SETUP_GUIDE.md`, `ENV_GUIDE.md`, `MANUAL_INPUTS.md`, `DEPLOY_GUIDE.md`, `TEST_SCENARIOS.md`, `TROUBLESHOOTING.md`, `OPEN_READY_STATUS.md`

## 1) 검증 항목별 결과

| 검증 항목 | 코드 기준 실제 상태 | docs와 일치 여부 | 수정 필요 여부 |
|---|---|---|---|
| 라우팅 기준 | `/teacher/dashboard`, `/student/dashboard`가 실대시보드. `/teacher`, `/student`는 redirect | 일치 | 아니오 |
| 피드백 저장 구조 | `actions/teacher.ts`에서 `submissions.feedback_text`, `submissions.feedback_updated_at` update | 일치 | 아니오 |
| student assignment 조회 정책 | `lib/student/queries.ts`에서 `assignment_targets` 기반 조회로 제한 | 일치 | 아니오 |
| middleware role 접근 제어 | 비로그인 차단 + role mismatch redirect 구현 | 일치 | 아니오 |
| Supabase schema/migration 파일명 | `supabase/schema.sql`, `001_add_teacher_feedback_to_submissions.sql`, `002_add_assignment_targets_and_limit_student_assignment_visibility.sql`, `003_create_profile_on_auth_signup.sql` | 일치 | 아니오 |

## 2) 추가 점검 결과 (오픈 관점)

| 점검 항목 | 코드 기준 실제 상태 | docs 반영 여부 | 수정 필요 여부 |
|---|---|---|---|
| 프로덕션 빌드 | `npm run build` 성공(타입 오류 해소) | 반영됨 | 아니오 |
| middleware 경고 | Next 16에서 `middleware` deprecated 경고(동작은 가능) | 반영됨 | 아니오 |
| student 대상 제한 조회 | `assignment_targets` 정책으로 제한 | 반영됨 | 아니오 |

## 3) 코드 기준 상세 근거
- 라우팅: `app/teacher/page.tsx`, `app/student/page.tsx`, `middleware.ts`
- 피드백 저장: `actions/teacher.ts`, `supabase/migrations/001_add_teacher_feedback_to_submissions.sql`
- student 조회 범위: `lib/student/queries.ts`, `supabase/schema.sql`의 `assignments_select_student_targeted`
- schema/migration 파일명: `supabase/schema.sql`, `supabase/migrations/001_add_teacher_feedback_to_submissions.sql`, `supabase/migrations/002_add_assignment_targets_and_limit_student_assignment_visibility.sql`, `supabase/migrations/003_create_profile_on_auth_signup.sql`

## 4) 최종 판단
- 단일 기준(DECISIONS)은 현재 코드와 일치한다.
- 기술적 빌드 차단은 해소되었고, 조회 권한 축소도 반영되었다.
