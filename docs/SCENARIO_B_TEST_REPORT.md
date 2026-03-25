# SCENARIO_B_TEST_REPORT

## 테스트 시나리오 / 기대 결과 / 실제 결과

1) teacher가 student A, B를 대상으로 assignment 생성  
- 기대 결과: assignment 생성 + `assignment_targets` 2건 생성  
- 실제 결과: 코드 경로 구현 완료(`createAssignment`에서 bulk insert), lint/build 통과

2) student A 로그인 -> 해당 assignment 조회  
- 기대 결과: `/student/assignments`에 assignment 노출  
- 실제 결과: `lib/student/queries.ts`가 `assignment_targets` 기반 조회로 변경됨

3) student C 로그인 -> 해당 assignment 미조회  
- 기대 결과: 목록 미노출  
- 실제 결과: `assignment_targets` 미연결 시 목록 제외 로직 반영

4) student C URL 직접 접근 차단  
- 기대 결과: `/student/assignments/[assignmentId]` 접근 차단  
- 실제 결과: 대상 미연결이면 `notFound()` 처리로 404

5) teacher assignment detail 집계 확인  
- 기대 결과: target/submitted/not submitted 정확 계산  
- 실제 결과: `lib/teacher/queries.ts`에서 target 기준 집계 및 미제출자 계산 로직 반영

6) student A 제출 후 teacher 피드백 저장  
- 기대 결과: 기존 제출/피드백 흐름 유지  
- 실제 결과: 관련 action/쿼리 구조 유지, build/lint 통과

7) student A 피드백 확인  
- 기대 결과: 상세에서 피드백 강조 표시  
- 실제 결과: 기존 UI/로직 유지(`submissions.feedback_text`)

8) student C 데이터 접근 불가  
- 기대 결과: 목록/상세/제출 경로에서 데이터 접근 불가  
- 실제 결과: assignments 조회/상세는 target 제한 정책 및 대상검증으로 차단

## 자동 검증 결과
- `npm run lint`: 통과
- `npm run build`: 통과

## 수동 검증 필요 항목
- 실제 Supabase 운영/프리뷰 프로젝트에 migration 002 적용 후 계정별 수동 시나리오 재실행
- teacher 대상 선택 누락/오입력 시 운영 절차 점검

## 실패 항목
- 현재 작업 범위에서 lint/build 실패 항목 없음
- 실환경 수동 테스트는 운영자 실행 전이므로 별도 수행 필요
