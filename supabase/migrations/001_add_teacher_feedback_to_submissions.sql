alter table public.submissions
add column if not exists feedback_text text,
add column if not exists feedback_updated_at timestamptz;

create index if not exists idx_submissions_feedback_updated_at
on public.submissions(feedback_updated_at desc);

drop policy if exists "submissions_update_teacher_feedback_own_assignments" on public.submissions;
create policy "submissions_update_teacher_feedback_own_assignments"
on public.submissions
for update
to authenticated
using (
  public.is_teacher(auth.uid())
  and exists (
    select 1
    from public.assignments a
    where a.id = submissions.assignment_id
      and a.teacher_id = auth.uid()
  )
)
with check (
  public.is_teacher(auth.uid())
  and exists (
    select 1
    from public.assignments a
    where a.id = submissions.assignment_id
      and a.teacher_id = auth.uid()
  )
);
