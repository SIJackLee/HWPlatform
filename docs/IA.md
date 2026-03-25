# IA (현재 구현 기준)

## 현재 구현 기준

### 라우팅 기준
- 대시보드 기준 경로는 **`/teacher/dashboard`, `/student/dashboard`**
- `/teacher`, `/student`는 dashboard로 리다이렉트만 수행

### 실제 페이지 구조
```txt
app/
  (auth)/
    login/page.tsx
    signup/page.tsx
  teacher/
    page.tsx -> /teacher/dashboard redirect
    dashboard/page.tsx
    assignments/page.tsx
    assignments/new/page.tsx
    assignments/[assignmentId]/page.tsx
    assignments/[assignmentId]/submissions/[submissionId]/page.tsx
  student/
    page.tsx -> /student/dashboard redirect
    dashboard/page.tsx
    assignments/page.tsx
    assignments/[assignmentId]/page.tsx
```

### 내비게이션
- Teacher: 대시보드, 숙제 목록
- Student: 대시보드, 내 숙제

### 접근 제어
- 비로그인: `/teacher/*`, `/student/*` 접근 시 `/login`
- teacher가 `/student/*` 접근: `/teacher/dashboard` 리다이렉트
- student가 `/teacher/*` 접근: `/student/dashboard` 리다이렉트

## 향후 확장 기준
- `student/feedbacks` 전용 페이지 추가 가능
- 관리자 운영 페이지 추가 가능
