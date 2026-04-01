import type { Database } from "@/types/database";

export type AssignmentRow = Database["public"]["Tables"]["assignments"]["Row"];
export type SubmissionRow = Database["public"]["Tables"]["submissions"]["Row"];
export type GuestStudentRow = Database["public"]["Tables"]["guest_students"]["Row"];
export type AssignmentQuestionRow = Database["public"]["Tables"]["assignment_questions"]["Row"];
export type AssignmentQuestionOptionRow = Database["public"]["Tables"]["assignment_question_options"]["Row"];
export type SubmissionAnswerRow = Database["public"]["Tables"]["submission_answers"]["Row"];
export interface TeacherAssignmentListItem extends AssignmentRow {
  questionCount: number;
  submittedCount: number;
  notSubmittedCount: number;
}

export interface AssignmentTargetWithStudent extends GuestStudentRow {
  profiles?: { name: string } | null;
}

export interface TeacherDashboardStats {
  totalClasses: number;
  totalStudents: number;
  totalAssignments: number;
  totalSubmissions: number;
  recentAssignments: AssignmentRow[];
  recentSubmissionRate: number;
  classSummaries: Array<{
    classId: string;
    className: string;
    assignmentCount: number;
    studentCount: number;
    submittedCount: number;
    notSubmittedCount: number;
  }>;
  classStudents: Array<{
    classId: string;
    studentId: string;
    studentName: string;
    submittedCount: number;
    inProgressCount: number;
    lastSubmittedAt: string | null;
  }>;
  recentSubmissions: Array<{
    submissionId: string;
    assignmentId: string;
    assignmentTitle: string;
    classId: string;
    className: string;
    studentName: string;
    submittedAt: string;
  }>;
}

export interface TeacherSubmissionMixedQuestion extends AssignmentQuestionRow {
  options: AssignmentQuestionOptionRow[];
}

export interface TeacherSubmissionDetail {
  assignmentQuestionType: AssignmentRow["question_type"];
  submission: SubmissionRow & { guest_students: { name: string } | null };
  objectiveDetail?: {
    prompt: string;
    allow_multiple: boolean;
    explanation: string | null;
  } | null;
  objectiveOptions?: Array<{
    id: string;
    option_text: string;
    is_correct: boolean;
    sort_order: number;
  }>;
  mixedQuestions: TeacherSubmissionMixedQuestion[];
  submissionAnswers: SubmissionAnswerRow[];
}
