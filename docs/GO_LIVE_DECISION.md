# GO_LIVE_DECISION

## 판정
- Local: **가능**
- Preview: **가능**
- Production: **조건부 가능**

## 판정 근거
- `npm run build` 성공으로 배포 기술 차단 이슈 해소
- student assignment 조회 권한이 `assignment_targets` 기반으로 축소됨
- Local/Preview는 즉시 가능, Production은 운영 수동 설정 완료 시 가능

## 차단 사유 (체크리스트)
- [ ] Supabase에 `002_add_assignment_targets_and_limit_student_assignment_visibility.sql` 미적용 시 권한 모델 불일치
- [ ] Supabase에 `004_switch_to_custom_auth_sessions.sql` 미적용 시 커스텀 로그인 불가
- [ ] 운영자 계정(`profiles` + `account_credentials`) 미등록 시 로그인 불가
- [ ] teacher 계정으로 assignment 생성 시 대상 student 선택 누락 가능(운영 실수)

## 차단 해제 조건
- [ ] Supabase migration 001 + 002 + 004 적용
- [ ] teacher/student 계정 + 해시 자격정보 등록 확인
- [ ] Production 배포 후 smoke test 전부 통과

## 지금 당장 가능한 범위
- 내부 데모
- 파일럿 테스트
- 소수 사용자 PoC
- 운영 전 리허설(로컬/프리뷰/프로덕션 체크리스트)
