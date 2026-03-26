import { AssignmentForm } from "@/components/teacher/assignment-form";
import { PageHeader } from "@/components/common/page-header";
import { getTeacherImageLibraryForForm } from "@/lib/teacher/library-queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthState } from "@/lib/auth/session";

export default async function TeacherAssignmentNewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const { user, profile } = await getAuthState();
  if (!user || profile?.role !== "teacher") {
    throw new Error("권한이 없는 접근입니다.");
  }

  const supabase = createServerSupabaseClient();
  const studentsResult = (await supabase
    .from("profiles")
    .select("id, name")
    .filter("role", "eq", "student")
    .filter("is_active", "eq", true)
    .order("name", { ascending: true })) as unknown as {
    data: Array<{ id: string; name: string }> | null;
    error: { message: string } | null;
  };

  if (studentsResult.error) {
    throw new Error("학생 목록을 불러오지 못했습니다.");
  }

  const libraryAssets = await getTeacherImageLibraryForForm(user.id);

  return (
    <section className="space-y-4">
      <PageHeader title="숙제 등록" description="혼합형(주관식/객관식) 문항을 구성하고 마감일, 대상 학생과 함께 숙제를 등록합니다." />
      <div className="max-w-2xl rounded-lg border p-4">
        <AssignmentForm
          errorMessage={params.error}
          students={studentsResult.data ?? []}
          libraryAssets={libraryAssets}
        />
      </div>
    </section>
  );
}
