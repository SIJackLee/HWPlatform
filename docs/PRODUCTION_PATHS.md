# PRODUCTION_PATHS

현재 단일 기준:
- `assignment_targets` 기반 student 대상 제한 정책 적용
- 커스텀 앱 세션 인증(`app_session`) 적용
- 운영자 사전 등록 계정(`profiles` + `account_credentials`) 사용
- 실운영 판정은 조건부 가능(운영 수동 설정/스모크 테스트 전제)

## 시나리오 A: 정책 유지 후 제한적 오픈

> 참고: 현재 코드 기준 기본 정책은 이미 B(대상 제한)이다.  
> A는 긴급 롤백 시 운영 선택지로만 남긴다.

### 적용 범위
- 내부 데모
- 파일럿(한 반/소수 사용자)
- PoC

### 운영자 승인 문구(예시)
> (롤백으로 전체조회 정책을 사용할 경우) student 계정에서 assignment 전체 조회가 가능합니다.  
> 이 경우 본 서비스는 내부 검증/파일럿 목적으로만 운영하며, 정식 대외 오픈은 대상 제한 정책 복구 후 진행합니다.

### 필수 조건
- 참여 사용자에게 사전 고지
- 테스트/운영 범위 인원 제한
- 운영 기간 명확화

## 시나리오 B: 권한 축소 후 정식 오픈

### 구현 상태
1. 코드
- student assignment 조회를 `assignment_targets` 기반으로 제한 완료
- teacher assignment 생성 시 대상 student 선택 + bulk insert 완료
2. SQL/RLS
- `assignment_targets` 테이블/인덱스/FK/RLS 추가 완료
- `assignments_select_student_all` 제거 후 `assignments_select_student_targeted` 적용 완료
3. 문서
- 핵심 운영 문서를 대상 제한 기준으로 동기화 완료

### 재테스트 필요 항목
- teacher 로그인(아이디+비밀번호), student 로그인(이름+뒤4자리)
- 동명이인 충돌 시 안전 실패 처리
- student가 본인 대상 assignment만 조회되는지
- teacher 제출현황에 미제출자 계산 가능 여부
- 권한 없는 assignment 접근 차단 여부
- Local/Preview/Production smoke test 재실행
