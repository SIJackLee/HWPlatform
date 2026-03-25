 "use client";

import { useState } from "react";

import { submitAssignmentAnswer } from "@/actions/student";
import { Button } from "@/components/ui/button";

export function AnswerForm({
  assignmentId,
  questionType = "subjective",
  objectiveAllowMultiple = false,
  objectiveOptions = [],
  defaultValue,
  defaultSelectedOptionIds = [],
  mixedQuestions = [],
  defaultMixedAnswers = [],
  submittedAt,
  errorMessage,
}: {
  assignmentId: string;
  questionType?: "subjective" | "objective" | "mixed";
  objectiveAllowMultiple?: boolean;
  objectiveOptions?: Array<{ id: string; option_text: string }>;
  defaultValue?: string;
  defaultSelectedOptionIds?: string[];
  mixedQuestions?: Array<{
    id: string;
    question_type: "subjective" | "objective";
    prompt: string;
    sort_order: number;
    options: Array<{ id: string; option_text: string; sort_order: number }>;
  }>;
  defaultMixedAnswers?: Array<{
    question_id: string;
    answer_text: string | null;
    selected_option_ids: string[];
  }>;
  submittedAt?: string | null;
  errorMessage?: string;
}) {
  const [textLength, setTextLength] = useState((defaultValue ?? "").length);
  const [mixedAnswerMap, setMixedAnswerMap] = useState<Record<string, { text: string; selectedOptionIds: string[] }>>(
    () =>
      Object.fromEntries(
        defaultMixedAnswers.map((answer) => [
          answer.question_id,
          { text: answer.answer_text ?? "", selectedOptionIds: answer.selected_option_ids ?? [] },
        ]),
      ),
  );

  const mixedAnswersPayload = JSON.stringify(
    mixedQuestions.map((question) => ({
      question_id: question.id,
      question_type: question.question_type,
      answer_text: mixedAnswerMap[question.id]?.text ?? "",
      selected_option_ids: mixedAnswerMap[question.id]?.selectedOptionIds ?? [],
    })),
  );
  const completedCount = mixedQuestions.filter((question) => {
    const current = mixedAnswerMap[question.id];
    if (!current) return false;
    if (question.question_type === "objective") {
      return current.selectedOptionIds.length > 0;
    }
    return current.text.trim().length > 0;
  }).length;
  const firstIncompleteQuestion = mixedQuestions.find((question) => {
    const current = mixedAnswerMap[question.id];
    if (!current) return true;
    if (question.question_type === "objective") {
      return current.selectedOptionIds.length === 0;
    }
    return current.text.trim().length === 0;
  });

  return (
    <form action={submitAssignmentAnswer} className="space-y-3 pb-36 md:pb-20">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      {questionType === "mixed" ? <input type="hidden" name="mixedAnswers" value={mixedAnswersPayload} /> : null}
      {questionType === "objective" ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">답안 선택</p>
          <div className="space-y-2 rounded-md border p-3">
            {objectiveOptions.map((option) => (
              <label key={option.id} className="flex items-center gap-2 text-sm">
                <input
                  type={objectiveAllowMultiple ? "checkbox" : "radio"}
                  name="selectedOptionIds"
                  value={option.id}
                  defaultChecked={defaultSelectedOptionIds.includes(option.id)}
                  className="h-4 w-4"
                />
                <span>{option.option_text}</span>
              </label>
            ))}
          </div>
        </div>
      ) : questionType === "mixed" ? (
        <div className="space-y-3">
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <p className="font-medium">진행 상태: {completedCount}/{mixedQuestions.length} 완료</p>
            {firstIncompleteQuestion ? (
              <button
                type="button"
                className="mt-1 text-xs text-primary underline-offset-4 hover:underline"
                onClick={() => {
                  const el = document.getElementById(`mixed-question-${firstIncompleteQuestion.id}`);
                  el?.scrollIntoView({ behavior: "smooth", block: "center" });
                  const textarea = el?.querySelector("textarea") as HTMLTextAreaElement | null;
                  textarea?.focus();
                }}
              >
                미작성 문항으로 이동
              </button>
            ) : null}
          </div>
          {mixedQuestions.map((question) => (
            <div id={`mixed-question-${question.id}`} key={question.id} className="space-y-2 rounded-md border p-3">
              <p className="text-sm font-medium">
                {question.sort_order}. {question.prompt}
              </p>
              {question.question_type === "objective" ? (
                <div className="space-y-2">
                  {question.options.map((option) => (
                    <label key={option.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={(mixedAnswerMap[question.id]?.selectedOptionIds ?? []).includes(option.id)}
                        onChange={(event) =>
                          setMixedAnswerMap((prev) => {
                            const current = prev[question.id] ?? { text: "", selectedOptionIds: [] };
                            const nextIds = event.target.checked
                              ? [...new Set([...current.selectedOptionIds, option.id])]
                              : current.selectedOptionIds.filter((id) => id !== option.id);
                            return { ...prev, [question.id]: { ...current, selectedOptionIds: nextIds } };
                          })
                        }
                      />
                      <span>{option.option_text}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  rows={4}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="답안을 입력하세요."
                  value={mixedAnswerMap[question.id]?.text ?? ""}
                  onChange={(event) =>
                    setMixedAnswerMap((prev) => {
                      const current = prev[question.id] ?? { text: "", selectedOptionIds: [] };
                      return { ...prev, [question.id]: { ...current, text: event.target.value } };
                    })
                  }
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="answerText" className="text-sm font-medium">
              답안 작성
            </label>
            <span className="text-xs text-muted-foreground">글자 수 {textLength}</span>
          </div>
          <textarea
            id="answerText"
            name="answerText"
            rows={8}
            defaultValue={defaultValue ?? ""}
            onChange={(event) => setTextLength(event.target.value.length)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="답안을 입력하세요."
            required
          />
        </div>
      )}
      {submittedAt ? (
        <p className="text-xs text-muted-foreground">마지막 제출 시간: {new Date(submittedAt).toLocaleString("ko-KR")}</p>
      ) : null}
      {errorMessage ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t bg-background/95 px-4 py-3 backdrop-blur md:static md:border-none md:bg-transparent md:px-0 md:py-0">
        <div className="mx-auto w-full max-w-6xl">
          <Button type="submit" className="w-full md:w-auto">
            {submittedAt ? "제출 내용 수정" : "답안 제출"}
          </Button>
        </div>
      </div>
    </form>
  );
}
