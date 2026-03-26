-- Run in Supabase SQL editor (once) for existing projects.
alter table if exists public.teacher_image_assets
  add column if not exists original_filename text null;
