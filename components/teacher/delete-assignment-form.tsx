"use client";

import { useEffect, useRef, useState } from "react";

import { deleteAssignment } from "@/actions/teacher";

export function DeleteAssignmentForm({ assignmentId, title }: { assignmentId: string; title?: string }) {
  const [open, setOpen] = useState(false);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;

    cancelButtonRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center justify-center rounded-md border border-destructive/40 bg-destructive/10 px-3 text-sm font-medium text-destructive hover:bg-destructive/20 md:h-7 md:px-2.5 md:text-[0.8rem]"
      >
        삭제
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-assignment-title"
            className="w-full max-w-sm rounded-lg border bg-background p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="delete-assignment-title" className="text-base font-semibold">
              숙제를 삭제할까요?
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {title ? `"${title}"` : "이 숙제"}를 삭제하면 복구할 수 없습니다.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center rounded-md border px-3 text-sm font-medium"
                onClick={() => setOpen(false)}
                ref={cancelButtonRef}
                autoFocus
              >
                취소
              </button>
              <form action={deleteAssignment}>
                <input type="hidden" name="assignmentId" value={assignmentId} />
                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center rounded-md border border-destructive/50 bg-destructive px-3 text-sm font-medium text-white hover:bg-destructive/90"
                >
                  삭제 확인
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
