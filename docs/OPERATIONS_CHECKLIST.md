# OPERATIONS_CHECKLIST

## 운영 시작 전 체크리스트
- [ ] 운영 도메인 결정 및 DNS 연결 완료
- [ ] Vercel 배포 성공
- [ ] Supabase schema + migration 적용 완료
- [ ] 운영용 환경변수 등록 완료
- [ ] 테스트용 teacher/student 계정 준비

## 회원가입/로그인 점검
- [ ] teacher 회원가입 성공
- [ ] student 회원가입 성공
- [ ] 로그인 성공
- [ ] 로그아웃 성공
- [ ] 로그인 후 role별 대시보드 이동 확인

## teacher 계정 점검
- [ ] 대시보드 수치 표시 확인
- [ ] 숙제 생성 성공(제목/설명/마감일)
- [ ] 숙제 목록 표시 확인
- [ ] 숙제 상세 진입 확인
- [ ] 제출 상세 진입 및 피드백 저장 확인

## student 계정 점검
- [ ] 대시보드(진행중/완료/피드백) 표시 확인
- [ ] 내 숙제 목록 분리 표시 확인
- [ ] 숙제 상세에서 답안 제출 가능
- [ ] 재제출 시 제출시간 갱신 확인
- [ ] teacher 피드백 강조 표시 확인

## 과제 등록/제출/피드백 전체 흐름 점검
1. teacher가 숙제 생성
2. student가 숙제 확인
3. student가 답안 제출
4. teacher가 제출 상세 확인
5. teacher가 피드백 저장
6. student가 피드백 확인

## 권한 오류 점검
- [ ] student가 `/teacher/*` 접근 시 차단되는지 확인
- [ ] teacher가 `/student/*` 접근 시 차단되는지 확인
- [ ] 비로그인 사용자가 보호 경로 접근 시 `/login` 이동 확인

## RLS 관련 점검
- [ ] student가 다른 student 제출 데이터 접근 불가
- [ ] teacher가 본인 assignment 외 submission 조회 불가
- [ ] `profiles`가 본인 정보만 조회 가능한지 확인
- [ ] student assignment 조회가 전체 공개 정책임을 운영자가 인지했는지 확인

## 장애 발생 시 우선 확인 항목
1. Vercel 배포 상태/로그
2. Supabase 상태 페이지 및 SQL 오류 로그
3. 환경변수 누락/오탈자
4. 최근 배포 커밋 변경점
