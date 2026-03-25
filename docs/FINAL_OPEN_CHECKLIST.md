# FINAL_OPEN_CHECKLIST

## 1) 개발자 체크
- [ ] `npm install` 완료
- [ ] `.env.local` 작성 완료(`TODO: fill by operator` 값 반영)
- [ ] `supabase/schema.sql` 적용 완료
- [ ] `supabase/migrations/001_add_teacher_feedback_to_submissions.sql` 적용 완료
- [ ] `supabase/migrations/002_add_assignment_targets_and_limit_student_assignment_visibility.sql` 적용 완료
- [ ] `supabase/migrations/004_switch_to_custom_auth_sessions.sql` 적용 완료
- [ ] `npm run lint` 통과
- [ ] `npm run build` 통과
- [ ] `/teacher`, `/student` redirect 정상
- [ ] 피드백 저장이 `submissions.feedback_text`로 반영됨
- [ ] student assignment 조회가 본인 target만으로 제한됨
- [ ] `proxy.ts` 기반 role 보호 경로 동작 확인

## 2) 운영자 체크
- [ ] Vercel Preview env 등록 완료
- [ ] Vercel Production env 등록 완료
- [ ] GitHub 배포 브랜치 확인 완료
- [ ] teacher 계정 + 해시 자격 등록 완료
- [ ] student 계정 + 해시 자격 등록 완료
- [ ] `APP_SESSION_SECRET` 운영/개발 분리 설정 완료
- [ ] teacher 숙제 생성 시 대상 student 선택 절차 숙지

## 3) 오픈 직후 체크
- [ ] `/login` 정상 접속
- [ ] teacher 로그인 -> `/teacher/dashboard` 이동
- [ ] student 로그인 -> `/student/dashboard` 이동
- [ ] teacher 과제 생성 성공
- [ ] teacher 과제 생성 시 대상 학생 선택 성공
- [ ] 대상 student 계정에서만 assignment 노출 확인
- [ ] 비대상 student URL 직접 접근 차단 확인
- [ ] 대상 student 제출 성공
- [ ] teacher 피드백 저장 성공
- [ ] 대상 student 피드백 확인 성공
- [ ] 비로그인 보호경로 접근 시 `/login` 리다이렉트
- [ ] 권한 반대 경로 접근 시 role 대시보드로 리다이렉트
