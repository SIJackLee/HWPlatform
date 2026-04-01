import Link from "next/link";

import { createInviteCode, revokeInviteCode } from "@/actions/teacher-classes";
import { PageHeader } from "@/components/common/page-header";
import { DeleteAssignmentForm } from "@/components/teacher/delete-assignment-form";
import { DeleteClassForm } from "@/components/teacher/delete-class-form";
import { InviteCodeCopy } from "@/components/teacher/invite-code-copy";
import { getAuthState } from "@/lib/auth/session";
import { getTeacherClassDetail } from "@/lib/teacher/class-queries";

export default async function TeacherClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ error?: string; newCode?: string }>;
}) {
  const { classId } = await params;
  const query = await searchParams;
  const { user, profile } = await getAuthState();
  if (!user || profile?.role !== "teacher") {
    throw new Error("권한이 없는 접근입니다.");
  }

  const detail = await getTeacherClassDetail(classId, user.id);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title={detail.classInfo.name} description="초대코드, 학생, 숙제를 관리합니다." />
        <div className="flex items-center gap-2">
          <DeleteClassForm
            classId={classId}
            className={detail.classInfo.name}
            returnTo="/teacher/classes"
          />
          <Link href="/teacher/classes" className="inline-flex h-9 items-center rounded-md border px-3 text-sm">
            반 목록
          </Link>
        </div>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">초대코드 (기본 유효기간 7일)</p>
          <form action={createInviteCode}>
            <input type="hidden" name="classId" value={classId} />
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
            >
              초대코드 재발급
            </button>
          </form>
        </div>
        {query.newCode ? (
          <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <p className="mb-1">새 초대코드</p>
            <InviteCodeCopy code={query.newCode} />
          </div>
        ) : null}
        {detail.activeInvite ? (
          <div className="rounded-md border px-3 py-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span>최신 초대코드:</span>
              {detail.activeInvite.display_code?.trim() ? (
                <InviteCodeCopy code={detail.activeInvite.display_code} />
              ) : (
                <span className="font-semibold">재발급 후 표시됩니다.</span>
              )}
            </div>
            <p>만료일: {new Date(detail.activeInvite.expires_at).toLocaleString("ko-KR")}</p>
            <p>사용 횟수: {detail.activeInvite.used_count}{detail.activeInvite.max_uses ? ` / ${detail.activeInvite.max_uses}` : ""}</p>
            <form action={revokeInviteCode} className="mt-2">
              <input type="hidden" name="classId" value={classId} />
              <input type="hidden" name="inviteId" value={detail.activeInvite.id} />
              <button type="submit" className="inline-flex h-8 items-center rounded-md border px-2 text-xs text-destructive">
                초대코드 폐기
              </button>
            </form>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">현재 활성 초대코드가 없습니다.</p>
        )}
        {query.error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {query.error}
          </p>
        ) : null}
      </div>

      <div className="rounded-lg border p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-base font-medium">숙제</h3>
          <Link
            href={`/teacher/classes/${classId}/assignments/new`}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
          >
            이 반에 숙제 만들기
          </Link>
        </div>
        {detail.assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">등록된 숙제가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {detail.assignments.map((row) => (
              <li key={row.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <p className="font-medium">{row.title}</p>
                  <p className="text-xs text-muted-foreground">
                    마감일 {new Date(row.due_at).toLocaleDateString("ko-KR")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/teacher/assignments/${row.id}`}
                    className="inline-flex h-8 items-center rounded-md border border-emerald-300 bg-emerald-50 px-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                  >
                    상세
                  </Link>
                  <DeleteAssignmentForm
                    assignmentId={row.id}
                    title={row.title}
                    returnTo={`/teacher/classes/${classId}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border p-4">
        <h3 className="mb-3 text-base font-medium">등록 학생(게스트)</h3>
        {detail.students.length === 0 ? (
          <p className="text-sm text-muted-foreground">아직 입장한 학생이 없습니다.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {detail.students.map((student) => (
              <li key={student.id} className="rounded-md border px-3 py-2 text-sm">
                <p className="font-medium">{student.name}</p>
                <p className="text-xs text-muted-foreground">
                  입장일 {new Date(student.created_at).toLocaleDateString("ko-KR")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
