# SETUP_GUIDE

## 시작 전에 준비할 것 (직접 준비 항목)
- GitHub 계정
- Vercel 계정
- Supabase 계정
- 로컬 Node.js 20 이상
- 아래 값 4개
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_APP_URL`
  - `APP_SESSION_SECRET`

## 로컬 실행 방법
1. 저장소 클론
```bash
git clone https://github.com/SIJackLee/HWPlatform.git
cd HWPlatform
```
2. 패키지 설치
```bash
npm install
```
3. 환경변수 파일 생성
```bash
cp .env.local.example .env.local
```
Windows PowerShell:
```powershell
Copy-Item .env.local.example .env.local
```
4. `.env.local` 값 입력(실제 Supabase 프로젝트 값)
5. 개발 서버 실행
```bash
npm run dev
```
6. 접속: `http://localhost:3000`

## Supabase 프로젝트 생성 및 연결 (클릭 순서)
1. [Supabase Dashboard](https://supabase.com/dashboard) 로그인
2. 우측 상단 `New project` 클릭
3. `Organization` 선택 -> `Project name` 입력 -> `Database Password` 입력 -> `Region` 선택 -> `Create new project`
4. 프로젝트 생성 완료 후 좌측 메뉴 `Project Settings` 클릭
5. `API` 탭 클릭
6. 아래 값 복사
   - `Project URL` -> `.env.local`의 `NEXT_PUBLIC_SUPABASE_URL`
   - `Project API keys > service_role` -> `.env.local`의 `SUPABASE_SERVICE_ROLE_KEY`
7. `.env.local`에 저장 후 개발 서버 재시작

## 세션 키 설정
1. `.env.local`에 `APP_SESSION_SECRET` 추가
2. 32자 이상 랜덤 문자열 사용
3. 운영/개발 환경 키 분리

## 패키지 설치 방법
- 기본 패키지는 `package.json` 기준으로 `npm install` 1회 실행
- 추가 패키지 설치가 필요하면:
```bash
npm install <package-name>
```

## 개발 서버 실행 방법
- 개발: `npm run dev`
- 빌드 검증: `npm run build`
- 린트: `npm run lint`

## Supabase 연결 방법 (현재 구현 기준)
1. `Project Settings -> API`에서
   - `Project URL`
   - `service_role key`
   를 복사
2. `.env.local`에 입력
3. 앱 재시작

## Git clone 이후 최초 실행 순서
1. `git clone`
2. `npm install`
3. `.env.local` 생성
4. Supabase SQL 적용(아래 순서)
   - `supabase/schema.sql`
   - `supabase/migrations/001_add_teacher_feedback_to_submissions.sql`
   - `supabase/migrations/002_add_assignment_targets_and_limit_student_assignment_visibility.sql`
   - `supabase/migrations/004_switch_to_custom_auth_sessions.sql`
5. (선택) seed 적용
6. `npm run dev`
7. 운영자 사전 등록 계정으로 로그인 테스트

## DB schema 적용 방법
1. Supabase Dashboard 좌측 메뉴 `SQL Editor` 클릭
2. `New query` 클릭
3. `supabase/schema.sql` 내용 전체 붙여넣기
4. `Run` 클릭
3. 성공 확인(테이블 생성/RLS 적용)
4. 다시 `New query` 클릭
5. `supabase/migrations/001_add_teacher_feedback_to_submissions.sql` 붙여넣기 후 `Run`
6. `supabase/migrations/002_add_assignment_targets_and_limit_student_assignment_visibility.sql` 붙여넣기 후 `Run`
7. `supabase/migrations/004_switch_to_custom_auth_sessions.sql` 붙여넣기 후 `Run`
8. `submissions`에 `feedback_text`, `feedback_updated_at` 컬럼 생성 확인
9. `account_credentials` 테이블 생성 확인

## seed 데이터 적용 방법
- `supabase/seeds/001_custom_auth_accounts.sql` 사용
- 해시는 `npm run hash:auth -- <plain-text>`로 생성 후 치환
- 운영 환경에서는 테스트 seed를 넣지 않는 것을 권장

## 최초 계정 생성 방법 (클릭 순서)
1. Supabase SQL Editor에서 `profiles` + `account_credentials`에 계정 등록
2. 앱 실행 후 `http://localhost:3000/login` 접속
3. teacher: 로그인 유형 `teacher`, 로그인 아이디/비밀번호 입력
4. student: 로그인 유형 `student`, 이름/전화번호 뒤 4자리 입력
5. teacher 로그인 후 숙제 1건 생성(대상 지정)
6. student 로그인 후 제출 1건 생성
7. teacher 피드백 작성 후 student 확인

## 주의사항
- `SUPABASE_SERVICE_ROLE_KEY`는 절대 클라이언트 코드에서 사용 금지
- `.env.local`은 git 커밋 금지
- `APP_SESSION_SECRET`이 짧거나 유출되면 세션 위조 위험
- 서버 서비스키 사용 구조이므로 권한 검증은 반드시 서버 로직 기준으로 유지
- 현재 구현은 student가 본인 대상 assignment만 조회 가능(`assignment_targets` 기반)
- 배포 전 `npm run lint`와 `npm run build`를 반드시 통과시킬 것
