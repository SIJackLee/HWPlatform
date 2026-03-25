# PRD (현재 구현 기준)

## 프로젝트 목표
- teacher가 숙제를 등록하고 대상 student를 지정
- student가 본인 대상 숙제만 조회하고 텍스트 답안을 제출
- teacher가 제출 답안에 피드백 작성
- student가 피드백 확인

## 현재 구현 범위
- 인증
  - 공개 회원가입 제거(운영자 사전 등록 계정만 로그인)
  - teacher 로그인: `로그인 아이디 + 비밀번호`
  - student 로그인: `이름 + 전화번호 뒤 4자리`
  - 앱 자체 서명 쿠키 세션(`app_session`)
- teacher
  - 대시보드
  - 숙제 생성/목록/상세
  - 대상 student 선택
  - 제출 상세 조회 및 피드백 저장
- student
  - 대시보드
  - 내 숙제 목록/상세
  - 답안 제출/재제출
  - teacher 피드백 확인

## 현재 구현에서 제외된 항목
- 반/클래스 기반 배포(`classes`, `class_members`)
- assignment 생성 후 대상 수정/재배포 UI
- 별도 `feedbacks` 테이블

## 핵심 제약 (현재)
1. 피드백 저장 구조
- `submissions.feedback_text`, `submissions.feedback_updated_at` 사용

2. 과제 대상 구조
- `assignment_targets` 기반 대상 지정
- student는 본인 target assignment만 조회

3. 인증 구조
- Supabase Auth 이메일 회원가입/로그인 미사용
- 계정은 운영자가 DB에 사전 등록

4. 라우팅 기준
- `/teacher/dashboard`, `/student/dashboard` 유지

## 운영 관점 판정
- 로컬/프리뷰 테스트: 가능
- 실운영: 조건부 가능(운영자 계정 등록 절차 + smoke test 통과 전제)

## 향후 확장 기준
- 동명이인 리스크 완화를 위한 `student_code` 도입
- assignment 대상 수정/재배포 기능 추가
- 관리자 운영 UI 추가
