import Link from "next/link";

import { DeleteAssignmentForm } from "@/components/teacher/delete-assignment-form";
import type { TeacherAssignmentListItem } from "@/types/teacher";

function formatDate(date: string) {
  return new Date(date).toLocaleString("ko-KR");
}

export function AssignmentTable({ assignments }: { assignments: TeacherAssignmentListItem[] }) {
  if (assignments.length === 0) {
    return (
      <div className="rounded-lg border px-4 py-8 text-center text-sm text-muted-foreground">
        등록된 숙제가 없습니다. 새 숙제를 생성해 주세요.
      </div>
    );
  }

  const outlineSmClass =
    "inline-flex h-11 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted md:h-7 md:px-2.5 md:text-[0.8rem]";

  return (
    <div className="overflow-hidden rounded-lg border">
      <ul className="divide-y md:hidden">
        {assignments.map((assignment) => (
          <li key={assignment.id} className="space-y-3 p-4">
            <p className="font-medium">{assignment.title}</p>
            <p className="text-sm">
              유형:{" "}
              {assignment.question_type === "objective"
                ? "객관식"
                : assignment.question_type === "mixed"
                  ? "혼합형"
                  : "주관식"}
            </p>
            <p className="text-sm text-muted-foreground">마감일: {formatDate(assignment.due_at)}</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border px-2 py-0.5">문항 {assignment.questionCount}개</span>
              <span className="rounded-full border px-2 py-0.5">미제출 {assignment.notSubmittedCount}명</span>
            </div>
            <p className="text-sm text-muted-foreground">생성일: {formatDate(assignment.created_at)}</p>
            <div className="flex items-center gap-2">
              <Link href={`/teacher/assignments/${assignment.id}`} className={outlineSmClass}>
                보기
              </Link>
              <DeleteAssignmentForm assignmentId={assignment.id} title={assignment.title} />
            </div>
          </li>
        ))}
      </ul>

      <table className="hidden w-full text-sm md:table">
        <thead className="bg-muted/40 text-left">
          <tr>
            <th className="px-4 py-3 font-medium">제목</th>
            <th className="px-4 py-3 font-medium">유형</th>
            <th className="px-4 py-3 font-medium">마감일</th>
            <th className="px-4 py-3 font-medium">문항 수</th>
            <th className="px-4 py-3 font-medium">미제출</th>
            <th className="px-4 py-3 font-medium">생성일</th>
            <th className="px-4 py-3 font-medium">작업</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((assignment) => (
            <tr key={assignment.id} className="border-t">
              <td className="px-4 py-3">{assignment.title}</td>
              <td className="px-4 py-3">
                {assignment.question_type === "objective"
                  ? "객관식"
                  : assignment.question_type === "mixed"
                    ? "혼합형"
                    : "주관식"}
              </td>
              <td className="px-4 py-3">{formatDate(assignment.due_at)}</td>
              <td className="px-4 py-3">{assignment.questionCount}개</td>
              <td className="px-4 py-3">{assignment.notSubmittedCount}명</td>
              <td className="px-4 py-3">{formatDate(assignment.created_at)}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Link href={`/teacher/assignments/${assignment.id}`} className={outlineSmClass}>
                    보기
                  </Link>
                  <DeleteAssignmentForm assignmentId={assignment.id} title={assignment.title} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
