import Link from "next/link";

import { AssignmentStatusBadge } from "@/components/student/assignment-status-badge";
import type { StudentAssignmentItem } from "@/types/student";

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export function AssignmentListTable({ items }: { items: StudentAssignmentItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border px-4 py-8 text-center text-sm text-muted-foreground">
        현재 내게 할당된 숙제가 없습니다.
      </div>
    );
  }

  const outlineSmClass =
    "inline-flex h-11 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted md:h-7 md:px-2.5 md:text-[0.8rem]";

  return (
    <div className="overflow-hidden rounded-lg border">
      <ul className="divide-y md:hidden">
        {items.map((item) => (
          <li key={item.id} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium">{item.title}</p>
              <AssignmentStatusBadge status={item.status} />
            </div>
            <p className="text-sm">
              유형: {item.question_type === "objective" ? "객관식" : item.question_type === "mixed" ? "혼합형" : "주관식"}
            </p>
            <p className="text-sm text-muted-foreground">마감일: {formatDate(item.due_at)}</p>
            <div className="flex items-center justify-between">
              <p className="text-sm">피드백: {item.submission?.feedback_text ? "도착" : "-"}</p>
              <Link href={`/student/assignments/${item.id}`} className={outlineSmClass}>
                보기
              </Link>
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
            <th className="px-4 py-3 font-medium">상태</th>
            <th className="px-4 py-3 font-medium">피드백</th>
            <th className="px-4 py-3 font-medium">상세</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t">
              <td className="px-4 py-3">{item.title}</td>
              <td className="px-4 py-3">
                {item.question_type === "objective" ? "객관식" : item.question_type === "mixed" ? "혼합형" : "주관식"}
              </td>
              <td className="px-4 py-3">{formatDate(item.due_at)}</td>
              <td className="px-4 py-3">
                <AssignmentStatusBadge status={item.status} />
              </td>
              <td className="px-4 py-3">{item.submission?.feedback_text ? "도착" : "-"}</td>
              <td className="px-4 py-3">
                <Link href={`/student/assignments/${item.id}`} className={outlineSmClass}>
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
