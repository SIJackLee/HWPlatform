# OPEN_MANUAL_TODO

아래는 운영자가 직접 수행해야 하는 작업만 정리한 체크리스트다.  
민감값은 절대 문서에 실제값을 쓰지 말고, 로컬 `.env.local` 또는 Vercel env에만 입력한다.

## 1. Supabase 프로젝트 생성
1) 작업명: Supabase 프로젝트 생성  
2) 어디서 하는가: Supabase Dashboard  
3) 내가 직접 입력해야 하는 값:
- `TODO: fill by operator - Project name`
- `TODO: fill by operator - Database password`
- `TODO: fill by operator - Region`
4) 완료 확인 방법:
- Dashboard에 새 프로젝트가 생성되고 상태가 Active
5) 안 하면 생기는 문제:
- DB/Auth API 자체가 없어 앱 연결 불가

## 2. Supabase API URL/anon key 확인
1) 작업명: API 연결값 확보  
2) 어디서 하는가: Supabase Dashboard -> Project Settings -> API  
3) 내가 직접 입력해야 하는 값:
- `NEXT_PUBLIC_SUPABASE_URL=TODO: fill by operator`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=TODO: fill by operator`
4) 완료 확인 방법:
- `.env.local`과 Vercel env에 동일 키가 등록됨
5) 안 하면 생기는 문제:
- 로그인/데이터 조회 실패

## 3. .env.local 작성
1) 작업명: 로컬 환경변수 입력  
2) 어디서 하는가: 로컬 프로젝트 루트  
3) 내가 직접 입력해야 하는 값:
- `NEXT_PUBLIC_SUPABASE_URL=TODO: fill by operator`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=TODO: fill by operator`
- `NEXT_PUBLIC_APP_URL=TODO: fill by operator`
- `SUPABASE_SERVICE_ROLE_KEY=TODO: fill by operator (optional)`
4) 완료 확인 방법:
- `npm run dev` 후 `/login` 페이지 정상 로딩
5) 안 하면 생기는 문제:
- 앱 시작 직후 env 오류 발생

## 4. Vercel env 등록
1) 작업명: Vercel 환경변수 등록  
2) 어디서 하는가: Vercel -> Project -> Settings -> Environment Variables  
3) 내가 직접 입력해야 하는 값:
- `NEXT_PUBLIC_SUPABASE_URL=TODO: fill by operator`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=TODO: fill by operator`
- `NEXT_PUBLIC_APP_URL=TODO: fill by operator`
- `SUPABASE_SERVICE_ROLE_KEY=TODO: fill by operator (optional)`
4) 완료 확인 방법:
- 배포 로그에서 env 누락 오류 없음
5) 안 하면 생기는 문제:
- Preview/Production 배포 실패 또는 런타임 오류

## 5. Supabase SQL 적용
1) 작업명: 스키마/마이그레이션 적용  
2) 어디서 하는가: Supabase -> SQL Editor  
3) 내가 직접 입력해야 하는 값:
- 실행 파일 경로만 지정:
  - `supabase/schema.sql`
  - `supabase/migrations/001_add_teacher_feedback_to_submissions.sql`
4) 완료 확인 방법:
- `profiles`, `assignments`, `submissions` 테이블 생성
- `submissions.feedback_text` 컬럼 존재
5) 안 하면 생기는 문제:
- 회원가입 후 동작 불가, 피드백 저장 실패

## 6. Auth Site URL / Redirect URLs 설정
1) 작업명: 인증 리다이렉트 URL 설정  
2) 어디서 하는가: Supabase -> Authentication -> URL Configuration  
3) 내가 직접 입력해야 하는 값:
- `Site URL=TODO: fill by operator`
- Redirect URL 목록:
  - `TODO: fill by operator - local url`
  - `TODO: fill by operator - production url`
4) 완료 확인 방법:
- 로그인/회원가입 후 올바른 도메인으로 이동
5) 안 하면 생기는 문제:
- 인증 실패/리다이렉트 루프

## 7. GitHub 저장소 연결
1) 작업명: 원격 저장소 및 배포 브랜치 확인  
2) 어디서 하는가: 로컬 git + GitHub repo settings  
3) 내가 직접 입력해야 하는 값:
- `origin=TODO: fill by operator`
- 배포 브랜치(`main` 등) 선택
4) 완료 확인 방법:
- push 후 GitHub에 커밋 반영
5) 안 하면 생기는 문제:
- Vercel 자동 배포 트리거 불가

## 8. teacher/student 초기 계정 생성
1) 작업명: 운영 테스트 계정 준비  
2) 어디서 하는가: 앱 `/signup`  
3) 내가 직접 입력해야 하는 값:
- teacher 계정 이메일/비밀번호
- student 계정 이메일/비밀번호
- 각 role 선택
4) 완료 확인 방법:
- teacher는 `/teacher/dashboard`, student는 `/student/dashboard` 이동
5) 안 하면 생기는 문제:
- 기능 테스트 및 초기 운영 시작 불가

## 9. 브랜딩/앱 URL 입력
1) 작업명: 운영 기본 문구/URL 확정  
2) 어디서 하는가:
- 코드: `app/layout.tsx` (title/description)
- env: `.env.local`, Vercel
3) 내가 직접 입력해야 하는 값:
- `TODO: fill by operator - 서비스명`
- `TODO: fill by operator - 서비스 설명`
- `NEXT_PUBLIC_APP_URL=TODO: fill by operator`
4) 완료 확인 방법:
- 브라우저 탭 제목/설명이 의도대로 노출
5) 안 하면 생기는 문제:
- 임시 문구 노출, 운영 신뢰도 저하
