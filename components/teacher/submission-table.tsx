import Link from "next/link";

import type { SubmissionRow } from "@/types/teacher";

interface SubmissionWithStudent extends SubmissionRow {
  guest_students: { name: string } | null;
  objective_correct_count?: number;
  objective_wrong_count?: number;
  objective_graded_count?: number;
}

function formatDate(date: string | null) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export function SubmissionTable({
  assignmentId,
  submissions,
  autoGradeMode,
}: {
  assignmentId: string;
  submissions: SubmissionWithStudent[];
  autoGradeMode: "single" | "mixed" | null;
}) {
  if (submissions.length === 0) {
    return (
      <div className="rounded-lg border px-4 py-8 text-center text-sm text-muted-foreground">
        아직 제출된 답안이 없습니다.
      </div>
    );
  }

  const outlineSmClass =
    "inline-flex h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted md:h-7 md:px-2.5 md:text-[0.8rem]";

  const renderAutoGradeText = (submission: SubmissionWithStudent) => {
    if (autoGradeMode === "single") {
      return {
        text: submission.is_correct === true ? "정답" : submission.is_correct === false ? "오답" : "미채점",
        className:
          submission.is_correct === true
            ? "text-emerald-700"
            : submission.is_correct === false
              ? "text-destructive"
              : "text-muted-foreground",
      };
    }
    if (autoGradeMode === "mixed") {
      const correct = submission.objective_correct_count ?? 0;
      const wrong = submission.objective_wrong_count ?? 0;
      const graded = submission.objective_graded_count ?? 0;
      if (graded === 0) {
        return { text: "미채점", className: "text-muted-foreground" };
      }
      return {
        text: `정답 ${correct} / 오답 ${wrong}`,
        className: wrong > 0 ? "text-destructive" : "text-emerald-700",
      };
    }
    return { text: "-", className: "text-muted-foreground" };
  };

  return (
    <div className="overflow-hidden rounded-lg border">
      <ul className="divide-y md:hidden">
        {submissions.map((submission) => (
          <li key={submission.id} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium">{submission.guest_students?.name ?? "이름 없음"}</p>
              <span className="rounded-full border px-2 py-0.5 text-xs">제출</span>
            </div>
            <p className="text-sm text-muted-foreground">제출 시간: {formatDate(submission.submitted_at)}</p>
            {autoGradeMode ? (
              <p className="text-sm">
                자동채점:{" "}
                <span className={`whitespace-nowrap ${renderAutoGradeText(submission).className}`}>
                  {renderAutoGradeText(submission).text}
                </span>
              </p>
            ) : null}
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
            {autoGradeMode ? <th className="px-4 py-3 font-medium">자동채점</th> : null}
            <th className="px-4 py-3 font-medium">피드백</th>
            <th className="px-4 py-3 font-medium">상세</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((submission) => (
            <tr key={submission.id} className="border-t">
              <td className="px-4 py-3">{submission.guest_students?.name ?? "이름 없음"}</td>
              <td className="px-4 py-3">제출</td>
              <td className="px-4 py-3">{formatDate(submission.submitted_at)}</td>
              {autoGradeMode ? (
                <td className="px-4 py-3">
                  <span className={`whitespace-nowrap ${renderAutoGradeText(submission).className}`}>
                    {renderAutoGradeText(submission).text}
                  </span>
                </td>
              ) : null}
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
