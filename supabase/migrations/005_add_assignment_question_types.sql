alter table public.assignments
add column if not exists question_type text not null default 'subjective'
  check (question_type in ('subjective', 'objective'));

create table if not exists public.assignment_objective_details (
  assignment_id uuid primary key references public.assignments(id) on delete cascade,
  prompt text not null check (length(trim(prompt)) >= 1),
  allow_multiple boolean not null default false,
  explanation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_assignment_objective_details_set_updated_at
before update on public.assignment_objective_details
for each row
execute function public.set_updated_at();

create table if not exists public.assignment_objective_options (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  option_text text not null check (length(trim(option_text)) >= 1),
  is_correct boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_assignment_objective_options_assignment_sort
on public.assignment_objective_options(assignment_id, sort_order);

create index if not exists idx_assignment_objective_options_assignment_id
on public.assignment_objective_options(assignment_id);

alter table public.submissions
add column if not exists selected_option_ids uuid[] not null default '{}',
add column if not exists is_correct boolean;

drop policy if exists "assignment_objective_details_select_teacher_own" on public.assignment_objective_details;
create policy "assignment_objective_details_select_teacher_own"
on public.assignment_objective_details
for select
to authenticated
using (
  public.is_teacher(auth.uid())
  and exists (
    select 1
    from public.assignments a
    where a.id = assignment_objective_details.assignment_id
      and a.teacher_id = auth.uid()
  )
);

drop policy if exists "assignment_objective_details_select_student_targeted" on public.assignment_objective_details;
create policy "assignment_objective_details_select_student_targeted"
on public.assignment_objective_details
for select
to authenticated
using (
  public.is_student(auth.uid())
  and exists (
    select 1
    from public.assignment_targets at
    where at.assignment_id = assignment_objective_details.assignment_id
      and at.student_id = auth.uid()
  )
);

drop policy if exists "assignment_objective_details_insert_teacher_own" on public.assignment_objective_details;
create policy "assignment_objective_details_insert_teacher_own"
on public.assignment_objective_details
for insert
to authenticated
with check (
  public.is_teacher(auth.uid())
  and exists (
    select 1
    from public.assignments a
    where a.id = assignment_objective_details.assignment_id
      and a.teacher_id = auth.uid()
  )
);

drop policy if exists "assignment_objective_details_update_teacher_own" on public.assignment_objective_details;
create policy "assignment_objective_details_update_teacher_own"
on public.assignment_objective_details
for update
to authenticated
using (
  public.is_teacher(auth.uid())
  and exists (
    select 1
    from public.assignments a
    where a.id = assignment_objective_details.assignment_id
      and a.teacher_id = auth.uid()
  )
)
with check (
  public.is_teacher(auth.uid())
  and exists (
    select 1
    from public.assignments a
    where a.id = assignment_objective_details.assignment_id
      and a.teacher_id = auth.uid()
  )
);

drop policy if exists "assignment_objective_options_select_teacher_own" on public.assignment_objective_options;
create policy "assignment_objective_options_select_teacher_own"
on public.assignment_objective_options
for select
to authenticated
using (
  public.is_teacher(auth.uid())
  and exists (
    select 1
    from public.assignments a
    where a.id = assignment_objective_options.assignment_id
      and a.teacher_id = auth.uid()
  )
);

drop policy if exists "assignment_objective_options_select_student_targeted" on public.assignment_objective_options;
create policy "assignment_objective_options_select_student_targeted"
on public.assignment_objective_options
for select
to authenticated
using (
  public.is_student(auth.uid())
  and exists (
    select 1
    from public.assignment_targets at
    where at.assignment_id = assignment_objective_options.assignment_id
      and at.student_id = auth.uid()
  )
);

drop policy if exists "assignment_objective_options_insert_teacher_own" on public.assignment_objective_options;
create policy "assignment_objective_options_insert_teacher_own"
on public.assignment_objective_options
for insert
to authenticated
with check (
  public.is_teacher(auth.uid())
  and exists (
    select 1
    from public.assignments a
    where a.id = assignment_objective_options.assignment_id
      and a.teacher_id = auth.uid()
  )
);

drop policy if exists "assignment_objective_options_update_teacher_own" on public.assignment_objective_options;
create policy "assignment_objective_options_update_teacher_own"
on public.assignment_objective_options
for update
to authenticated
using (
  public.is_teacher(auth.uid())
  and exists (
    select 1
    from public.assignments a
    where a.id = assignment_objective_options.assignment_id
      and a.teacher_id = auth.uid()
  )
)
with check (
  public.is_teacher(auth.uid())
  and exists (
    select 1
    from public.assignments a
    where a.id = assignment_objective_options.assignment_id
      and a.teacher_id = auth.uid()
  )
);

drop policy if exists "assignment_objective_options_delete_teacher_own" on public.assignment_objective_options;
create policy "assignment_objective_options_delete_teacher_own"
on public.assignment_objective_options
for delete
to authenticated
using (
  public.is_teacher(auth.uid())
  and exists (
    select 1
    from public.assignments a
    where a.id = assignment_objective_options.assignment_id
      and a.teacher_id = auth.uid()
  )
);

alter table public.assignment_objective_details enable row level security;
alter table public.assignment_objective_options enable row level security;
