import Link from "next/link";

import { PageHeader } from "@/components/common/page-header";
import { AssignmentTable } from "@/components/teacher/assignment-table";
import { getAuthState } from "@/lib/auth/session";
import { getTeacherClasses } from "@/lib/teacher/class-queries";
import { getTeacherAssignments } from "@/lib/teacher/queries";

export default async function TeacherAssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; q?: string }>;
}) {
  const query = await searchParams;
  const { user, profile } = await getAuthState();
  if (!user || profile?.role !== "teacher") {
    throw new Error("권한이 없는 접근입니다.");
  }

  const [assignments, classes] = await Promise.all([
    getTeacherAssignments(user.id),
    getTeacherClasses(user.id),
  ]);

  const selectedClassId =
    query.classId && classes.some((row) => row.id === query.classId) ? query.classId : "all";
  const keyword = (query.q ?? "").trim().toLowerCase();

  const filteredAssignments = assignments.filter((assignment) => {
    const classMatch = selectedClassId === "all" || assignment.class_id === selectedClassId;
    const keywordMatch = keyword.length === 0 || assignment.title.toLowerCase().includes(keyword);
    return classMatch && keywordMatch;
  });

  const primaryLinkClass =
    "inline-flex h-11 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80 md:h-8 md:px-2.5";
  const filterTabClass =
    "inline-flex h-8 items-center justify-center rounded-md border px-2.5 text-xs font-medium";

  function buildHref(nextClassId: string, nextQ: string) {
    const params = new URLSearchParams();
    if (nextClassId !== "all") params.set("classId", nextClassId);
    if (nextQ.trim()) params.set("q", nextQ.trim());
    const queryString = params.toString();
    return queryString ? `/teacher/assignments?${queryString}` : "/teacher/assignments";
  }

  return (
    <section className="space-y-4">
      <div className="mb-6 flex items-center justify-between">
        <PageHeader title="숙제 목록" description="선생님이 생성한 숙제를 관리합니다." />
        <Link href="/teacher/classes" className={primaryLinkClass}>
          반에서 숙제 만들기
        </Link>
      </div>

      <div className="space-y-3 rounded-lg border p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={buildHref("all", query.q ?? "")}
            className={`${filterTabClass} ${
              selectedClassId === "all"
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-background"
            }`}
          >
            전체
          </Link>
          {classes.map((classRow) => (
            <Link
              key={classRow.id}
              href={buildHref(classRow.id, query.q ?? "")}
              className={`${filterTabClass} ${
                selectedClassId === classRow.id
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background"
              }`}
            >
              {classRow.name}
            </Link>
          ))}
        </div>

        <form method="get" className="flex flex-wrap items-center gap-2">
          {selectedClassId !== "all" ? <input type="hidden" name="classId" value={selectedClassId} /> : null}
          <input
            type="text"
            name="q"
            defaultValue={query.q ?? ""}
            placeholder="숙제 제목 검색"
            className="h-9 min-w-52 flex-1 rounded-md border bg-background px-3 text-sm"
          />
          <button type="submit" className="inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm">
            검색
          </button>
          <Link
            href={buildHref(selectedClassId, "")}
            className="inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm"
          >
            초기화
          </Link>
        </form>
      </div>

      <AssignmentTable assignments={filteredAssignments} />
    </section>
  );
}
