# CUSTOM_AUTH_OPERATIONS

## 1) 운영자가 계정을 넣는 방법

### teacher 계정
1. `profiles`에 teacher row 추가
2. teacher 비밀번호를 bcrypt 해시로 생성
   - `npm run hash:auth -- "TODO: fill by operator"`
3. `account_credentials`에 아래 값으로 insert
   - `profile_id`
   - `role='teacher'`
   - `teacher_login_id`
   - `password_hash`
   - `is_active=true`

### student 계정
1. `profiles`에 student row 추가
2. 전화번호 뒤4자리를 bcrypt 해시로 생성
   - `npm run hash:auth -- "1234"`
3. `account_credentials`에 아래 값으로 insert
   - `profile_id`
   - `role='student'`
   - `student_phone_last4_hash`
   - `is_active=true`

## 2) 초기 비밀번호/전화번호 뒤4자리 관리
- 평문값은 SQL/코드/문서에 남기지 않음
- 해시 생성은 운영자 로컬 터미널에서만 수행
- 전달이 필요하면 보안 채널 사용
- 분실 대응을 위해 “해시 재생성 후 갱신” 절차를 표준화

## 3) 분실/변경 처리 방법

### teacher 비밀번호 변경
1. 새 비밀번호 수령
2. `npm run hash:auth -- "<new-password>"`
3. `account_credentials.password_hash` 업데이트
4. 본인 로그인 재검증

### student 전화번호 뒤4자리 변경
1. 새 뒤4자리 확인
2. `npm run hash:auth -- "<new-last4>"`
3. `account_credentials.student_phone_last4_hash` 업데이트
4. 본인 로그인 재검증

## 4) 동명이인 처리 방법
- 기본 정책: 이름으로 후보를 찾고, 뒤4자리 해시 검증
- 해시 일치 후보가 2개 이상이면 로그인 실패(안전 실패)
- 운영자 조치:
  1. 중복 학생의 전화 뒤4자리 입력값을 재검증
  2. 필요 시 한 명의 `is_active=false` 임시 비활성화 후 확인
  3. 장기적으로 `student_code` 도입 권장

## 5) 운영 체크 SQL 예시
```sql
-- active teacher 계정
select p.id, p.name, c.teacher_login_id, c.is_active
from public.profiles p
join public.account_credentials c on c.profile_id = p.id
where p.role = 'teacher'
  and p.is_active = true
  and c.is_active = true;

-- active student 계정
select p.id, p.name, c.is_active
from public.profiles p
join public.account_credentials c on c.profile_id = p.id
where p.role = 'student'
  and p.is_active = true
  and c.is_active = true;
```
