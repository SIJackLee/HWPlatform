import type { Database } from "@/types/database";

export type AssignmentRow = Database["public"]["Tables"]["assignments"]["Row"];
export type SubmissionRow = Database["public"]["Tables"]["submissions"]["Row"];
export type AssignmentTargetRow = Database["public"]["Tables"]["assignment_targets"]["Row"];
export type AssignmentQuestionRow = Database["public"]["Tables"]["assignment_questions"]["Row"];
export type AssignmentQuestionOptionRow = Database["public"]["Tables"]["assignment_question_options"]["Row"];
export type SubmissionAnswerRow = Database["public"]["Tables"]["submission_answers"]["Row"];
export interface TeacherAssignmentListItem extends AssignmentRow {
  questionCount: number;
  submittedCount: number;
  notSubmittedCount: number;
}

export interface AssignmentTargetWithStudent extends AssignmentTargetRow {
  profiles: { name: string } | null;
}

export interface TeacherDashboardStats {
  totalAssignments: number;
  totalSubmissions: number;
  recentAssignments: AssignmentRow[];
  recentSubmissionRate: number;
}

export interface TeacherSubmissionMixedQuestion extends AssignmentQuestionRow {
  options: AssignmentQuestionOptionRow[];
}

export interface TeacherSubmissionDetail {
  assignmentQuestionType: AssignmentRow["question_type"];
  submission: SubmissionRow & { profiles: { name: string } | null };
  mixedQuestions: TeacherSubmissionMixedQuestion[];
  submissionAnswers: SubmissionAnswerRow[];
}
