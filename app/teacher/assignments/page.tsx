import Link from "next/link";

import { PageHeader } from "@/components/common/page-header";
import { AssignmentTable } from "@/components/teacher/assignment-table";
import { getAuthState } from "@/lib/auth/session";
import { getTeacherAssignments } from "@/lib/teacher/queries";

export default async function TeacherAssignmentsPage() {
  const { user, profile } = await getAuthState();
  if (!user || profile?.role !== "teacher") {
    throw new Error("권한이 없는 접근입니다.");
  }

  const assignments = await getTeacherAssignments(user.id);

  const primaryLinkClass =
    "inline-flex h-11 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80 md:h-8 md:px-2.5";

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <PageHeader title="숙제 목록" description="선생님이 생성한 숙제를 관리합니다." />
        <Link href="/teacher/assignments/new" className={primaryLinkClass}>
          새 숙제 만들기
        </Link>
      </div>
      <AssignmentTable assignments={assignments} />
    </section>
  );
}
