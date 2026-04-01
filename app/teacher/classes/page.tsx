import Link from "next/link";

import { createClass } from "@/actions/teacher-classes";
import { PageHeader } from "@/components/common/page-header";
import { DeleteClassForm } from "@/components/teacher/delete-class-form";
import { getAuthState } from "@/lib/auth/session";
import { getTeacherClasses } from "@/lib/teacher/class-queries";

export default async function TeacherClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  const { user, profile } = await getAuthState();
  if (!user || profile?.role !== "teacher") {
    throw new Error("권한이 없는 접근입니다.");
  }

  const classes = await getTeacherClasses(user.id);

  return (
    <section className="space-y-6">
      <PageHeader title="반 관리" description="반을 생성하고 초대코드를 발급합니다." />

      <form action={createClass} className="rounded-lg border p-4">
        <p className="text-sm font-medium">새 반 만들기</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            name="name"
            required
            className="h-11 min-w-64 flex-1 rounded-md border bg-background px-3 text-sm"
            placeholder="예: 3학년 2반 영어"
          />
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            반 생성
          </button>
        </div>
        {query.error ? (
          <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {query.error}
          </p>
        ) : null}
      </form>

      <div className="rounded-lg border">
        {classes.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">아직 생성된 반이 없습니다.</p>
        ) : (
          <ul className="divide-y">
            {classes.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium">{row.name}</p>
                  <p className="text-xs text-muted-foreground">
                    학생 {row.studentCount}명 · 숙제 {row.assignmentCount}개
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/teacher/classes/${row.id}`}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-emerald-300 bg-emerald-50 px-3 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
                  >
                    반 상세
                  </Link>
                  <DeleteClassForm
                    classId={row.id}
                    className={row.name}
                    returnTo="/teacher/classes"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
