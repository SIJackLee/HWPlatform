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
  const hasObjectiveInMixed = assignment.question_type === "mixed" && mixedQuestions.some((q) => q.question_type === "objective");
  const autoGradeMode: "single" | "mixed" | null =
    assignment.question_type === "objective" ? "single" : hasObjectiveInMixed ? "mixed" : null;

  const outlineLinkClass =
    "inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted md:h-8 md:px-2.5";

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title={assignment.title} description={assignment.description} />
        <div className="flex items-center gap-2">
          <Link href={`/teacher/assignments/${assignment.id}/edit`} className={outlineLinkClass}>
            수정
          </Link>
          <Link href="/teacher/assignments" className={outlineLinkClass}>
            목록으로
          </Link>
        </div>
      </div>

      <div className="rounded-lg border p-4 text-sm">
        <div className="grid gap-2 md:grid-cols-2">
          <p>
            <span className="font-medium">마감일:</span>{" "}
            {new Date(assignment.due_at).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })}
          </p>
          <p>
            <span className="font-medium">반 등록 학생 수:</span> {targetCount}
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
        <details className="rounded-lg border p-4">
          <summary className="cursor-pointer text-base font-medium">문항 (미리보기)</summary>
          <ul className="mt-3 space-y-4">
            {mixedQuestions!.map((question) => (
              <li key={question.id} className="space-y-2 rounded-md border p-3">
                <p className="text-sm font-medium">
                  {question.sort_order}. {question.prompt}
                </p>
                <QuestionImages imageUrlJson={question.image_url} />
                {question.question_type === "objective" ? (
                  <div className="space-y-2 rounded-md border bg-muted/10 p-3">
                    <p className="text-xs font-medium text-muted-foreground">선택지 (정답 표시)</p>
                    <ul className="space-y-1 text-sm">
                      {question.options.length === 0 ? (
                        <li className="text-muted-foreground">등록된 선택지가 없습니다.</li>
                      ) : (
                        question.options.map((option) => (
                          <li key={option.id} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1">
                            <span className="whitespace-pre-wrap">{option.option_text}</span>
                            {option.is_correct ? (
                              <span className="shrink-0 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                정답
                              </span>
                            ) : null}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                ) : null}
                {question.question_type === "subjective" ? (
                  <div className="rounded-md border border-dashed bg-muted/20 p-2">
                    <p className="text-xs font-medium text-muted-foreground">모범답안</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">
                      {question.model_answer?.trim() ? question.model_answer : "입력된 모범답안이 없습니다."}
                    </p>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className="rounded-lg border p-4">
        <h3 className="mb-3 text-base font-medium">반 등록 학생 목록</h3>
        {targets.length === 0 ? (
          <p className="text-sm text-muted-foreground">아직 입장한 학생이 없습니다.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {targets.map((target) => (
              <span key={target.id} className="rounded-full border px-3 py-1 text-xs">
                {target.name ?? "이름 없음"}
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
                {target.name ?? "이름 없음"}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-base font-medium">학생 제출 목록</h3>
        <SubmissionTable
          assignmentId={assignment.id}
          submissions={submissions}
          autoGradeMode={autoGradeMode}
        />
      </div>
    </section>
  );
}
