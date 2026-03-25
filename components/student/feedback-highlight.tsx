export function FeedbackHighlight({ feedback }: { feedback?: string | null }) {
  if (!feedback) {
    return (
      <div className="rounded-lg border px-4 py-3">
        <p className="text-sm font-medium">피드백 상태</p>
        <p className="mt-1 text-sm text-muted-foreground">아직 선생님 피드백이 등록되지 않았습니다.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3">
      <p className="inline-flex rounded-full border border-emerald-300 bg-white px-2 py-0.5 text-xs font-medium text-emerald-700">
        새 피드백 도착
      </p>
      <p className="mt-2 text-sm font-medium text-emerald-700">선생님 피드백</p>
      <p className="mt-2 whitespace-pre-wrap text-sm text-emerald-900">{feedback}</p>
    </div>
  );
}
