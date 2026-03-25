# DB_SCHEMA (현재 구현 기준)

## 현재 구현 기준

### 핵심 테이블
1. `profiles`
- 도메인 사용자 테이블
- `id`, `name`, `role`(`teacher`/`student`), `is_active`, `created_at`, `updated_at`

2. `account_credentials`
- 커스텀 인증 전용 테이블
- `profile_id`(FK, unique), `role`
- `teacher_login_id`(teacher 전용, unique)
- `password_hash`(teacher 비밀번호 해시)
- `student_phone_last4_hash`(student 전화번호 뒤 4자리 해시)
- `is_active`, `created_at`, `updated_at`

3. `assignments`
- teacher가 생성하는 숙제
- `teacher_id`, `title`, `description`, `due_at`, `created_at`, `updated_at`

4. `assignment_targets`
- assignment별 대상 student 매핑
- `assignment_id`, `student_id`, `created_at`
- 유니크: `unique (assignment_id, student_id)`

5. `submissions`
- student 제출 데이터
- `assignment_id`, `student_id`, `answer_text`, `submitted_at`, `created_at`, `updated_at`
- 피드백 저장은 **`submissions` 컬럼** 사용
  - `feedback_text`
  - `feedback_updated_at`

### 현재 구현에서 사용하지 않는 모델
- `classes`, `class_members`, `feedbacks` 테이블은 **현재 코드/SQL 기준 미사용**

## 인덱스 요약
- `idx_profiles_role`
- `idx_profiles_name`
- `idx_account_credentials_role`
- `idx_account_credentials_teacher_login_id`
- `idx_assignments_teacher_id`
- `idx_assignments_due_at`
- `idx_assignment_targets_assignment_id`
- `idx_assignment_targets_student_id`
- `idx_submissions_assignment_id`
- `idx_submissions_student_id`
- `idx_submissions_submitted_at`
- `idx_submissions_feedback_updated_at`

## FK/유니크 요약
- `account_credentials.profile_id -> profiles.id`
- `assignments.teacher_id -> profiles.id`
- `assignment_targets.assignment_id -> assignments.id`
- `assignment_targets.student_id -> profiles.id`
- `submissions.assignment_id -> assignments.id`
- `submissions.student_id -> profiles.id`
- `unique (assignment_id, student_id)` in `assignment_targets`
- `unique (assignment_id, student_id)` in `submissions`

## RLS 요약 (현재)
- 현재 운영 경계는 **RLS 중심이 아니라 앱 세션 + 서버 권한체크** 중심
- `account_credentials`는 일반 클라이언트 접근 금지(서버 전용)
- `assignments`, `assignment_targets`, `submissions`는 서버에서 세션 `profile_id`를 주입해 필터링
- 기존 RLS 정책은 호환 목적으로 남아있지만 핵심 보안 경계는 서버 로직

## 운영 판단 메모
- student assignment 조회 범위가 대상 기반으로 축소되어 데이터 범위 리스크는 완화됨
- 운영자는 계정 등록(`profiles` + `account_credentials`)을 사전에 수행해야 함
- student 동명이인 + 동일 last4 입력 충돌 시 로그인 안전 실패로 처리됨

## 향후 확장 기준
- class 기반 운영 모델(`classes`, `class_members`) 확장
- student 고유 식별자(`student_code`) 로그인 도입
- assignment 생성 후 대상 수정/재배포 관리 기능 추가
