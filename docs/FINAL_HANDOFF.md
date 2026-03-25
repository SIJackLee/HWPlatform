# FINAL_HANDOFF (Single Source of Truth)

## 1) 프로젝트 개요
- 서비스: 학원 숙제 플랫폼 MVP
- 현재 구현 기준:
  - teacher: 숙제 등록/조회, 제출 상세 조회, 피드백 저장
  - student: 숙제 조회, 답안 제출, 피드백 확인
- 기술: Next.js + Supabase + Vercel

## 2) 핵심 결정 (현재 코드 기준)
- 피드백 저장: **`submissions.feedback_text`**
- 과제 대상: **`assignment_targets` 대상 지정 모델**
- 대시보드 경로: **`/teacher/dashboard`, `/student/dashboard`**
- 인증: **커스텀 로그인 + 앱 세션(`app_session`)**

## 3) 현재 구현 기능
- 인증:
  - teacher: 로그인 아이디 + 비밀번호
  - student: 이름 + 전화번호 뒤 4자리
  - 로그아웃: 세션 쿠키 삭제
  - `/signup`: 비활성 안내 페이지
- teacher:
  - `/teacher/dashboard`
  - `/teacher/assignments`
  - `/teacher/assignments/new`
  - `/teacher/assignments/[assignmentId]`
  - `/teacher/assignments/[assignmentId]/submissions/[submissionId]`
- student:
  - `/student/dashboard`
  - `/student/assignments`
  - `/student/assignments/[assignmentId]`

## 4) 미구현/제약
- class 기반 대상 지정 없음(`classes`, `class_members` 미도입)
- 생성된 assignment의 대상 수정/재배포 UI 미구현
- student 로그인에서 동명이인 + 동일 last4 해시가 2개 이상 일치하면 안전 실패 처리

## 5) 폴더 구조 요약
```txt
app/(auth), app/teacher, app/student
actions/auth.ts, actions/teacher.ts, actions/student.ts
lib/supabase, lib/auth, lib/teacher, lib/student
types/*
supabase/schema.sql, supabase/migrations/*
docs/*
```

## 6) DB 핵심 요약
- `profiles`: 도메인 사용자(`name`, `role`, `is_active`)
- `account_credentials`: 로그인 자격 증명(해시 저장)
- `assignments`: teacher 숙제
- `assignment_targets`: assignment별 대상 student 매핑
- `submissions`: student 제출 + feedback_text

## 7) 권한 구조 요약
- `proxy.ts`: 세션 기반 경로 접근 제어(role 기반)
- 서버 권한 체크:
  - teacher: 본인 assignment 범위에서만 생성/피드백
  - student: 본인 target assignment 범위에서만 조회/제출
- 보안 경계:
  - DB 접근은 서버 전용(service-role) 클라이언트
  - 클라이언트는 세션 쿠키/민감정보 직접 해석 불가

## 8) 향후 확장 기준
- class 기반 모델 추가(`classes`, `class_members`)
- student 고유 로그인 코드(`student_code`) 도입
- assignment 대상 수정/일괄 관리 UI 추가
