import Link from "next/link";

import { PageHeader } from "@/components/common/page-header";
import { QuestionImages } from "@/components/common/question-images";
import { FeedbackForm } from "@/components/teacher/feedback-form";
import { getAuthState } from "@/lib/auth/session";
import { getTeacherSubmissionDetail } from "@/lib/teacher/queries";

export default async function TeacherSubmissionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ assignmentId: string; submissionId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { assignmentId, submissionId } = await params;
  const query = await searchParams;
  const { user, profile } = await getAuthState();

  if (!user || profile?.role !== "teacher") {
    throw new Error("권한이 없는 접근입니다.");
  }

  const detail = await getTeacherSubmissionDetail(assignmentId, submissionId, user.id);
  const submission = detail.submission;
  const answerMap = new Map(detail.submissionAnswers.map((answer) => [answer.question_id, answer]));

  const outlineLinkClass =
    "inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted";

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title={`제출 상세 - ${submission.profiles?.name ?? "학생"}`}
          description="학생 답안을 확인하고 피드백을 작성하세요."
        />
        <Link href={`/teacher/assignments/${assignmentId}`} className={outlineLinkClass}>
          숙제 상세로
        </Link>
      </div>

      {detail.assignmentQuestionType === "mixed" ? (
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border px-2 py-0.5">총 문항 {detail.mixedQuestions.length}개</span>
            <span className="rounded-full border px-2 py-0.5">
              정답 {detail.submissionAnswers.filter((a) => a.is_correct === true).length}개
            </span>
            <span className="rounded-full border px-2 py-0.5">
              오답 {detail.submissionAnswers.filter((a) => a.is_correct === false).length}개
            </span>
            <span className="rounded-full border px-2 py-0.5">
              미응답 {Math.max(detail.mixedQuestions.length - detail.submissionAnswers.length, 0)}개
            </span>
          </div>
          {detail.mixedQuestions.map((question) => {
            const answer = answerMap.get(question.id);
            const selectedIds = new Set(answer?.selected_option_ids ?? []);
            return (
              <div key={question.id} className="space-y-2 rounded-md border p-3">
                <p className="text-sm font-medium">
                  {question.sort_order}. {question.prompt}
                </p>
                <QuestionImages imageUrlJson={question.image_url} />
                {question.question_type === "objective" ? (
                  <div className="space-y-1 text-sm">
                    {question.options.map((option) => {
                      const isSelected = selectedIds.has(option.id);
                      const isCorrect = option.is_correct;
                      return (
                        <p
                          key={option.id}
                          className={
                            isSelected && isCorrect
                              ? "text-emerald-700"
                              : isSelected && !isCorrect
                                ? "text-destructive"
                                : "text-muted-foreground"
                          }
                        >
                          {isSelected ? "선택" : "미선택"} / {isCorrect ? "정답" : "오답"} - {option.option_text}
                        </p>
                      );
                    })}
                    <p className="text-xs text-muted-foreground">
                      문항 결과: {answer?.is_correct === true ? "정답" : answer?.is_correct === false ? "오답" : "미응답"}
                    </p>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {answer?.answer_text?.trim() ? answer.answer_text : "미응답"}
                  </p>
                )}
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground">
            제출 시간: {new Date(submission.submitted_at).toLocaleString("ko-KR")}
          </p>
        </div>
      ) : (
        <div className="space-y-2 rounded-lg border p-4">
          <p className="text-sm font-medium">학생 답안</p>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{submission.answer_text}</p>
          <p className="text-xs text-muted-foreground">
            제출 시간: {new Date(submission.submitted_at).toLocaleString("ko-KR")}
          </p>
        </div>
      )}

      <div className="rounded-lg border p-4">
        <FeedbackForm
          assignmentId={assignmentId}
          submissionId={submissionId}
          defaultValue={submission.feedback_text}
          errorMessage={query.error}
          successMessage={query.success}
        />
      </div>
    </section>
  );
}
