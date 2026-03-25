-- Scenario B: assignment target model for production-ready visibility

create table if not exists public.assignment_targets (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint assignment_targets_unique_assignment_student unique (assignment_id, student_id)
);

create index if not exists idx_assignment_targets_assignment_id
on public.assignment_targets(assignment_id);

create index if not exists idx_assignment_targets_student_id
on public.assignment_targets(student_id);

alter table public.assignment_targets enable row level security;

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
-- and only for users whose role is student
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

-- Replace student assignment visibility policy
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

-- Keep submissions policy shape, but require target row for insert
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
