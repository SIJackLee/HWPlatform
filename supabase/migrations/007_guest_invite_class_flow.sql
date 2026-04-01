-- Guest invite-code class flow migration
-- - Add class/guest/invite/session tables
-- - Scope assignments by class_id
-- - Switch submissions uniqueness from student_id to guest_student_id
-- - Remove legacy student submissions (guest-only decision)

create extension if not exists pgcrypto;

-- 1) Class tables
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (length(trim(name)) >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_classes_set_updated_at on public.classes;
create trigger trg_classes_set_updated_at
before update on public.classes
for each row
execute function public.set_updated_at();

create index if not exists idx_classes_teacher_id on public.classes(teacher_id);

create table if not exists public.class_invite_codes (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  max_uses int,
  used_count int not null default 0,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint class_invite_codes_max_uses_valid check (max_uses is null or max_uses > 0),
  constraint class_invite_codes_used_count_valid check (used_count >= 0)
);

create index if not exists idx_class_invite_codes_class_id on public.class_invite_codes(class_id);
create index if not exists idx_class_invite_codes_code_hash on public.class_invite_codes(code_hash);

create table if not exists public.guest_students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  name text not null check (length(trim(name)) >= 1),
  name_norm text not null check (length(trim(name_norm)) >= 1),
  pin4_hmac text not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked_at timestamptz,
  constraint guest_students_unique_identity unique (class_id, name_norm, pin4_hmac)
);

create index if not exists idx_guest_students_class_id on public.guest_students(class_id);
create index if not exists idx_guest_students_name_norm on public.guest_students(name_norm);

create table if not exists public.guest_sessions (
  id uuid primary key default gen_random_uuid(),
  guest_student_id uuid not null references public.guest_students(id) on delete cascade,
  session_token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_guest_sessions_guest_student_id on public.guest_sessions(guest_student_id);

-- 2) Backfill one default class per teacher for existing assignments.
insert into public.classes (teacher_id, name)
select distinct a.teacher_id, '기본 반'
from public.assignments a
left join public.classes c on c.teacher_id = a.teacher_id
where c.id is null;

-- 3) assignments -> class scope
alter table public.assignments
add column if not exists class_id uuid;

update public.assignments a
set class_id = c.id
from public.classes c
where c.teacher_id = a.teacher_id
  and a.class_id is null;

alter table public.assignments
alter column class_id set not null;

alter table public.assignments
drop constraint if exists assignments_class_id_fkey;

alter table public.assignments
add constraint assignments_class_id_fkey
foreign key (class_id) references public.classes(id) on delete restrict;

create index if not exists idx_assignments_class_id on public.assignments(class_id);

-- 4) submissions -> guest scope (drop legacy student submissions/data)
delete from public.submission_answers;
delete from public.submissions;

alter table public.submissions
add column if not exists guest_student_id uuid;

alter table public.submissions
drop constraint if exists submissions_unique_student_per_assignment;

alter table public.submissions
drop constraint if exists submissions_student_id_fkey;

alter table public.submissions
alter column student_id drop not null;

alter table public.submissions
add constraint submissions_guest_student_id_fkey
foreign key (guest_student_id) references public.guest_students(id) on delete cascade;

create unique index if not exists idx_submissions_unique_assignment_guest
on public.submissions(assignment_id, guest_student_id);

create index if not exists idx_submissions_guest_student_id
on public.submissions(guest_student_id);

-- Ensure future rows always have guest_student_id.
alter table public.submissions
alter column guest_student_id set not null;

-- 5) Minimal RLS for new tables (service-role app; deny authenticated direct access by default)
alter table public.classes enable row level security;
alter table public.class_invite_codes enable row level security;
alter table public.guest_students enable row level security;
alter table public.guest_sessions enable row level security;

drop policy if exists "classes_deny_all" on public.classes;
create policy "classes_deny_all"
on public.classes
for all
to authenticated
using (false)
with check (false);

drop policy if exists "class_invite_codes_deny_all" on public.class_invite_codes;
create policy "class_invite_codes_deny_all"
on public.class_invite_codes
for all
to authenticated
using (false)
with check (false);

drop policy if exists "guest_students_deny_all" on public.guest_students;
create policy "guest_students_deny_all"
on public.guest_students
for all
to authenticated
using (false)
with check (false);

drop policy if exists "guest_sessions_deny_all" on public.guest_sessions;
create policy "guest_sessions_deny_all"
on public.guest_sessions
for all
to authenticated
using (false)
with check (false);
