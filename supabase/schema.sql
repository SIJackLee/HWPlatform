-- =========================================================
-- Academy Homework MVP - Supabase Schema
-- Core tables: profiles, assignments, submissions
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

-- 2) PROFILES
-- auth.users (Supabase Auth) 1:1 mapping
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('teacher', 'student')),
  full_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- 3) ASSIGNMENTS
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

-- 4) SUBMISSIONS
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

-- 5) INDEXES
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_assignments_teacher_id on public.assignments(teacher_id);
create index if not exists idx_assignments_due_at on public.assignments(due_at);
create index if not exists idx_submissions_assignment_id on public.submissions(assignment_id);
create index if not exists idx_submissions_student_id on public.submissions(student_id);
create index if not exists idx_submissions_submitted_at on public.submissions(submitted_at desc);

-- 6) RLS ENABLE
alter table public.profiles enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;

-- 7) Helper functions for RLS checks
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

-- 8) PROFILES POLICIES
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

-- 9) ASSIGNMENTS POLICIES
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

-- Student can read assignments (class distribution extension comes later)
drop policy if exists "assignments_select_student_all" on public.assignments;
create policy "assignments_select_student_all"
on public.assignments
for select
to authenticated
using (
  public.is_student(auth.uid())
);

-- 10) SUBMISSIONS POLICIES
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

-- 11) Seed data example
-- IMPORTANT:
-- Replace UUIDs below with real auth.users IDs existing in your project.
-- You can create users first in Supabase Auth dashboard.

-- Example user IDs
-- teacher: 11111111-1111-1111-1111-111111111111
-- student A: 22222222-2222-2222-2222-222222222222
-- student B: 33333333-3333-3333-3333-333333333333

insert into public.profiles (id, role, full_name)
values
  ('11111111-1111-1111-1111-111111111111', 'teacher', '김선생'),
  ('22222222-2222-2222-2222-222222222222', 'student', '학생A'),
  ('33333333-3333-3333-3333-333333333333', 'student', '학생B')
on conflict (id) do nothing;

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

