import { AssignmentForm } from "@/components/teacher/assignment-form";
import { PageHeader } from "@/components/common/page-header";
import { getAuthState } from "@/lib/auth/session";
import { getTeacherClassDetail } from "@/lib/teacher/class-queries";
import { getTeacherImageLibraryForForm } from "@/lib/teacher/library-queries";

export default async function TeacherClassAssignmentNewPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { classId } = await params;
  const query = await searchParams;
  const { user, profile } = await getAuthState();
  if (!user || profile?.role !== "teacher") {
    throw new Error("권한이 없는 접근입니다.");
  }

  const [libraryAssets, classDetail] = await Promise.all([
    getTeacherImageLibraryForForm(user.id),
    getTeacherClassDetail(classId, user.id),
  ]);

  return (
    <section className="space-y-4">
      <PageHeader
        title="숙제 등록"
        description={`반: ${classDetail.classInfo.name}`}
      />
      <div className="max-w-2xl rounded-lg border p-4">
        <AssignmentForm errorMessage={query.error} libraryAssets={libraryAssets} classId={classId} />
      </div>
    </section>
  );
}
