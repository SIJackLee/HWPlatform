import Link from "next/link";

import type { SubmissionRow } from "@/types/teacher";

interface SubmissionWithStudent extends SubmissionRow {
  profiles: { name: string } | null;
}

function formatDate(date: string | null) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export function SubmissionTable({
  assignmentId,
  submissions,
}: {
  assignmentId: string;
  submissions: SubmissionWithStudent[];
}) {
  if (submissions.length === 0) {
    return (
      <div className="rounded-lg border px-4 py-8 text-center text-sm text-muted-foreground">
        아직 제출된 답안이 없습니다.
      </div>
    );
  }

  const outlineSmClass =
    "inline-flex h-11 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted md:h-7 md:px-2.5 md:text-[0.8rem]";

  return (
    <div className="overflow-hidden rounded-lg border">
      <ul className="divide-y md:hidden">
        {submissions.map((submission) => (
          <li key={submission.id} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium">{submission.profiles?.name ?? "이름 없음"}</p>
              <span className="rounded-full border px-2 py-0.5 text-xs">제출</span>
            </div>
            <p className="text-sm text-muted-foreground">제출 시간: {formatDate(submission.submitted_at)}</p>
            <p className="text-sm">피드백: {submission.feedback_text ? "작성됨" : "미작성"}</p>
            <Link
              href={`/teacher/assignments/${assignmentId}/submissions/${submission.id}`}
              className={outlineSmClass}
            >
              보기
            </Link>
          </li>
        ))}
      </ul>

      <table className="hidden w-full text-sm md:table">
        <thead className="bg-muted/40 text-left">
          <tr>
            <th className="px-4 py-3 font-medium">학생</th>
            <th className="px-4 py-3 font-medium">제출 여부</th>
            <th className="px-4 py-3 font-medium">제출 시간</th>
            <th className="px-4 py-3 font-medium">피드백</th>
            <th className="px-4 py-3 font-medium">상세</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((submission) => (
            <tr key={submission.id} className="border-t">
              <td className="px-4 py-3">{submission.profiles?.name ?? "이름 없음"}</td>
              <td className="px-4 py-3">제출</td>
              <td className="px-4 py-3">{formatDate(submission.submitted_at)}</td>
              <td className="px-4 py-3">{submission.feedback_text ? "작성됨" : "미작성"}</td>
              <td className="px-4 py-3">
                <Link
                  href={`/teacher/assignments/${assignmentId}/submissions/${submission.id}`}
                  className={outlineSmClass}
                >
                  보기
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
