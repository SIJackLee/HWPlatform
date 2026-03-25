-- =========================================================
-- Academy Homework MVP - Supabase Schema
-- Core tables: profiles, account_credentials, assignments, assignment_targets, submissions
-- =========================================================

-- 0) Extensions
create extension if not exists pgcrypto;

-- 1) Common updated_at trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2) PROFILES (domain user table)
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('teacher', 'student')),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- 3) ACCOUNT_CREDENTIALS (custom auth)
create table if not exists public.account_credentials (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  role text not null check (role in ('teacher', 'student')),
  teacher_login_id text unique,
  password_hash text,
  student_phone_last4_hash text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_credentials_teacher_fields check (
    (role <> 'teacher') or (teacher_login_id is not null and password_hash is not null)
  ),
  constraint account_credentials_student_fields check (
    (role <> 'student') or (student_phone_last4_hash is not null)
  )
);

create trigger trg_account_credentials_set_updated_at
before update on public.account_credentials
for each row
execute function public.set_updated_at();

-- 4) ASSIGNMENTS
-- assignment is created by teacher
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  description text not null,
  due_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assignments_due_at_valid check (due_at > created_at)
);

create trigger trg_assignments_set_updated_at
before update on public.assignments
for each row
execute function public.set_updated_at();

-- 5) SUBMISSIONS
-- submission is created by student
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete restrict,
  answer_text text not null check (length(trim(answer_text)) >= 1),
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint submissions_unique_student_per_assignment unique (assignment_id, student_id)
);

create trigger trg_submissions_set_updated_at
before update on public.submissions
for each row
execute function public.set_updated_at();

-- 6) ASSIGNMENT_TARGETS
-- target students for each assignment
create table if not exists public.assignment_targets (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint assignment_targets_unique_assignment_student unique (assignment_id, student_id)
);

-- 7) INDEXES
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_name on public.profiles(name);
create index if not exists idx_account_credentials_role on public.account_credentials(role);
create unique index if not exists idx_account_credentials_teacher_login_id
on public.account_credentials(teacher_login_id)
where teacher_login_id is not null;
create index if not exists idx_assignments_teacher_id on public.assignments(teacher_id);
create index if not exists idx_assignments_due_at on public.assignments(due_at);
create index if not exists idx_submissions_assignment_id on public.submissions(assignment_id);
create index if not exists idx_submissions_student_id on public.submissions(student_id);
create index if not exists idx_submissions_submitted_at on public.submissions(submitted_at desc);
create index if not exists idx_assignment_targets_assignment_id on public.assignment_targets(assignment_id);
create index if not exists idx_assignment_targets_student_id on public.assignment_targets(student_id);

-- 8) RLS ENABLE
alter table public.profiles enable row level security;
alter table public.account_credentials enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;
alter table public.assignment_targets enable row level security;

-- 9) Helper functions for RLS checks (legacy compatibility)

create or replace function public.is_teacher(uid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid
      and p.role = 'teacher'
  );
$$;

create or replace function public.is_student(uid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid
      and p.role = 'student'
  );
$$;

-- 10) PROFILES POLICIES
-- Everyone can read own profile only
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

-- User can insert only own profile row
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

-- User can update only own profile row
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- 11) ACCOUNT_CREDENTIALS POLICIES
drop policy if exists "account_credentials_deny_all" on public.account_credentials;
create policy "account_credentials_deny_all"
on public.account_credentials
for all
to authenticated
using (false)
with check (false);

-- 12) ASSIGNMENTS POLICIES
-- Teacher can create assignment only as self
drop policy if exists "assignments_insert_teacher_self" on public.assignments;
create policy "assignments_insert_teacher_self"
on public.assignments
for insert
to authenticated
with check (
  teacher_id = auth.uid()
  and public.is_teacher(auth.uid())
);

-- Teacher can read/update/delete own assignments
drop policy if exists "assignments_cud_teacher_own" on public.assignments;
create policy "assignments_cud_teacher_own"
on public.assignments
for all
to authenticated
using (
  teacher_id = auth.uid()
  and public.is_teacher(auth.uid())
)
with check (
  teacher_id = auth.uid()
  and public.is_teacher(auth.uid())
);

-- Student can read only targeted assignments
drop policy if exists "assignments_select_student_all" on public.assignments;
drop policy if exists "assignments_select_student_targeted" on public.assignments;
create policy "assignments_select_student_targeted"
on public.assignments
for select
to authenticated
using (
  public.is_student(auth.uid())
  and exists (
    select 1
    from public.assignment_targets at
    where at.assignment_id = assignments.id
      and at.student_id = auth.uid()
  )
);

-- 13) ASSIGNMENT_TARGETS POLICIES
-- Teacher can read target rows only for own assignments
drop policy if exists "assignment_targets_select_teacher_own" on public.assignment_targets;
create policy "assignment_targets_select_teacher_own"
on public.assignment_targets
for select
to authenticated
using (
  public.is_teacher(auth.uid())
  and exists (
    select 1
    from public.assignments a
    where a.id = assignment_targets.assignment_id
      and a.teacher_id = auth.uid()
  )
);

-- Teacher can insert target rows only for own assignments
-- and only users with student role can be targets
drop policy if exists "assignment_targets_insert_teacher_own" on public.assignment_targets;
create policy "assignment_targets_insert_teacher_own"
on public.assignment_targets
for insert
to authenticated
with check (
  public.is_teacher(auth.uid())
  and exists (
    select 1
    from public.assignments a
    where a.id = assignment_targets.assignment_id
      and a.teacher_id = auth.uid()
  )
  and exists (
    select 1
    from public.profiles p
    where p.id = assignment_targets.student_id
      and p.role = 'student'
  )
);

-- Teacher can delete target rows only for own assignments
drop policy if exists "assignment_targets_delete_teacher_own" on public.assignment_targets;
create policy "assignment_targets_delete_teacher_own"
on public.assignment_targets
for delete
to authenticated
using (
  public.is_teacher(auth.uid())
  and exists (
    select 1
    from public.assignments a
    where a.id = assignment_targets.assignment_id
      and a.teacher_id = auth.uid()
  )
);

-- Student can read only own target rows
drop policy if exists "assignment_targets_select_student_own" on public.assignment_targets;
create policy "assignment_targets_select_student_own"
on public.assignment_targets
for select
to authenticated
using (
  public.is_student(auth.uid())
  and assignment_targets.student_id = auth.uid()
);

-- 14) SUBMISSIONS POLICIES
-- Student can create only own submission and only if assignment exists
drop policy if exists "submissions_insert_student_self" on public.submissions;
create policy "submissions_insert_student_self"
on public.submissions
for insert
to authenticated
with check (
  student_id = auth.uid()
  and public.is_student(auth.uid())
  and exists (
    select 1
    from public.assignments a
    where a.id = submissions.assignment_id
  )
  and exists (
    select 1
    from public.assignment_targets at
    where at.assignment_id = submissions.assignment_id
      and at.student_id = auth.uid()
  )
);

-- Student can read/update/delete only own submissions
drop policy if exists "submissions_cud_student_own" on public.submissions;
create policy "submissions_cud_student_own"
on public.submissions
for all
to authenticated
using (
  student_id = auth.uid()
  and public.is_student(auth.uid())
)
with check (
  student_id = auth.uid()
  and public.is_student(auth.uid())
);

-- Teacher can read submissions only for own assignments
drop policy if exists "submissions_select_teacher_own_assignments" on public.submissions;
create policy "submissions_select_teacher_own_assignments"
on public.submissions
for select
to authenticated
using (
  public.is_teacher(auth.uid())
  and exists (
    select 1
    from public.assignments a
    where a.id = submissions.assignment_id
      and a.teacher_id = auth.uid()
  )
);

-- 15) Seed data example
-- IMPORTANT:
-- Replace UUIDs below with real profile IDs in your environment.

-- Example user IDs
-- teacher: 11111111-1111-1111-1111-111111111111
-- student A: 22222222-2222-2222-2222-222222222222
-- student B: 33333333-3333-3333-3333-333333333333

insert into public.profiles (id, role, name, is_active)
values
  ('11111111-1111-1111-1111-111111111111', 'teacher', '김선생', true),
  ('22222222-2222-2222-2222-222222222222', 'student', '학생A', true),
  ('33333333-3333-3333-3333-333333333333', 'student', '학생B', true)
on conflict (id) do nothing;

-- password_hash / student_phone_last4_hash are bcrypt hashes.
-- Generate them with server-side bcrypt utility before apply in production.
insert into public.account_credentials (
  profile_id,
  role,
  teacher_login_id,
  password_hash,
  student_phone_last4_hash,
  is_active
)
values
  ('11111111-1111-1111-1111-111111111111', 'teacher', 'teacher01', '$2b$10$REPLACE_WITH_BCRYPT_HASH', null, true),
  ('22222222-2222-2222-2222-222222222222', 'student', null, null, '$2b$10$REPLACE_WITH_BCRYPT_HASH', true),
  ('33333333-3333-3333-3333-333333333333', 'student', null, null, '$2b$10$REPLACE_WITH_BCRYPT_HASH', true)
on conflict (profile_id) do nothing;

insert into public.assignments (id, teacher_id, title, description, due_at)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    '영어 단어 30개 암기',
    '교재 5과 단어 30개를 암기하고 예문 5개 작성',
    now() + interval '3 days'
  )
on conflict (id) do nothing;

insert into public.assignment_targets (assignment_id, student_id)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333')
on conflict (assignment_id, student_id) do nothing;

insert into public.submissions (assignment_id, student_id, answer_text)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '22222222-2222-2222-2222-222222222222',
    '단어 30개 암기 완료. 예문 5개 작성했습니다.'
  )
on conflict (assignment_id, student_id) do update
set
  answer_text = excluded.answer_text,
  submitted_at = now(),
  updated_at = now();

