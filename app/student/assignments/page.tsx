import Link from "next/link";

import { PageHeader } from "@/components/common/page-header";
import { AssignmentListTable } from "@/components/student/assignment-list-table";
import { getGuestAuthState } from "@/lib/auth/guest-auth";
import { getStudentAssignments } from "@/lib/student/queries";

type AssignmentFilter = "all" | "in_progress" | "submitted";
type AssignmentSort = "due_asc" | "due_desc";

function sortItems<T extends { due_at: string }>(items: T[], sort: AssignmentSort) {
  const copied = [...items];
  copied.sort((a, b) =>
    sort === "due_desc"
      ? new Date(b.due_at).getTime() - new Date(a.due_at).getTime()
      : new Date(a.due_at).getTime() - new Date(b.due_at).getTime(),
  );
  return copied;
}

export default async function StudentAssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: AssignmentFilter; sort?: AssignmentSort }>;
}) {
  const { user, profile } = await getGuestAuthState();
  if (!user || !profile) {
    throw new Error("권한이 없는 접근입니다.");
  }

  const query = await searchParams;
  const items = await getStudentAssignments(user.id);
  const status = query.status === "in_progress" || query.status === "submitted" ? query.status : "all";
  const sort = query.sort === "due_desc" ? "due_desc" : "due_asc";

  const sortedItems = sortItems(items, sort);
  const filteredItems =
    status === "all" ? sortedItems : sortedItems.filter((item) => item.status === status);

  const filterTabs: Array<{ value: AssignmentFilter; label: string }> = [
    { value: "all", label: "전체" },
    { value: "in_progress", label: "진행중" },
    { value: "submitted", label: "제출완료" },
  ];

  const tabClass =
    "inline-flex h-11 min-w-20 items-center justify-center rounded-md border px-3 text-sm font-medium";

  return (
    <section className="space-y-6">
      <PageHeader title="내 숙제" description="내게 할당된 숙제를 확인하고 답안을 제출합니다." />

      <div className="rounded-lg border p-3">
        <div className="flex flex-wrap items-center gap-2">
          {filterTabs.map((tab) => (
            <Link
              key={tab.value}
              href={`/student/assignments?status=${tab.value}&sort=${sort}`}
              className={`${tabClass} ${
                status === tab.value ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background"
              }`}
            >
              {tab.label}
            </Link>
          ))}
          <Link
            href={`/student/assignments?status=${status}&sort=${sort === "due_asc" ? "due_desc" : "due_asc"}`}
            className={`${tabClass} border-border bg-background`}
          >
            {sort === "due_asc" ? "마감 빠른순" : "마감 늦은순"}
          </Link>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="space-y-3 rounded-lg border px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">조건에 맞는 숙제가 없습니다.</p>
          <Link
            href="/student/assignments?status=all&sort=due_asc"
            className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-muted"
          >
            전체 숙제 보기
          </Link>
        </div>
      ) : (
        <AssignmentListTable items={filteredItems} />
      )}
    </section>
  );
}
