import Link from "next/link";

import { PageHeader } from "@/components/common/page-header";
import { StatsCard } from "@/components/teacher/stats-card";
import { getAuthState } from "@/lib/auth/session";
import { getTeacherDashboardStats } from "@/lib/teacher/queries";

export default async function TeacherDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}) {
  const query = await searchParams;
  const { user, profile } = await getAuthState();
  if (!user || profile?.role !== "teacher") {
    throw new Error("권한이 없는 접근입니다.");
  }

  const stats = await getTeacherDashboardStats(user.id);
  const selectedClassId =
    query.classId && stats.classSummaries.some((row) => row.classId === query.classId)
      ? query.classId
      : "all";
  const selectedClassLabel =
    selectedClassId === "all"
      ? "전체 반"
      : stats.classSummaries.find((row) => row.classId === selectedClassId)?.className ?? "반";
  const filteredStudents =
    selectedClassId === "all"
      ? stats.classStudents
      : stats.classStudents.filter((row) => row.classId === selectedClassId);
  const filteredRecentSubmissions =
    selectedClassId === "all"
      ? stats.recentSubmissions
      : stats.recentSubmissions.filter((row) => row.classId === selectedClassId);
  const filteredRecentAssignments =
    selectedClassId === "all"
      ? stats.recentAssignments
      : stats.recentAssignments.filter((row) => row.class_id === selectedClassId);

  function classHref(classId: string) {
    return classId === "all" ? "/teacher/dashboard" : `/teacher/dashboard?classId=${classId}`;
  }

  function getRiskBadge(notSubmittedCount: number) {
    if (notSubmittedCount >= 8) {
      return {
        label: "위험",
        className: "border-red-300 bg-red-50 text-red-700",
      };
    }
    if (notSubmittedCount >= 3) {
      return {
        label: "주의",
        className: "border-amber-300 bg-amber-50 text-amber-700",
      };
    }
    return {
      label: "정상",
      className: "border-emerald-300 bg-emerald-50 text-emerald-700",
    };
  }

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
            href="/teacher/classes"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            반/초대코드 관리
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
        <StatsCard label="총 반 수" value={stats.totalClasses} />
        <StatsCard label="총 학생 수" value={stats.totalStudents} />
        <StatsCard label="총 숙제 수" value={stats.totalAssignments} />
        <StatsCard label="총 제출 수" value={stats.totalSubmissions} />
        <StatsCard
          label="제출 현황 요약"
          value={`${stats.recentSubmissionRate}%`}
          helper="총 제출 수 / 총 숙제 수 기준"
        />
      </div>

      <div className="rounded-lg border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={classHref("all")}
            className={`inline-flex h-8 items-center rounded-md border px-2.5 text-xs ${
              selectedClassId === "all" ? "border-primary bg-primary/10" : ""
            }`}
          >
            전체 반
          </Link>
          {stats.classSummaries.map((classRow) => (
            <Link
              key={classRow.classId}
              href={classHref(classRow.classId)}
              className={`inline-flex h-8 items-center rounded-md border px-2.5 text-xs ${
                selectedClassId === classRow.classId ? "border-primary bg-primary/10" : ""
              }`}
            >
              {classRow.className}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {stats.classSummaries.map((classRow) => {
          const risk = getRiskBadge(classRow.notSubmittedCount);
          return (
            <div key={classRow.classId} className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{classRow.className}</h3>
              <div className="flex items-center gap-2">
                <span className={`inline-flex h-6 items-center rounded-full border px-2 text-xs font-medium ${risk.className}`}>
                  {risk.label}
                </span>
                <Link href={`/teacher/classes/${classRow.classId}`} className="text-xs underline underline-offset-2">
                  반 상세
                </Link>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <span className="rounded-md border px-2 py-1">숙제 {classRow.assignmentCount}개</span>
              <span className="rounded-md border px-2 py-1">학생 {classRow.studentCount}명</span>
              <span className="rounded-md border px-2 py-1">제출 {classRow.submittedCount}건</span>
              <span className="rounded-md border px-2 py-1">미제출 {classRow.notSubmittedCount}건</span>
            </div>
          </div>
          );
        })}
      </div>

      <div className="rounded-lg border p-4">
        <h3 className="text-sm font-medium">{selectedClassLabel} 최근 숙제</h3>
        {filteredRecentAssignments.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">최근 숙제가 없습니다.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {filteredRecentAssignments.map((assignment) => (
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

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-medium">{selectedClassLabel} 학생 목록</h3>
          {filteredStudents.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">표시할 학생이 없습니다.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {filteredStudents.map((student) => (
                <li key={student.studentId} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span>{student.studentName}</span>
                  <span className="text-xs text-muted-foreground">
                    제출 {student.submittedCount} / 미제출 {student.inProgressCount}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-medium">{selectedClassLabel} 최근 제출</h3>
          {filteredRecentSubmissions.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">최근 제출이 없습니다.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {filteredRecentSubmissions.map((row) => (
                <li key={row.submissionId} className="rounded-md border px-3 py-2">
                  <p className="font-medium">{row.assignmentTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.studentName} · {row.className} · {new Date(row.submittedAt).toLocaleString("ko-KR")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
