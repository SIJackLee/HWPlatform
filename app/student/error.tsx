"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function StudentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6">
      <h2 className="text-lg font-semibold text-destructive">페이지를 불러오지 못했습니다</h2>
      <p className="mt-2 text-sm text-destructive/90">잠시 후 다시 시도해 주세요.</p>
      <Button className="mt-4" variant="outline" onClick={reset}>
        다시 시도
      </Button>
    </div>
  );
}
