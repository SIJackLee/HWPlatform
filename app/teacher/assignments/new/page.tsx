import Link from "next/link";

import { AssignmentForm } from "@/components/teacher/assignment-form";
import { PageHeader } from "@/components/common/page-header";
import { getTeacherClasses } from "@/lib/teacher/class-queries";
import { getTeacherImageLibraryForForm } from "@/lib/teacher/library-queries";
import { getAuthState } from "@/lib/auth/session";

export default async function TeacherAssignmentNewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; classId?: string }>;
}) {
  const params = await searchParams;
  const { user, profile } = await getAuthState();
  if (!user || profile?.role !== "teacher") {
    throw new Error("권한이 없는 접근입니다.");
  }

  const classes = await getTeacherClasses(user.id);
  if (classes.length === 0) {
    return (
      <section className="space-y-4">
        <PageHeader title="숙제 등록" description="먼저 반을 만들어 주세요." />
        <Link
          href="/teacher/classes"
          className="inline-flex h-11 items-center justify-center rounded-md border px-3 text-sm"
        >
          반 만들러 가기
        </Link>
      </section>
    );
  }

  const libraryAssets = await getTeacherImageLibraryForForm(user.id);
  const selectedClassId = classes.some((row) => row.id === params.classId) ? (params.classId as string) : classes[0].id;

  return (
    <section className="space-y-4">
      <PageHeader title="숙제 등록" />
      <div className="max-w-2xl rounded-lg border p-4">
        <AssignmentForm
          errorMessage={params.error}
          libraryAssets={libraryAssets}
          classId={selectedClassId}
        />
      </div>
    </section>
  );
}
