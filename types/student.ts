import type { Database } from "@/types/database";

export type AssignmentRow = Database["public"]["Tables"]["assignments"]["Row"];
export type SubmissionRow = Database["public"]["Tables"]["submissions"]["Row"];
export type ObjectiveDetailRow = Database["public"]["Tables"]["assignment_objective_details"]["Row"];
export type ObjectiveOptionRow = Database["public"]["Tables"]["assignment_objective_options"]["Row"];
export type AssignmentQuestionRow = Database["public"]["Tables"]["assignment_questions"]["Row"];
export type AssignmentQuestionOptionRow = Database["public"]["Tables"]["assignment_question_options"]["Row"];
export type SubmissionAnswerRow = Database["public"]["Tables"]["submission_answers"]["Row"];

export interface StudentAssignmentItem extends AssignmentRow {
  submission: SubmissionRow | null;
  status: "in_progress" | "submitted";
}

export interface StudentDashboardStats {
  inProgressCount: number;
  submittedCount: number;
  feedbackCount: number;
}

export interface StudentAssignmentDetail {
  assignment: AssignmentRow | null;
  submission: SubmissionRow | null;
  objectiveDetail?: ObjectiveDetailRow | null;
  objectiveOptions?: ObjectiveOptionRow[];
  mixedQuestions?: Array<AssignmentQuestionRow & { options: AssignmentQuestionOptionRow[] }>;
  submissionAnswers?: SubmissionAnswerRow[];
}
