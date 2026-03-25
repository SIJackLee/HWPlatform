import Link from "next/link";

import { PageHeader } from "@/components/common/page-header";
import { getAuthState } from "@/lib/auth/session";
import { getStudentDashboardStats } from "@/lib/student/queries";
import { StatsCard } from "@/components/teacher/stats-card";

export default async function StudentDashboardPage() {
  const { user, profile } = await getAuthState();
  if (!user || profile?.role !== "student") {
    throw new Error("권한이 없는 접근입니다.");
  }

  const stats = await getStudentDashboardStats(user.id);

  return (
    <section className="space-y-6">
      <PageHeader
        title={`${profile?.name ?? "학생"} 대시보드`}
        description="내게 할당된 숙제의 진행 상태와 피드백을 확인합니다."
      />
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm font-medium">지금 해야 할 일</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <StatsCard label="미제출 숙제" value={stats.inProgressCount} />
          <StatsCard label="도착한 피드백" value={stats.feedbackCount} />
          <Link
            href="/student/assignments?status=in_progress&sort=due_asc"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            바로 제출하러 가기
          </Link>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard label="진행중 숙제" value={stats.inProgressCount} />
        <StatsCard label="제출 완료 숙제" value={stats.submittedCount} />
        <StatsCard label="도착한 피드백" value={stats.feedbackCount} />
      </div>
    </section>
  );
}
