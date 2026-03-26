"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createAssignment, deleteTeacherLibraryImage, uploadTeacherLibraryImage } from "@/actions/teacher";
import { Button } from "@/components/ui/button";
import type { TeacherLibraryAssetPreview } from "@/lib/teacher/library-queries";

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
  /** 선택한 라이브러리 asset id (순서 유지). 서버에서 문항 경로로 복사됨. */
  libraryAssetIds: string[];
}

const DRAFT_STORAGE_KEY = "teacher-assignment-draft";

function formatDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function normalizeDraftQuestions(raw: unknown): MixedQuestionDraft[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const q = item as Partial<MixedQuestionDraft>;
    return {
      id: typeof q.id === "string" ? q.id : crypto.randomUUID(),
      type: q.type === "objective" ? "objective" : "subjective",
      prompt: typeof q.prompt === "string" ? q.prompt : "",
      options: Array.isArray(q.options) ? q.options.map((o) => String(o)) : ["", ""],
      correctOptionIndexes: Array.isArray(q.correctOptionIndexes)
        ? q.correctOptionIndexes.filter((n): n is number => typeof n === "number")
        : [],
      collapsed: q.collapsed,
      libraryAssetIds: Array.isArray(q.libraryAssetIds)
        ? q.libraryAssetIds.filter((id): id is string => typeof id === "string")
        : [],
    };
  });
}

export function AssignmentForm({
  errorMessage,
  students,
  libraryAssets,
}: {
  errorMessage?: string;
  students: StudentOption[];
  libraryAssets: TeacherLibraryAssetPreview[];
}) {
  const router = useRouter();
  const libraryFileInputRef = useRef<HTMLInputElement | null>(null);
  const dueAtInputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!saved) return null;
      const parsed = JSON.parse(saved) as { savedAt?: number };
      return typeof parsed.savedAt === "number" ? parsed.savedAt : null;
    } catch {
      return null;
    }
  });

  const [mixedQuestions, setMixedQuestions] = useState<MixedQuestionDraft[]>(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as { mixedQuestions?: unknown };
          if (parsed.mixedQuestions && Array.isArray(parsed.mixedQuestions) && parsed.mixedQuestions.length > 0) {
            return normalizeDraftQuestions(parsed.mixedQuestions);
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
        libraryAssetIds: [],
      },
    ];
  });
  const [clientError, setClientError] = useState<string>("");
  const [libraryError, setLibraryError] = useState<string>("");
  const [libraryUploading, setLibraryUploading] = useState(false);
  const [librarySuccess, setLibrarySuccess] = useState<string | null>(null);
  const [pickerTargetId, setPickerTargetId] = useState<string | null>(null);
  const [pickerOrder, setPickerOrder] = useState<string[]>([]);

  const previewById = useMemo(() => new Map(libraryAssets.map((a) => [a.id, a.previewUrl])), [libraryAssets]);

  const mixedQuestionsPayload = JSON.stringify(
    mixedQuestions.map((question, index) => ({
      type: question.type,
      prompt: question.prompt.trim(),
      sort_order: index + 1,
      library_asset_ids: question.libraryAssetIds,
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

  async function handleLibraryUploadClick() {
    setLibraryError("");
    setLibrarySuccess(null);
    const input = libraryFileInputRef.current;
    const file = input?.files?.[0];
    if (!file) {
      setLibraryError("파일을 선택해 주세요.");
      return;
    }
    setLibraryUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const result = await uploadTeacherLibraryImage(fd);
      if (!result.ok) {
        setLibraryError(result.error);
        return;
      }
      if (input) input.value = "";
      setLibrarySuccess("라이브러리에 추가되었습니다.");
      window.setTimeout(() => setLibrarySuccess(null), 4000);
      router.refresh();
    } finally {
      setLibraryUploading(false);
    }
  }

  async function handleLibraryDelete(assetId: string) {
    if (!window.confirm("이 이미지를 라이브러리에서 삭제할까요?")) return;
    setLibraryError("");
    const fd = new FormData();
    fd.set("assetId", assetId);
    const result = await deleteTeacherLibraryImage(fd);
    if (!result.ok) {
      setLibraryError(result.error);
      return;
    }
    setMixedQuestions((prev) =>
      prev.map((q) => ({
        ...q,
        libraryAssetIds: q.libraryAssetIds.filter((id) => id !== assetId),
      })),
    );
    router.refresh();
  }

  function openPicker(questionId: string) {
    const q = mixedQuestions.find((x) => x.id === questionId);
    setPickerOrder([...(q?.libraryAssetIds ?? [])]);
    setPickerTargetId(questionId);
  }

  function togglePickerAsset(assetId: string) {
    setPickerOrder((prev) =>
      prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId],
    );
  }

  function applyPicker() {
    if (pickerTargetId) {
      updateMixedQuestion(pickerTargetId, (prev) => ({ ...prev, libraryAssetIds: [...pickerOrder] }));
    }
    setPickerTargetId(null);
  }

  function moveLibraryAssetInQuestion(questionId: string, index: number, delta: -1 | 1) {
    updateMixedQuestion(questionId, (prev) => {
      const ids = [...prev.libraryAssetIds];
      const j = index + delta;
      if (j < 0 || j >= ids.length) return prev;
      const t = ids[index];
      const u = ids[j];
      if (t === undefined || u === undefined) return prev;
      ids[index] = u;
      ids[j] = t;
      return { ...prev, libraryAssetIds: ids };
    });
  }

  function setDuePreset(kind: "tomorrow" | "week") {
    const el = dueAtInputRef.current;
    if (!el) return;
    const d = new Date();
    if (kind === "tomorrow") d.setDate(d.getDate() + 1);
    else d.setDate(d.getDate() + 7);
    d.setSeconds(0, 0);
    el.value = formatDatetimeLocalValue(d);
  }

  useEffect(() => {
    if (!pickerTargetId) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPickerTargetId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [pickerTargetId]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      const form = formRef.current;
      const titleEl = form?.elements.namedItem("title") as HTMLInputElement | undefined;
      const descEl = form?.elements.namedItem("description") as HTMLTextAreaElement | undefined;
      const title = titleEl?.value?.trim() ?? "";
      const desc = descEl?.value?.trim() ?? "";
      const hasQuestionDraft =
        mixedQuestions.length > 1 ||
        mixedQuestions.some((q) => q.prompt.trim().length > 0 || q.libraryAssetIds.length > 0);
      if (title || desc || hasQuestionDraft) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [mixedQuestions]);

  return (
    <form
      ref={formRef}
      action={createAssignment}
      className="space-y-4 pb-32 md:pb-24"
      onSubmit={(event) => {
        const formEl = event.currentTarget as HTMLFormElement;
        const dueAtInput = formEl.elements.namedItem("dueAt") as HTMLInputElement | null;
        if (dueAtInput?.value) {
          const due = new Date(dueAtInput.value);
          if (!Number.isNaN(due.getTime()) && due.getTime() <= Date.now() + 5000) {
            event.preventDefault();
            setClientError("마감일은 현재 시간보다 최소 1분 이후로 설정해 주세요.");
            return;
          }
        }

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

      <div className="rounded-md border border-dashed bg-muted/20 p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">작성 전 확인</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>제목·설명·마감일·대상 학생을 모두 지정했는지 확인하세요.</li>
          <li>문항 이미지는 라이브러리 순서대로 복사되며, 썸네일 옆 화살표로 순서를 바꿀 수 있습니다.</li>
          <li>임시저장은 이 브라우저에만 저장됩니다.</li>
        </ul>
      </div>

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
        {draftSavedAt ? (
          <p className="text-xs text-muted-foreground">
            마지막 임시저장: {new Date(draftSavedAt).toLocaleString("ko-KR")}
          </p>
        ) : null}
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
        <div>
          <p className="text-sm font-medium">이미지 라이브러리</p>
          <p className="text-xs text-muted-foreground">
            미리 올려 두고 아래 각 문항에서 선택해 넣을 수 있습니다. 숙제 저장 시 문항별로 복사되어 저장됩니다.
          </p>
        </div>
        <div
          className="flex flex-wrap items-end gap-2 rounded-md border border-dashed border-muted-foreground/25 bg-muted/10 p-3"
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const file = e.dataTransfer.files?.[0];
            if (!file || !file.type.startsWith("image/")) return;
            const input = libraryFileInputRef.current;
            if (!input) return;
            const dt = new DataTransfer();
            dt.items.add(file);
            input.files = dt.files;
          }}
        >
          <input
            ref={libraryFileInputRef}
            type="file"
            name="file"
            accept="image/*"
            className="max-w-full text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            disabled={libraryUploading}
            onClick={() => void handleLibraryUploadClick()}
          >
            {libraryUploading ? "업로드 중…" : "라이브러리에 추가"}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">이미지 파일을 이 영역에 끌어다 놓을 수도 있습니다.</p>
        {librarySuccess ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-400" role="status">
            {librarySuccess}
          </p>
        ) : null}
        {libraryError ? (
          <p className="text-sm text-destructive">{libraryError}</p>
        ) : null}
        {libraryAssets.length === 0 ? (
          <p className="text-xs text-muted-foreground">아직 라이브러리에 이미지가 없습니다.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {libraryAssets.map((asset) => (
              <div key={asset.id} className="relative overflow-hidden rounded-md border bg-muted/30">
                {/* eslint-disable-next-line @next/next/no-img-element -- 동적 서명 URL */}
                <img
                  src={asset.previewUrl}
                  alt=""
                  className="h-24 w-full object-cover"
                />
                <button
                  type="button"
                  className="absolute right-1 top-1 rounded bg-background/90 px-1.5 text-xs text-destructive shadow"
                  onClick={() => void handleLibraryDelete(asset.id)}
                  aria-label="라이브러리에서 삭제"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-lg border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">혼합형 문항 구성</p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-md border px-2 text-xs"
              onClick={() => setMixedQuestions((prev) => prev.map((q) => ({ ...q, collapsed: false })))}
            >
              모두 펼치기
            </button>
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-md border px-2 text-xs"
              onClick={() => setMixedQuestions((prev) => prev.map((q) => ({ ...q, collapsed: true })))}
            >
              모두 접기
            </button>
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
                    libraryAssetIds: [],
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
                      onClick={() => setMixedQuestions((prev) => prev.filter((item) => item.id !== question.id))}
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
                  <div className="space-y-2">
                    <p className="text-sm font-medium">문항 이미지</p>
                    {question.libraryAssetIds.length > 0 ? (
                      <div className="-mx-1 flex gap-2 overflow-x-auto pb-1">
                        {question.libraryAssetIds.map((assetId, libIdx) => (
                          <div
                            key={`${question.id}-lib-${assetId}`}
                            className="relative flex shrink-0 flex-col items-center gap-1"
                          >
                            <div className="relative h-16 w-16 overflow-hidden rounded border">
                              {previewById.get(assetId) ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={previewById.get(assetId)}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-muted text-[10px]">
                                  없음
                                </div>
                              )}
                              <button
                                type="button"
                                className="absolute right-0 top-0 rounded-bl bg-background/90 px-1 text-[10px]"
                                onClick={() =>
                                  updateMixedQuestion(question.id, (prev) => ({
                                    ...prev,
                                    libraryAssetIds: prev.libraryAssetIds.filter((id) => id !== assetId),
                                  }))
                                }
                              >
                                ×
                              </button>
                            </div>
                            <div className="flex gap-0.5">
                              <button
                                type="button"
                                className="rounded border px-1 text-[10px] disabled:opacity-40"
                                disabled={libIdx === 0}
                                onClick={() => moveLibraryAssetInQuestion(question.id, libIdx, -1)}
                                aria-label="앞으로"
                              >
                                ←
                              </button>
                              <button
                                type="button"
                                className="rounded border px-1 text-[10px] disabled:opacity-40"
                                disabled={libIdx >= question.libraryAssetIds.length - 1}
                                onClick={() => moveLibraryAssetInQuestion(question.id, libIdx, 1)}
                                aria-label="뒤로"
                              >
                                →
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="inline-flex h-9 items-center rounded-md border px-3 text-sm"
                        onClick={() => openPicker(question.id)}
                      >
                        라이브러리에서 선택
                      </button>
                    </div>
                    <label className="block text-xs text-muted-foreground">
                      이 기기에서 직접 추가 (라이브러리 선택 뒤에 이어서 붙습니다)
                    </label>
                    <input type="file" name={`questionImageFiles_${idx}`} accept="image/*" multiple />
                  </div>
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="dueAt" className="text-sm font-medium">
            마감일
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md border px-2 py-1 text-xs"
              onClick={() => setDuePreset("tomorrow")}
            >
              내일 같은 시각
            </button>
            <button
              type="button"
              className="rounded-md border px-2 py-1 text-xs"
              onClick={() => setDuePreset("week")}
            >
              일주일 후 같은 시각
            </button>
          </div>
        </div>
        <input
          ref={dueAtInputRef}
          id="dueAt"
          name="dueAt"
          type="datetime-local"
          required
          className="w-full rounded-md border bg-background px-3 py-2 text-base md:text-sm"
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
      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] backdrop-blur md:static md:border-none md:bg-transparent md:px-0 md:py-0 md:pb-0">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2">
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center rounded-md border px-4 text-sm font-medium"
            onClick={() => {
              const savedAt = Date.now();
              window.localStorage.setItem(
                DRAFT_STORAGE_KEY,
                JSON.stringify({ mixedQuestions, savedAt }),
              );
              setDraftSavedAt(savedAt);
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

      {pickerTargetId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg border bg-background p-4 shadow-lg">
            <p className="text-sm font-medium">라이브러리에서 이미지 선택</p>
            <p className="mt-1 text-xs text-muted-foreground">이미지를 눌러 선택/해제합니다. 순서는 선택한 순서입니다.</p>
            {libraryAssets.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">라이브러리가 비어 있습니다. 먼저 위에서 이미지를 추가하세요.</p>
            ) : (
              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {libraryAssets.map((asset) => {
                  const selected = pickerOrder.includes(asset.id);
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => togglePickerAsset(asset.id)}
                      className={`relative overflow-hidden rounded-md border-2 p-0 ${
                        selected ? "border-primary" : "border-transparent"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={asset.previewUrl} alt="" className="h-20 w-full object-cover" />
                      {selected ? (
                        <span className="absolute bottom-1 left-1 rounded bg-primary px-1 text-[10px] text-primary-foreground">
                          {pickerOrder.indexOf(asset.id) + 1}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPickerTargetId(null)}>
                취소
              </Button>
              <Button type="button" onClick={applyPicker}>
                적용
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}
