-- Manual backfill helper
-- Use when assignments.class_id is null after deploying guest/class migration.

insert into public.classes (teacher_id, name)
select distinct a.teacher_id, '기본 반'
from public.assignments a
left join public.classes c on c.teacher_id = a.teacher_id
where c.id is null;

update public.assignments a
set class_id = c.id
from public.classes c
where c.teacher_id = a.teacher_id
  and a.class_id is null;
