# 학원 숙제 플랫폼 MVP DB_SCHEMA

## 1) 설계 원칙
- Supabase Auth의 `auth.users`를 사용자 원천으로 사용
- 서비스 도메인 데이터는 `public` 스키마에 구성
- 모든 주요 테이블은 UUID PK + `created_at`, `updated_at` 유지
- 권한은 role + 소유권 기반 RLS로 제어

## 2) 테이블 설계

### 2.1 `profiles`
사용자 프로필 및 역할

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | uuid | PK, FK -> auth.users.id | 사용자 ID |
| role | text | not null, check in ('teacher','student') | 사용자 역할 |
| full_name | text | not null | 이름 |
| created_at | timestamptz | not null default now() | 생성 시각 |
| updated_at | timestamptz | not null default now() | 수정 시각 |

인덱스:
- `idx_profiles_role (role)`

---

### 2.2 `classes`
학급/반 정보

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | uuid | PK default gen_random_uuid() | 반 ID |
| name | text | not null | 반 이름 (예: 중2-영어A) |
| teacher_id | uuid | not null, FK -> profiles.id | 담임/담당 선생님 |
| created_at | timestamptz | not null default now() | 생성 시각 |
| updated_at | timestamptz | not null default now() | 수정 시각 |

인덱스:
- `idx_classes_teacher_id (teacher_id)`

---

### 2.3 `class_members`
반-학생 매핑 (다대다 대응 가능)

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | uuid | PK default gen_random_uuid() | 매핑 ID |
| class_id | uuid | not null, FK -> classes.id | 반 ID |
| student_id | uuid | not null, FK -> profiles.id | 학생 ID |
| created_at | timestamptz | not null default now() | 생성 시각 |

유니크:
- `(class_id, student_id)`

인덱스:
- `idx_class_members_class_id (class_id)`
- `idx_class_members_student_id (student_id)`

---

### 2.4 `assignments`
숙제 기본 정보

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | uuid | PK default gen_random_uuid() | 숙제 ID |
| teacher_id | uuid | not null, FK -> profiles.id | 등록 선생님 |
| class_id | uuid | not null, FK -> classes.id | 대상 반 |
| title | text | not null | 숙제 제목 |
| description | text | not null | 숙제 내용/지시사항 |
| due_at | timestamptz | not null | 마감 일시 |
| is_published | boolean | not null default true | 게시 여부 |
| created_at | timestamptz | not null default now() | 생성 시각 |
| updated_at | timestamptz | not null default now() | 수정 시각 |

인덱스:
- `idx_assignments_teacher_id (teacher_id)`
- `idx_assignments_class_id (class_id)`
- `idx_assignments_due_at (due_at)`

---

### 2.5 `submissions`
학생 숙제 제출 (학생-숙제 당 1건)

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | uuid | PK default gen_random_uuid() | 제출 ID |
| assignment_id | uuid | not null, FK -> assignments.id | 숙제 ID |
| student_id | uuid | not null, FK -> profiles.id | 제출 학생 |
| answer_text | text | not null | 제출 답안(텍스트) |
| submitted_at | timestamptz | not null default now() | 제출 시각 |
| created_at | timestamptz | not null default now() | 생성 시각 |
| updated_at | timestamptz | not null default now() | 수정 시각 |

유니크:
- `(assignment_id, student_id)`

인덱스:
- `idx_submissions_assignment_id (assignment_id)`
- `idx_submissions_student_id (student_id)`

---

### 2.6 `feedbacks`
선생님 피드백 (제출 1건당 0~1건)

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | uuid | PK default gen_random_uuid() | 피드백 ID |
| submission_id | uuid | not null, unique, FK -> submissions.id | 대상 제출 |
| teacher_id | uuid | not null, FK -> profiles.id | 작성 선생님 |
| content | text | not null | 피드백 본문 |
| created_at | timestamptz | not null default now() | 생성 시각 |
| updated_at | timestamptz | not null default now() | 수정 시각 |

인덱스:
- `idx_feedbacks_teacher_id (teacher_id)`

## 3) 관계 설명 (ER 요약)

- `profiles (teacher)` 1 --- N `classes`
- `classes` 1 --- N `assignments`
- `classes` N --- N `profiles (student)` via `class_members`
- `assignments` 1 --- N `submissions`
- `profiles (student)` 1 --- N `submissions`
- `submissions` 1 --- 0..1 `feedbacks`
- `profiles (teacher)` 1 --- N `feedbacks`

## 4) 상태 계산 규칙

MVP에서는 별도 status 컬럼 없이 계산:
- 학생 기준 숙제 상태
  - `submitted`: `submissions` 존재
  - `not_submitted`: `submissions` 없음 + `due_at` 이전/이후로 화면에서 구분 가능
- 선생님 제출 현황
  - 반 인원수(`class_members`) 대비 `submissions` count로 제출률 계산

## 5) 권한/RLS 초안

### 공통
- 로그인 사용자만 `public` 주요 테이블 접근 허용
- `profiles.id = auth.uid()` 매칭 기반 자기 식별

### teacher 정책
- `assignments`: 본인(`teacher_id = auth.uid()`)이 생성한 행만 CUD, 조회
- `submissions`: 본인이 만든 assignment에 연결된 submission만 조회
- `feedbacks`: 본인 assignment의 submission에 대해서만 CUD

### student 정책
- `assignments`: 본인이 속한 class의 assignment만 조회
- `submissions`: 본인(`student_id = auth.uid()`) 행만 CRUD
- `feedbacks`: 본인 submission에 연결된 피드백만 조회

## 6) 초기 마이그레이션 구현 팁
- `updated_at` 자동 갱신 트리거 함수 1개를 공통 사용
- `class_members`, `submissions`는 복합 유니크로 중복 방지
- `due_at` 기준 정렬/필터가 많으므로 인덱스 필수
