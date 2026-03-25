# DEPLOY_GUIDE

## GitHub + Vercel 배포 절차
1. GitHub 저장소 준비
   - `origin`: `https://github.com/SIJackLee/HWPlatform.git`
2. [Vercel Dashboard](https://vercel.com/dashboard) 로그인
3. 좌측 상단 `Add New...` -> `Project` 클릭
4. `Import Git Repository`에서 `SIJackLee/HWPlatform` 선택
5. `Framework Preset`이 `Next.js`인지 확인
6. `Environment Variables` 섹션에서 아래 값 입력
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (운영 도메인)
   - `APP_SESSION_SECRET`
7. `Deploy` 클릭
8. 배포 완료 후 생성된 도메인 접속

## Vercel 환경별 변수 등록 (중요)
- `Production`: 운영 Supabase 값
- `Preview`: 스테이징/테스트 Supabase 값
- `Development`: 로컬 참고용 값(선택)
- 주의: Preview에 Production DB 값을 넣지 말 것

## 배포 전 체크리스트
- [ ] `npm run lint` 통과
- [ ] `npm run build` 통과
- [ ] Supabase schema/migration 적용 완료
- [ ] 운영용 env 값 준비 완료
- [ ] 로그인(teacher/student)/권한 차단 핵심 흐름 로컬 확인

## Supabase production 연결 체크
- 운영 Supabase 프로젝트에서 아래 확인
  - `profiles`, `account_credentials`, `assignments`, `assignment_targets`, `submissions` 테이블 생성
  - migration(`feedback_text`, `feedback_updated_at`, `custom_auth`) 적용
  - 운영자 계정 사전 등록 완료
- Vercel env가 운영 Supabase 값인지 재확인

## GitHub에서 수동으로 해야 하는 작업
1. 저장소 `Settings` -> `Branches`
2. 기본 배포 브랜치 확인(권장: `main`)
3. (권장) `Branch protection rule` 추가
   - `Require a pull request before merging` 활성화
   - `Require status checks` 활성화

## Vercel 환경변수 등록 항목
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `APP_SESSION_SECRET`

## 최초 배포 후 점검 항목
1. `/login` 접속 정상 여부
2. teacher 로그인 성공 여부(로그인 아이디 + 비밀번호)
3. student 로그인 성공 여부(이름 + 전화번호 뒤 4자리)
4. 로그인 후 role별 대시보드 리다이렉트 확인
5. teacher 과제 생성/상세 확인
6. student 제출/피드백 확인
7. 권한 없는 경로 접근 차단 확인
8. 동명이인 충돌 시 안전 실패 확인

## 배포 실패 시 확인할 부분
- Build Logs
  - 타입 에러/린트 에러 여부
- Environment Variables
  - 누락/오탈자 여부
- Supabase
  - URL/키 프로젝트 불일치 여부
  - SQL 미적용 여부
- Next.js proxy
  - 인증 루프(로그인 리다이렉트 반복) 여부
