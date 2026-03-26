"use client";

import { useEffect, useRef, useState } from "react";

import { parseImageUrls } from "@/lib/assignment-question-images";

export function QuestionImages({ imageUrlJson }: { imageUrlJson: string | null | undefined }) {
  const urls = parseImageUrls(imageUrlJson);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!lightboxUrl) return;
    closeButtonRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxUrl(null);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [lightboxUrl]);

  if (urls.length === 0) return null;

  return (
    <>
      <div className="space-y-2">
        {urls.map((url, idx) => (
          <button
            key={`img-${idx}`}
            type="button"
            className="block w-full max-w-full cursor-zoom-in rounded-md border bg-background text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setLightboxUrl(url)}
            aria-label={`문항 이미지 ${idx + 1} 크게 보기`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- 동적 URL */}
            <img
              src={url}
              alt={`문항 이미지 ${idx + 1}`}
              loading="lazy"
              className="max-h-[min(70vh,28rem)] w-full rounded-md object-contain"
            />
          </button>
        ))}
      </div>
      {lightboxUrl ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="이미지 확대"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            ref={closeButtonRef}
            className="absolute right-4 top-4 rounded-md border border-white/30 bg-black/50 px-3 py-1 text-sm text-white"
            onClick={() => setLightboxUrl(null)}
          >
            닫기 (Esc)
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt=""
            className="max-h-[90vh] max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}
