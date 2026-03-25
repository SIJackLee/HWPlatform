export function AssignmentStatusBadge({ status }: { status: "in_progress" | "submitted" }) {
  if (status === "submitted") {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
        제출 완료
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
      진행중
    </span>
  );
}
