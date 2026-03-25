import { saveSubmissionFeedback } from "@/actions/teacher";
import { Button } from "@/components/ui/button";

export function FeedbackForm({
  assignmentId,
  submissionId,
  defaultValue,
  errorMessage,
  successMessage,
}: {
  assignmentId: string;
  submissionId: string;
  defaultValue?: string | null;
  errorMessage?: string;
  successMessage?: string;
}) {
  return (
    <form action={saveSubmissionFeedback} className="space-y-3">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <input type="hidden" name="submissionId" value={submissionId} />
      <div className="space-y-2">
        <label htmlFor="feedbackText" className="text-sm font-medium">
          피드백
        </label>
        <textarea
          id="feedbackText"
          name="feedbackText"
          rows={6}
          defaultValue={defaultValue ?? ""}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="학생 답안에 대한 피드백을 입력하세요."
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit">피드백 저장</Button>
        {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
        {!errorMessage && successMessage ? <p className="text-sm text-emerald-600">{successMessage}</p> : null}
      </div>
    </form>
  );
}
