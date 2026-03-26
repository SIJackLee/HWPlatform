import Link from "next/link";

import { PageHeader } from "@/components/common/page-header";
import { QuestionImages } from "@/components/common/question-images";
import { SubmissionTable } from "@/components/teacher/submission-table";
import { getAuthState } from "@/lib/auth/session";
import { getTeacherAssignmentDetail } from "@/lib/teacher/queries";

export default async function TeacherAssignmentDetailPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  const { user, profile } = await getAuthState();

  if (!user || profile?.role !== "teacher") {
    throw new Error("권한이 없는 접근입니다.");
  }

  const {
    assignment,
    submissions,
    targets,
    targetCount,
    submittedCount,
    notSubmittedCount,
    notSubmittedTargets,
    mixedQuestions,
  } = await getTeacherAssignmentDetail(assignmentId, user.id);

  const outlineLinkClass =
    "inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted md:h-8 md:px-2.5";

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title={assignment.title} description={assignment.description} />
        <Link href="/teacher/assignments" className={outlineLinkClass}>
          목록으로
        </Link>
      </div>

      <div className="rounded-lg border p-4 text-sm">
        <div className="grid gap-2 md:grid-cols-2">
          <p>
            <span className="font-medium">마감일:</span>{" "}
            {new Date(assignment.due_at).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })}
          </p>
          <p>
            <span className="font-medium">대상 학생 수:</span> {targetCount}
          </p>
          <p>
            <span className="font-medium">제출 수:</span> {submittedCount}
          </p>
          <p>
            <span className="font-medium">미제출 수:</span> {notSubmittedCount}
          </p>
        </div>
      </div>

      {assignment.question_type === "mixed" && (mixedQuestions?.length ?? 0) > 0 ? (
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-base font-medium">문항 (미리보기)</h3>
          <ul className="space-y-4">
            {mixedQuestions!.map((question) => (
              <li key={question.id} className="space-y-2 rounded-md border p-3">
                <p className="text-sm font-medium">
                  {question.sort_order}. {question.prompt}
                </p>
                <QuestionImages imageUrlJson={question.image_url} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-lg border p-4">
        <h3 className="mb-3 text-base font-medium">대상 학생 목록</h3>
        {targets.length === 0 ? (
          <p className="text-sm text-muted-foreground">설정된 대상 학생이 없습니다.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {targets.map((target) => (
              <span key={target.id} className="rounded-full border px-3 py-1 text-xs">
                {target.profiles?.name ?? "이름 없음"}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border p-4">
        <h3 className="mb-3 text-base font-medium">미제출 학생</h3>
        {notSubmittedTargets.length === 0 ? (
          <p className="text-sm text-muted-foreground">현재 미제출 학생이 없습니다.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {notSubmittedTargets.map((target) => (
              <li key={target.id} className="rounded-md border px-3 py-2">
                {target.profiles?.name ?? "이름 없음"}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-base font-medium">학생 제출 목록</h3>
        <SubmissionTable assignmentId={assignment.id} submissions={submissions} />
      </div>
    </section>
  );
}
