import Link from "next/link";

import { PageHeader } from "@/components/common/page-header";
import { StatsCard } from "@/components/teacher/stats-card";
import { getAuthState } from "@/lib/auth/session";
import { getTeacherDashboardStats } from "@/lib/teacher/queries";

export default async function TeacherDashboardPage() {
  const { user, profile } = await getAuthState();
  if (!user || profile?.role !== "teacher") {
    throw new Error("권한이 없는 접근입니다.");
  }

  const stats = await getTeacherDashboardStats(user.id);

  return (
    <section className="space-y-6">
      <PageHeader
        title={`${profile?.name ?? "선생님"} 대시보드`}
        description="숙제 생성, 제출 현황 확인, 피드백 작성의 시작 지점입니다."
      />
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm font-medium">빠른 작업</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/teacher/assignments/new"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            새 숙제 만들기
          </Link>
          <Link
            href="/teacher/assignments"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted"
          >
            제출 현황 보기
          </Link>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard label="총 숙제 수" value={stats.totalAssignments} />
        <StatsCard label="총 제출 수" value={stats.totalSubmissions} />
        <StatsCard label="제출 현황 요약" value={`${stats.recentSubmissionRate}%`} helper="총 제출 수 / 총 숙제 수 기준" />
      </div>

      <div className="rounded-lg border p-4">
        <h3 className="text-sm font-medium">최근 숙제</h3>
        {stats.recentAssignments.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">최근 숙제가 없습니다.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {stats.recentAssignments.map((assignment) => (
              <li key={assignment.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                <span>{assignment.title}</span>
                <span className="text-muted-foreground">
                  {new Date(assignment.created_at).toLocaleDateString("ko-KR")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
