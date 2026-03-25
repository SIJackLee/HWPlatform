-- Switch from Supabase Auth email login to custom app-session auth.
-- Non-destructive migration: keeps domain tables and adds credentials table.

-- 1) Remove auth.users signup trigger dependency (from migration 003)
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user_profile();

-- 2) Profiles table becomes independent domain user table
alter table public.profiles
drop constraint if exists profiles_id_fkey;

alter table public.profiles
alter column id set default gen_random_uuid();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'full_name'
  ) then
    alter table public.profiles rename column full_name to name;
  end if;
end
$$;

alter table public.profiles
add column if not exists is_active boolean not null default true;

-- 3) Custom auth credentials table
create table if not exists public.account_credentials (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  role text not null check (role in ('teacher', 'student')),
  teacher_login_id text unique,
  password_hash text,
  student_phone_last4_hash text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'account_credentials_teacher_fields'
  ) then
    alter table public.account_credentials
    add constraint account_credentials_teacher_fields
    check ((role <> 'teacher') or (teacher_login_id is not null and password_hash is not null));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'account_credentials_student_fields'
  ) then
    alter table public.account_credentials
    add constraint account_credentials_student_fields
    check ((role <> 'student') or (student_phone_last4_hash is not null));
  end if;
end
$$;

drop trigger if exists trg_account_credentials_set_updated_at on public.account_credentials;
create trigger trg_account_credentials_set_updated_at
before update on public.account_credentials
for each row
execute function public.set_updated_at();

create index if not exists idx_profiles_name on public.profiles(name);
create index if not exists idx_account_credentials_role on public.account_credentials(role);
create unique index if not exists idx_account_credentials_teacher_login_id
on public.account_credentials(teacher_login_id)
where teacher_login_id is not null;

alter table public.account_credentials enable row level security;

drop policy if exists "account_credentials_deny_all" on public.account_credentials;
create policy "account_credentials_deny_all"
on public.account_credentials
for all
to authenticated
using (false)
with check (false);
