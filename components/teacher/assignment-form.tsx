"use client";

import { useMemo, useState } from "react";

import { createAssignment } from "@/actions/teacher";
import { Button } from "@/components/ui/button";

interface StudentOption {
  id: string;
  name: string;
}

type QuestionType = "subjective" | "objective";

interface MixedQuestionDraft {
  id: string;
  type: QuestionType;
  prompt: string;
  options: string[];
  correctOptionIndexes: number[];
  collapsed?: boolean;
}

export function AssignmentForm({
  errorMessage,
  students,
}: {
  errorMessage?: string;
  students: StudentOption[];
}) {
  const [mixedQuestions, setMixedQuestions] = useState<MixedQuestionDraft[]>(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("teacher-assignment-draft");
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as { mixedQuestions?: MixedQuestionDraft[] };
          if (parsed.mixedQuestions && parsed.mixedQuestions.length > 0) {
            return parsed.mixedQuestions;
          }
        } catch {
          // Ignore corrupted local draft
        }
      }
    }
    return [
      {
        id: crypto.randomUUID(),
        type: "subjective",
        prompt: "",
        options: ["", ""],
        correctOptionIndexes: [],
        collapsed: false,
      },
    ];
  });
  const [clientError, setClientError] = useState<string>("");

  const mixedQuestionsPayload = JSON.stringify(
    mixedQuestions.map((question, index) => ({
      type: question.type,
      prompt: question.prompt.trim(),
      sort_order: index + 1,
      options: question.options
        .map((optionText, optionIndex) => ({
          option_text: optionText.trim(),
          is_correct: question.correctOptionIndexes.includes(optionIndex),
          sort_order: optionIndex + 1,
        }))
        .filter((option) => option.option_text.length > 0),
    })),
  );

  function updateMixedQuestion(id: string, updater: (question: MixedQuestionDraft) => MixedQuestionDraft) {
    setMixedQuestions((prev) => prev.map((question) => (question.id === id ? updater(question) : question)));
  }

  const completionText = useMemo(() => {
    const done = mixedQuestions.filter((q) => q.prompt.trim().length > 0).length;
    return `${done}/${mixedQuestions.length} 문항 입력`;
  }, [mixedQuestions]);

  return (
    <form
      action={createAssignment}
      className="space-y-4 pb-24"
      onSubmit={(event) => {
        const invalidIndex = mixedQuestions.findIndex((question) => {
          if (!question.prompt.trim()) return true;
          if (question.type === "objective") {
            const validOptions = question.options.filter((option) => option.trim().length > 0);
            return validOptions.length < 2 || question.correctOptionIndexes.length < 1;
          }
          return false;
        });
        if (invalidIndex >= 0) {
          event.preventDefault();
          setClientError(`${invalidIndex + 1}번 문항 입력을 확인해 주세요.`);
        } else {
          setClientError("");
        }
      }}
    >
      <input type="hidden" name="mixedQuestions" value={mixedQuestionsPayload} />
      <input type="hidden" name="questionType" value="mixed" />
      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium">
          제목
        </label>
        <input
          id="title"
          name="title"
          required
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="예: 영어 단어 암기 숙제"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">문항 유형</p>
        <div className="inline-flex h-11 items-center justify-center rounded-md border border-primary bg-primary/10 px-3 text-sm font-medium">
          혼합형 (주관식 + 객관식)
        </div>
        <p className="text-xs text-muted-foreground">{completionText}</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium">
          설명
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={6}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="숙제 지시사항을 입력하세요."
        />
      </div>

      <div className="space-y-3 rounded-lg border p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">혼합형 문항 구성</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm"
              onClick={() =>
                setMixedQuestions((prev) => [
                  ...prev,
                  {
                    id: crypto.randomUUID(),
                    type: "subjective",
                    prompt: "",
                    options: ["", ""],
                    correctOptionIndexes: [],
                    collapsed: false,
                  },
                ])
              }
            >
              문항 추가
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {mixedQuestions.map((question, idx) => (
            <div key={question.id} className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    className="text-sm font-medium"
                    onClick={() =>
                      updateMixedQuestion(question.id, (prev) => ({ ...prev, collapsed: !prev.collapsed }))
                    }
                  >
                    Q{idx + 1} / {question.type === "objective" ? "객관식" : "주관식"}{" "}
                    {question.collapsed ? "(펼치기)" : "(접기)"}
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="text-xs"
                      disabled={idx === 0}
                      onClick={() =>
                        setMixedQuestions((prev) => {
                          const copied = [...prev];
                          [copied[idx - 1], copied[idx]] = [copied[idx], copied[idx - 1]];
                          return copied;
                        })
                      }
                    >
                      위로
                    </button>
                    <button
                      type="button"
                      className="text-xs"
                      disabled={idx === mixedQuestions.length - 1}
                      onClick={() =>
                        setMixedQuestions((prev) => {
                          const copied = [...prev];
                          [copied[idx + 1], copied[idx]] = [copied[idx], copied[idx + 1]];
                          return copied;
                        })
                      }
                    >
                      아래로
                    </button>
                    {mixedQuestions.length > 1 ? (
                      <button
                        type="button"
                        className="text-xs text-destructive"
                        onClick={() =>
                          setMixedQuestions((prev) => prev.filter((item) => item.id !== question.id))
                        }
                      >
                        삭제
                      </button>
                    ) : null}
                  </div>
                </div>
                {question.collapsed ? null : (
                  <>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={`inline-flex h-10 items-center justify-center rounded-md border text-sm ${
                      question.type === "subjective" ? "border-primary bg-primary/10" : "border-border"
                    }`}
                    onClick={() =>
                      updateMixedQuestion(question.id, (prev) => ({
                        ...prev,
                        type: "subjective",
                        correctOptionIndexes: [],
                      }))
                    }
                  >
                    주관식
                  </button>
                  <button
                    type="button"
                    className={`inline-flex h-10 items-center justify-center rounded-md border text-sm ${
                      question.type === "objective" ? "border-primary bg-primary/10" : "border-border"
                    }`}
                    onClick={() => updateMixedQuestion(question.id, (prev) => ({ ...prev, type: "objective" }))}
                  >
                    객관식
                  </button>
                </div>
                <textarea
                  required
                  rows={2}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="문항 내용을 입력하세요."
                  value={question.prompt}
                  onChange={(event) =>
                    updateMixedQuestion(question.id, (prev) => ({ ...prev, prompt: event.target.value }))
                  }
                />
                {question.type === "objective" ? (
                  <div className="space-y-2">
                    {question.options.map((option, optionIndex) => (
                      <div key={`${question.id}-option-${optionIndex}`} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={question.correctOptionIndexes.includes(optionIndex)}
                          onChange={(event) =>
                            updateMixedQuestion(question.id, (prev) => {
                              const nextIndexes = event.target.checked
                                ? [...new Set([...prev.correctOptionIndexes, optionIndex])]
                                : prev.correctOptionIndexes.filter((idx2) => idx2 !== optionIndex);
                              return { ...prev, correctOptionIndexes: nextIndexes };
                            })
                          }
                        />
                        <input
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                          placeholder={`${optionIndex + 1}번 선택지`}
                          value={option}
                          onChange={(event) =>
                            updateMixedQuestion(question.id, (prev) => ({
                              ...prev,
                              options: prev.options.map((opt, i) => (i === optionIndex ? event.target.value : opt)),
                            }))
                          }
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      className="inline-flex h-8 items-center justify-center rounded-md border px-2 text-xs"
                      onClick={() =>
                        updateMixedQuestion(question.id, (prev) => ({
                          ...prev,
                          options: prev.options.length >= 5 ? prev.options : [...prev.options, ""],
                        }))
                      }
                    >
                      선택지 추가
                    </button>
                  </div>
                ) : null}
                  </>
                )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="dueAt" className="text-sm font-medium">
          마감일
        </label>
        <input
          id="dueAt"
          name="dueAt"
          type="datetime-local"
          required
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">대상 학생 선택 (최소 1명)</p>
        {students.length === 0 ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            등록된 student 계정이 없습니다. 먼저 student 계정을 생성해 주세요.
          </p>
        ) : (
          <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border p-3">
            {students.map((student) => (
              <label key={student.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="studentIds" value={student.id} className="h-4 w-4" />
                <span>{student.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {clientError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {clientError}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-4 py-3 backdrop-blur md:static md:border-none md:bg-transparent md:px-0 md:py-0">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2">
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center rounded-md border px-4 text-sm font-medium"
            onClick={() => {
              window.localStorage.setItem("teacher-assignment-draft", JSON.stringify({ mixedQuestions }));
              setClientError("임시저장되었습니다.");
            }}
          >
            임시저장
          </button>
          <Button type="submit" className="w-full md:w-auto">
            숙제 등록
          </Button>
        </div>
      </div>
    </form>
  );
}
