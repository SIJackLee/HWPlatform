# ENV_GUIDE

## 사용되는 환경변수 전체 목록
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (서버 전용, 필수)
- `NEXT_PUBLIC_APP_URL`
- `APP_SESSION_SECRET` (서버 전용, 필수)

## 각 환경변수의 의미
- `NEXT_PUBLIC_SUPABASE_URL`
  - Supabase 프로젝트 URL
  - 예: `https://abcxyz.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY`
  - 서버 관리자 권한 키(강력 권한)
  - 커스텀 인증 + 서버 DB 접근에 필수
  - 절대 브라우저 코드/클라이언트 번들/로그에 출력 금지
- `NEXT_PUBLIC_APP_URL`
  - 앱의 기본 URL(로컬/운영 환경 구분)
- `APP_SESSION_SECRET`
  - 서명 쿠키(`app_session`) 검증용 비밀키
  - 32자 이상 랜덤 문자열 권장

## 내가 직접 채워야 하는 값
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_APP_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_SESSION_SECRET`

## 절대 git에 올리면 안 되는 값
- 실제 `SUPABASE_SERVICE_ROLE_KEY`
- 내부 운영 계정 비밀번호/토큰
- 운영용 `APP_SESSION_SECRET`
- `.env.local` 파일 전체

## .env.local.example 예시
```env
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
APP_SESSION_SECRET=
```

## local / production 차이
- local
  - `NEXT_PUBLIC_APP_URL=http://localhost:3000`
  - 개발용 `APP_SESSION_SECRET` 별도 사용
- production
  - `NEXT_PUBLIC_APP_URL=https://<your-domain>`
  - 운영용 Supabase 프로젝트 URL/service-role 키 사용
  - 운영용 `APP_SESSION_SECRET` 필수
  - Vercel Project Settings에 동일 변수 등록 필요

## 권장 관리 방식
- 로컬: `.env.local`
- 팀 공유: `.env.local.example` (값 없이 변수명만)
- 운영: Vercel Environment Variables에서만 관리

## 실제 입력 순서
1. 프로젝트 루트에서 `.env.local.example` 복사 -> `.env.local`
2. `.env.local` 파일 열기
3. 아래 순서로 값 입력
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL`
   - `APP_SESSION_SECRET`
4. 파일 저장
5. `npm run dev` 재실행
