-- Run in Supabase SQL editor (once).
create table if not exists public.teacher_image_assets (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists teacher_image_assets_teacher_id_created_at_idx
  on public.teacher_image_assets (teacher_id, created_at desc);

alter table public.teacher_image_assets enable row level security;

-- Service role bypasses RLS; anon/auth use policies if you add a browser client later.
comment on table public.teacher_image_assets is 'Teacher-owned images under library/ prefix; assignment questions copy from here.';
