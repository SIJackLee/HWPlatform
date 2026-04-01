import { updateAssignment } from "@/actions/teacher";
import { PageHeader } from "@/components/common/page-header";
import { AssignmentForm } from "@/components/teacher/assignment-form";
import { getAuthState } from "@/lib/auth/session";
import { getTeacherImageLibraryForForm } from "@/lib/teacher/library-queries";
import { getTeacherAssignmentForEdit } from "@/lib/teacher/queries";

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function TeacherAssignmentEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ assignmentId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { assignmentId } = await params;
  const query = await searchParams;
  const { user, profile } = await getAuthState();
  if (!user || profile?.role !== "teacher") {
    throw new Error("권한이 없는 접근입니다.");
  }

  const [libraryAssets, editData] = await Promise.all([
    getTeacherImageLibraryForForm(user.id),
    getTeacherAssignmentForEdit(assignmentId, user.id),
  ]);
  if (editData.assignment.question_type !== "mixed") {
    throw new Error("현재는 혼합형 숙제만 수정할 수 있습니다.");
  }

  return (
    <section className="space-y-4">
      <PageHeader
        title="숙제 수정"
        description={
          editData.submissionCount > 0
            ? "이미 제출된 숙제는 수정할 수 없습니다."
            : "제목, 문항, 이미지 정보를 수정할 수 있습니다."
        }
      />
      <div className="max-w-2xl rounded-lg border p-4">
        <AssignmentForm
          mode="edit"
          submitAction={updateAssignment}
          errorMessage={query.error}
          libraryAssets={libraryAssets}
          classId={editData.assignment.class_id}
          initialData={{
            assignmentId: editData.assignment.id,
            classId: editData.assignment.class_id,
            title: editData.assignment.title,
            description: editData.assignment.description,
            dueAt: toDatetimeLocalValue(editData.assignment.due_at),
            mixedQuestions: editData.questions,
          }}
        />
      </div>
    </section>
  );
}
