import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface TeacherClassListItem {
  id: string;
  name: string;
  assignmentCount: number;
  studentCount: number;
}

export interface TeacherClassDetail {
  classInfo: { id: string; name: string };
  students: Array<{ id: string; name: string; created_at: string }>;
  activeInvite: {
    id: string;
    display_code: string | null;
    expires_at: string;
    max_uses: number | null;
    used_count: number;
  } | null;
  assignments: Array<{ id: string; title: string; due_at: string; created_at: string }>;
}

export async function getTeacherClasses(teacherId: string): Promise<TeacherClassListItem[]> {
  const supabase = createServerSupabaseClient();
  const classesResult = (await supabase
    .from("classes")
    .select("id, name")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: true })) as unknown as {
    data: Array<{ id: string; name: string }> | null;
    error: { message: string } | null;
  };
  if (classesResult.error) throw new Error(classesResult.error.message);

  const classRows = classesResult.data ?? [];
  if (classRows.length === 0) return [];

  const classIds = classRows.map((row) => row.id);
  const [assignmentsResult, studentsResult] = await Promise.all([
    supabase.from("assignments").select("id, class_id").in("class_id", classIds),
    supabase.from("guest_students").select("id, class_id").in("class_id", classIds).is("revoked_at", null),
  ]);
  if (assignmentsResult.error) throw assignmentsResult.error;
  if (studentsResult.error) throw studentsResult.error;

  const assignmentCountMap = new Map<string, number>();
  (assignmentsResult.data ?? []).forEach((row) => {
    assignmentCountMap.set(row.class_id, (assignmentCountMap.get(row.class_id) ?? 0) + 1);
  });
  const studentCountMap = new Map<string, number>();
  (studentsResult.data ?? []).forEach((row) => {
    studentCountMap.set(row.class_id, (studentCountMap.get(row.class_id) ?? 0) + 1);
  });

  return classRows.map((row) => ({
    id: row.id,
    name: row.name,
    assignmentCount: assignmentCountMap.get(row.id) ?? 0,
    studentCount: studentCountMap.get(row.id) ?? 0,
  }));
}

export async function getTeacherClassDetail(classId: string, teacherId: string): Promise<TeacherClassDetail> {
  const supabase = createServerSupabaseClient();
  const classResult = (await supabase
    .from("classes")
    .select("id, name")
    .eq("id", classId)
    .eq("teacher_id", teacherId)
    .single()) as unknown as {
    data: { id: string; name: string } | null;
    error: { message: string } | null;
  };
  if (classResult.error || !classResult.data) throw new Error("반을 찾을 수 없습니다.");

  const [studentsResult, inviteResult, assignmentsResult] = await Promise.all([
    supabase
      .from("guest_students")
      .select("id, name, created_at")
      .eq("class_id", classId)
      .is("revoked_at", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("class_invite_codes")
      .select("id, display_code, expires_at, max_uses, used_count")
      .eq("class_id", classId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("assignments")
      .select("id, title, due_at, created_at")
      .eq("class_id", classId)
      .order("due_at", { ascending: true }),
  ]);
  if (studentsResult.error) throw studentsResult.error;
  if (inviteResult.error) throw inviteResult.error;
  if (assignmentsResult.error) throw assignmentsResult.error;

  return {
    classInfo: classResult.data,
    students: studentsResult.data ?? [],
    activeInvite: inviteResult.data ?? null,
    assignments: assignmentsResult.data ?? [],
  };
}
