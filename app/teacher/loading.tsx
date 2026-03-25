export default function TeacherLoading() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-52 animate-pulse rounded bg-muted" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="h-48 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
