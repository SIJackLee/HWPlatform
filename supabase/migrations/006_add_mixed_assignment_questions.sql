alter table public.assignments
drop constraint if exists assignments_question_type_check;

alter table public.assignments
add constraint assignments_question_type_check
check (question_type in ('subjective', 'objective', 'mixed'));

create table if not exists public.assignment_questions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  question_type text not null check (question_type in ('subjective', 'objective')),
  prompt text not null check (length(trim(prompt)) >= 1),
  sort_order int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assignment_questions_unique_sort unique (assignment_id, sort_order)
);

create trigger trg_assignment_questions_set_updated_at
before update on public.assignment_questions
for each row
execute function public.set_updated_at();

create table if not exists assignment_question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.assignment_questions(id) on delete cascade,
  option_text text not null check (length(trim(option_text)) >= 1),
  is_correct boolean not null default false,
  sort_order int not null default 1,
  created_at timestamptz not null default now(),
  constraint assignment_question_options_unique_sort unique (question_id, sort_order)
);

create table if not exists public.submission_answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  question_id uuid not null references public.assignment_questions(id) on delete cascade,
  answer_text text,
  selected_option_ids uuid[] not null default '{}',
  is_correct boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint submission_answers_unique_submission_question unique (submission_id, question_id)
);

create trigger trg_submission_answers_set_updated_at
before update on public.submission_answers
for each row
execute function public.set_updated_at();

create index if not exists idx_assignment_questions_assignment_id
on public.assignment_questions(assignment_id);

create index if not exists idx_assignment_question_options_question_id
on public.assignment_question_options(question_id);

create index if not exists idx_submission_answers_submission_id
on public.submission_answers(submission_id);

alter table public.assignment_questions enable row level security;
alter table public.assignment_question_options enable row level security;
alter table public.submission_answers enable row level security;

drop policy if exists "assignment_questions_select_teacher_own" on public.assignment_questions;
create policy "assignment_questions_select_teacher_own"
on public.assignment_questions
for select
to authenticated
using (
  public.is_teacher(auth.uid())
  and exists (
    select 1
    from public.assignments a
    where a.id = assignment_questions.assignment_id
      and a.teacher_id = auth.uid()
  )
);

drop policy if exists "assignment_questions_select_student_targeted" on public.assignment_questions;
create policy "assignment_questions_select_student_targeted"
on public.assignment_questions
for select
to authenticated
using (
  public.is_student(auth.uid())
  and exists (
    select 1
    from public.assignment_targets at
    where at.assignment_id = assignment_questions.assignment_id
      and at.student_id = auth.uid()
  )
);

drop policy if exists "assignment_questions_insert_teacher_own" on public.assignment_questions;
create policy "assignment_questions_insert_teacher_own"
on public.assignment_questions
for insert
to authenticated
with check (
  public.is_teacher(auth.uid())
  and exists (
    select 1
    from public.assignments a
    where a.id = assignment_questions.assignment_id
      and a.teacher_id = auth.uid()
  )
);

drop policy if exists "assignment_questions_update_teacher_own" on public.assignment_questions;
create policy "assignment_questions_update_teacher_own"
on public.assignment_questions
for update
to authenticated
using (
  public.is_teacher(auth.uid())
  and exists (
    select 1
    from public.assignments a
    where a.id = assignment_questions.assignment_id
      and a.teacher_id = auth.uid()
  )
)
with check (
  public.is_teacher(auth.uid())
  and exists (
    select 1
    from public.assignments a
    where a.id = assignment_questions.assignment_id
      and a.teacher_id = auth.uid()
  )
);

drop policy if exists "assignment_question_options_select_teacher_own" on public.assignment_question_options;
create policy "assignment_question_options_select_teacher_own"
on public.assignment_question_options
for select
to authenticated
using (
  public.is_teacher(auth.uid())
  and exists (
    select 1
    from public.assignment_questions q
    join public.assignments a on a.id = q.assignment_id
    where q.id = assignment_question_options.question_id
      and a.teacher_id = auth.uid()
  )
);

drop policy if exists "assignment_question_options_select_student_targeted" on public.assignment_question_options;
create policy "assignment_question_options_select_student_targeted"
on public.assignment_question_options
for select
to authenticated
using (
  public.is_student(auth.uid())
  and exists (
    select 1
    from public.assignment_questions q
    join public.assignment_targets at on at.assignment_id = q.assignment_id
    where q.id = assignment_question_options.question_id
      and at.student_id = auth.uid()
  )
);

drop policy if exists "assignment_question_options_insert_teacher_own" on public.assignment_question_options;
create policy "assignment_question_options_insert_teacher_own"
on public.assignment_question_options
for insert
to authenticated
with check (
  public.is_teacher(auth.uid())
  and exists (
    select 1
    from public.assignment_questions q
    join public.assignments a on a.id = q.assignment_id
    where q.id = assignment_question_options.question_id
      and a.teacher_id = auth.uid()
  )
);

drop policy if exists "submission_answers_select_student_own" on public.submission_answers;
create policy "submission_answers_select_student_own"
on public.submission_answers
for select
to authenticated
using (
  public.is_student(auth.uid())
  and exists (
    select 1
    from public.submissions s
    where s.id = submission_answers.submission_id
      and s.student_id = auth.uid()
  )
);

drop policy if exists "submission_answers_select_teacher_own_assignments" on public.submission_answers;
create policy "submission_answers_select_teacher_own_assignments"
on public.submission_answers
for select
to authenticated
using (
  public.is_teacher(auth.uid())
  and exists (
    select 1
    from public.submissions s
    join public.assignments a on a.id = s.assignment_id
    where s.id = submission_answers.submission_id
      and a.teacher_id = auth.uid()
  )
);

drop policy if exists "submission_answers_upsert_student_own" on public.submission_answers;
create policy "submission_answers_upsert_student_own"
on public.submission_answers
for all
to authenticated
using (
  public.is_student(auth.uid())
  and exists (
    select 1
    from public.submissions s
    where s.id = submission_answers.submission_id
      and s.student_id = auth.uid()
  )
)
with check (
  public.is_student(auth.uid())
  and exists (
    select 1
    from public.submissions s
    where s.id = submission_answers.submission_id
      and s.student_id = auth.uid()
  )
);
