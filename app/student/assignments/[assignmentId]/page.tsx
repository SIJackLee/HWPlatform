import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/common/page-header";
import { AnswerForm } from "@/components/student/answer-form";
import { FeedbackHighlight } from "@/components/student/feedback-highlight";
import { getAuthState } from "@/lib/auth/session";
import { getStudentAssignmentDetail } from "@/lib/student/queries";

export default async function StudentAssignmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ assignmentId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { assignmentId } = await params;
  const query = await searchParams;
  const { user, profile } = await getAuthState();

  if (!user || profile?.role !== "student") {
    throw new Error("권한이 없는 접근입니다.");
  }

  const { assignment, submission } = await getStudentAssignmentDetail(assignmentId, user.id);
  if (!assignment) {
    notFound();
  }

  const outlineLinkClass =
    "inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted md:h-8 md:px-2.5";

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title={assignment.title} description={assignment.description} />
        <Link href="/student/assignments" className={outlineLinkClass}>
          목록으로
        </Link>
      </div>

      <div className="rounded-lg border p-4 text-sm">
        <p>
          <span className="font-medium">마감일:</span> {new Date(assignment.due_at).toLocaleString("ko-KR")}
        </p>
      </div>

      <div className="rounded-lg border p-4">
        <AnswerForm
          assignmentId={assignment.id}
          defaultValue={submission?.answer_text}
          submittedAt={submission?.submitted_at}
          errorMessage={query.error}
        />
      </div>

      <FeedbackHighlight feedback={submission?.feedback_text} />
    </section>
  );
}
