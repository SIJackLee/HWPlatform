# DECISIONS (문서 단일 기준)

문서 충돌 정리를 위해 아래를 최종 결정으로 고정한다.

## 1) 피드백 저장 구조
- 선택: `submissions.feedback_text`, `submissions.feedback_updated_at`
- 비선택: 별도 `feedbacks` 테이블 방식

## 2) 과제 대상 모델
- 선택: `assignment_targets` 기반 대상 지정 모델
- 비선택: `classes`, `class_members` 기반 모델

## 3) 라우팅 기준
- 선택: `/teacher/dashboard`, `/student/dashboard`
- 보조: `/teacher`, `/student`는 dashboard redirect

## 4) 학생 assignment 조회 권한
- 선택: student는 `assignment_targets.student_id = session.profile_id`로 연결된 assignment만 조회 가능
- 운영 판단: student 조회 범위 축소 완료(정식 오픈 기준 충족 방향)

## 5) 인증/세션 기준
- 선택: 커스텀 로그인 + `app_session` 서명 쿠키
- teacher: 로그인 아이디 + 비밀번호(해시 비교)
- student: 이름 + 전화번호 뒤4자리(해시 비교, 동명이인 충돌 시 안전 실패)
- 비선택: Supabase Auth 이메일 회원가입/로그인

## 6) Teacher assignment 생성 규칙
- teacher는 `/teacher/assignments/new`에서 대상 student를 1명 이상 선택해야 생성 가능
- 생성 시 `assignments` insert 후 `assignment_targets` bulk insert 수행

## 7) 제출 현황 계산 규칙
- 대상 수: `assignment_targets` row 수
- 제출 수: 대상 학생 중 제출한 학생 수
- 미제출 수: 대상 수 - 제출 수
- 미제출자 목록: `assignment_targets - submissions`

## 8) 문서 작성 원칙
- 이상적 설계 대신 현재 코드/SQL 상태만 기록
- 향후 확장 내용은 별도 섹션으로 분리
