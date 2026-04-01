"use client";

import { useState } from "react";

export function InviteCodeCopy({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <span className="font-semibold">{code}</span>
      <button
        type="button"
        className="inline-flex h-7 items-center rounded-md border px-2 text-xs hover:bg-muted"
        onClick={() => void onCopy()}
      >
        {copied ? "복사됨" : "복사"}
      </button>
    </div>
  );
}
