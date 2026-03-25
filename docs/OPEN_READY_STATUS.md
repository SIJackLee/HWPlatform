# OPEN_READY_STATUS

## 판정
- 로컬 테스트 가능: **예**
- 프리뷰 배포 가능: **예**
- 실운영 가능: **조건부 예** (운영 수동 설정 완료 전제)

## 오픈 불가(현재 기준) 체크리스트
- [ ] Supabase에 `002_add_assignment_targets_and_limit_student_assignment_visibility.sql` 적용
- [ ] Supabase에 `004_switch_to_custom_auth_sessions.sql` 적용
- [ ] Vercel/Supabase env 및 URL 설정 완료
- [ ] 운영자 계정(`profiles` + `account_credentials`) 등록 완료
- [ ] Production smoke test 전체 통과

## 왜 아니오인가
1) 코드 기준으로는 build/lint가 통과했고 권한 축소도 반영됨.  
2) 다만 운영 환경에 SQL migration/환경변수/URL 설정이 누락되면 실제 배포 동작이 실패할 수 있다.

## 오픈 가능 조건 (최소)
1. `npm run lint`, `npm run build` 성공
2. Supabase migration 001 + 002 적용
3. Supabase migration 004(custom auth) 적용
4. Vercel Production env(`SUPABASE_SERVICE_ROLE_KEY`, `APP_SESSION_SECRET`) 설정 완료
5. 운영자 계정 사전 등록 완료
6. 오픈 직후 smoke test 전체 성공

## 현재 즉시 가능한 범위
- 내부 데모
- 파일럿 테스트
- 제한된 사용자 그룹 PoC
- Production 오픈 리허설(체크리스트 기반)
