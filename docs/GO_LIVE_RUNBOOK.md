# GO_LIVE_RUNBOOK

## 1. 오픈 전 준비물
- GitHub 계정
- Supabase 계정
- Vercel 계정
- Node.js 20 이상
- 필수 env 변수
  - `NEXT_PUBLIC_SUPABASE_URL=TODO: fill by operator`
  - `NEXT_PUBLIC_APP_URL=TODO: fill by operator`
  - `SUPABASE_SERVICE_ROLE_KEY=TODO: fill by operator`
  - `APP_SESSION_SECRET=TODO: fill by operator`

## 2. 로컬 점검 절차
1) 저장소 가져오기
```bash
git clone https://github.com/SIJackLee/HWPlatform.git
cd HWPlatform
npm install
```
2) env 작성
```bash
cp .env.local.example .env.local
```
`.env.local`에 운영자가 값 입력

3) Supabase SQL 적용
- Supabase Dashboard -> `SQL Editor` -> `New query`
- `supabase/schema.sql` 붙여넣기 -> `Run`
- 다시 `New query`
- `supabase/migrations/001_add_teacher_feedback_to_submissions.sql` 붙여넣기 -> `Run`
- 다시 `New query`
- `supabase/migrations/002_add_assignment_targets_and_limit_student_assignment_visibility.sql` 붙여넣기 -> `Run`
- 다시 `New query`
- `supabase/migrations/004_switch_to_custom_auth_sessions.sql` 붙여넣기 -> `Run`

4) 로컬 실행
```bash
npm run dev
```
접속: `http://localhost:3000/login`

5) 운영자 계정 등록 및 흐름 확인
- `npm run hash:auth -- "teacher 비밀번호"` 실행 후 hash 확보
- `npm run hash:auth -- "학생전화뒤4자리"` 실행 후 hash 확보
- `profiles` + `account_credentials`에 teacher/student 계정 삽입
- teacher로 숙제 생성(대상 student 체크박스 선택 필수)
- student로 제출
- teacher로 피드백
- student로 피드백 확인

## 3. 프리뷰 배포 절차
1) GitHub push
```bash
git add .
git commit -m "chore: pre-go-live docs and audit"
git push origin <branch>
```
2) Vercel Preview 생성
- Vercel -> Project -> Deployments -> Preview 확인
3) Preview env 등록 확인
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `APP_SESSION_SECRET`
4) Preview 기능 테스트
- 로그인(teacher/student)
- 권한 리다이렉트
- teacher 과제 등록(대상 학생 선택)
- 대상 학생은 과제 노출, 비대상 학생은 미노출 확인
- student 제출/teacher 피드백/student 피드백 확인

## 4. 프로덕션 오픈 절차
1) Production env 등록
- Vercel -> Settings -> Environment Variables -> Production
2) 운영자 계정/자격정보 등록 확인
- `profiles` + `account_credentials` 레코드 점검
3) Vercel Production 배포
- `main` 머지 후 자동 배포 또는 수동 Promote
4) 오픈 직후 smoke test 수행

## 5. 오픈 직후 smoke test
- [ ] `/login` 접속
- [ ] teacher 로그인(아이디+비밀번호)
- [ ] student 로그인(이름+전화번호 뒤4자리)
- [ ] dashboard 리다이렉트(`/teacher/dashboard`, `/student/dashboard`)
- [ ] teacher 과제 생성 시 대상 학생 선택
- [ ] 대상 학생만 assignment 조회 가능
- [ ] 비대상 학생 URL 직접 접근 시 차단(404)
- [ ] 대상 학생 제출
- [ ] teacher 피드백 저장(`submissions.feedback_text`)
- [ ] 대상 학생 피드백 확인
- [ ] 권한 없는 경로 차단(`/teacher/*`, `/student/*`)
- [ ] 동명이인 충돌 계정은 안전 실패되는지 확인

## 6. 롤백/중지 기준
다음 중 하나라도 발생하면 오픈 중지:
- `npm run build` 실패 상태
- 로그인 실패(teacher/student)
- role 리다이렉트 실패
- DB write 실패(숙제 생성/제출/피드백 중 1개라도)
- 권한 누수 확인(비대상 student assignment 접근)

Preview로 되돌리는 기준:
- Production smoke test 1개라도 실패
- 운영 데이터 오염 가능성 확인

Production 공개 보류 조건:
- `002` migration 미적용
- `004` migration 미적용
- 운영자 계정/해시 자격정보 미등록
- env 설정(`SUPABASE_SERVICE_ROLE_KEY`, `APP_SESSION_SECRET`) 미완료
