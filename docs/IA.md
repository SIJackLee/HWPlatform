# 학원 숙제 플랫폼 MVP IA

## 1) 페이지 구조

### 공통
- 로그인 페이지
- 권한 분기(teacher/student) 라우트 가드
- 404 페이지

### Teacher 영역
- 대시보드: 전체 숙제 수, 진행 중 숙제 수, 제출률 요약
- 숙제 목록 페이지
- 숙제 생성 페이지
- 숙제 상세 페이지
  - 기본 정보
  - 제출 현황 탭
  - 학생별 제출 상세/피드백 입력

### Student 영역
- 대시보드: 미제출 숙제, 마감 임박 숙제
- 내 숙제 목록 페이지
- 숙제 상세 페이지
  - 숙제 내용
  - 답안 입력/수정
  - 피드백 확인
- 내 피드백 목록 페이지(선택: MVP 포함 권장)

## 2) 라우팅 구조 (Next.js App Router)

```txt
app/
  (public)/
    login/page.tsx
  (protected)/
    layout.tsx
    teacher/
      page.tsx                       # teacher dashboard
      assignments/
        page.tsx                     # 목록
        new/page.tsx                 # 생성
        [assignmentId]/
          page.tsx                   # 숙제 상세 + 제출 현황
          submissions/
            [submissionId]/page.tsx  # 제출 상세 + 피드백
    student/
      page.tsx                       # student dashboard
      assignments/
        page.tsx                     # 내 숙제 목록
        [assignmentId]/page.tsx      # 숙제 상세 + 제출
      feedbacks/
        page.tsx                     # 내 피드백 목록
  not-found.tsx
```

## 3) 내비게이션 구조

### Teacher 사이드바
- 대시보드
- 숙제 목록
- 숙제 생성

### Student 사이드바
- 대시보드
- 내 숙제
- 피드백

## 4) 사용자별 접근 페이지

### 비로그인 사용자
- 접근 가능: `/login`
- 접근 불가: `/teacher/*`, `/student/*`

### teacher
- 접근 가능:
  - `/teacher`
  - `/teacher/assignments`
  - `/teacher/assignments/new`
  - `/teacher/assignments/[assignmentId]`
  - `/teacher/assignments/[assignmentId]/submissions/[submissionId]`
- 접근 불가:
  - `/student/*`

### student
- 접근 가능:
  - `/student`
  - `/student/assignments`
  - `/student/assignments/[assignmentId]`
  - `/student/feedbacks`
- 접근 불가:
  - `/teacher/*`

## 5) 페이지별 핵심 UI 컴포넌트 (shadcn/ui 기준)

- 목록: `Table`, `Badge`, `Tabs`, `Pagination`
- 입력: `Form`, `Input`, `Textarea`, `Select`, `DatePicker(커스텀)`
- 액션: `Button`, `Dialog`(확인/삭제), `Toast`
- 상세: `Card`, `Separator`, `Accordion`

## 6) 접근 제어 방식

- 서버 컴포넌트 레벨에서 세션 확인
- role 미일치 시 각 역할 홈으로 리다이렉트
- 데이터 조회/수정은 Supabase RLS로 2차 보호

## 7) URL 설계 원칙

- 리소스 중심 RESTful 경로 사용
- 식별자는 UUID 사용(`assignmentId`, `submissionId`)
- 상세 페이지는 서버 컴포넌트로 초기 데이터 페치, 폼 액션은 서버 액션/route handler 사용
