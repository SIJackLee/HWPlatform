import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  AssignmentRow,
  TeacherAssignmentListItem,
  AssignmentTargetWithStudent,
  SubmissionRow,
  TeacherDashboardStats,
  TeacherSubmissionDetail,
  TeacherSubmissionMixedQuestion,
  AssignmentQuestionOptionRow,
  AssignmentQuestionRow,
  SubmissionAnswerRow,
} from "@/types/teacher";
import type { Database } from "@/types/database";

type AssignmentSummaryRow = Pick<Database["public"]["Tables"]["assignments"]["Row"], "id" | "title" | "teacher_id">;

export async function getTeacherDashboardStats(teacherId: string): Promise<TeacherDashboardStats> {
  const supabase = createServerSupabaseClient();

  const { data: assignments, error: assignmentError } = await supabase
    .from("assignments")
    .select("*")
    .filter("teacher_id", "eq", teacherId)
    .order("created_at", { ascending: false });

  if (assignmentError) throw assignmentError;
  const assignmentRows = (assignments ?? []) as unknown as AssignmentRow[];

  const assignmentIds = assignmentRows.map((assignment) => assignment.id);
  let totalSubmissions = 0;

  if (assignmentIds.length > 0) {
    const { count: submissionCount, error: submissionError } = await supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .in("assignment_id", assignmentIds);

    if (submissionError) throw submissionError;
    totalSubmissions = submissionCount ?? 0;
  }

  const recentAssignments = assignmentRows.slice(0, 5);
  const totalAssignments = assignmentRows.length;
  const recentSubmissionRate = totalAssignments === 0 ? 0 : Math.round((totalSubmissions / totalAssignments) * 100);

  return { totalAssignments, totalSubmissions, recentAssignments, recentSubmissionRate };
}

export async function getTeacherAssignments(teacherId: string): Promise<TeacherAssignmentListItem[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("assignments")
    .select("*")
    .filter("teacher_id", "eq", teacherId)
    .order("due_at", { ascending: true });

  if (error) throw error;
  const assignmentRows = ((data ?? []) as unknown) as AssignmentRow[];
  const assignmentIds = assignmentRows.map((assignment) => assignment.id);
  if (assignmentIds.length === 0) return [];

  const [targetsResult, submissionsResult, questionsResult] = await Promise.all([
    supabase.from("assignment_targets").select("assignment_id, student_id").in("assignment_id", assignmentIds),
    supabase.from("submissions").select("assignment_id, student_id").in("assignment_id", assignmentIds),
    supabase.from("assignment_questions").select("assignment_id").in("assignment_id", assignmentIds),
  ]);
  if (targetsResult.error) throw targetsResult.error;
  if (submissionsResult.error) throw submissionsResult.error;
  if (questionsResult.error) throw questionsResult.error;

  const targetMap = new Map<string, Set<string>>();
  (targetsResult.data ?? []).forEach((target) => {
    const set = targetMap.get(target.assignment_id) ?? new Set<string>();
    set.add(target.student_id);
    targetMap.set(target.assignment_id, set);
  });
  const submissionMap = new Map<string, Set<string>>();
  (submissionsResult.data ?? []).forEach((submission) => {
    const set = submissionMap.get(submission.assignment_id) ?? new Set<string>();
    set.add(submission.student_id);
    submissionMap.set(submission.assignment_id, set);
  });
  const questionCountMap = new Map<string, number>();
  (questionsResult.data ?? []).forEach((question) => {
    questionCountMap.set(question.assignment_id, (questionCountMap.get(question.assignment_id) ?? 0) + 1);
  });

  return assignmentRows.map((assignment) => {
    const targetCount = targetMap.get(assignment.id)?.size ?? 0;
    const submittedCount = submissionMap.get(assignment.id)?.size ?? 0;
    return {
      ...assignment,
      questionCount: questionCountMap.get(assignment.id) ?? 0,
      submittedCount,
      notSubmittedCount: Math.max(targetCount - submittedCount, 0),
    };
  });
}

export async function getTeacherAssignmentDetail(assignmentId: string, teacherId: string) {
  const supabase = createServerSupabaseClient();

  const { data: assignment, error: assignmentError } = await supabase
    .from("assignments")
    .select("*")
    .filter("id", "eq", assignmentId)
    .filter("teacher_id", "eq", teacherId)
    .single();

  if (assignmentError) throw assignmentError;

  const [submissionsResult, targetsResult] = await Promise.all([
    supabase
      .from("submissions")
      .select("*, profiles!submissions_student_id_fkey(name)")
      .filter("assignment_id", "eq", assignmentId)
      .order("submitted_at", { ascending: false }),
    supabase
      .from("assignment_targets")
      .select("*, profiles!assignment_targets_student_id_fkey(name)")
      .filter("assignment_id", "eq", assignmentId)
      .order("created_at", { ascending: true }),
  ]);

  const { data: submissions, error: submissionError } = submissionsResult;
  const { data: targets, error: targetsError } = targetsResult;

  if (submissionError) throw submissionError;
  if (targetsError) throw targetsError;

  const submissionRows = (submissions ?? []) as unknown as (SubmissionRow & {
    profiles: { name: string } | null;
  })[];
  const targetRows = (targets ?? []) as unknown as AssignmentTargetWithStudent[];
  const targetStudentIds = new Set(targetRows.map((target) => target.student_id));
  const submittedStudentIds = new Set(
    submissionRows
      .filter((submission) => targetStudentIds.has(submission.student_id))
      .map((submission) => submission.student_id),
  );
  const notSubmittedTargets = targetRows.filter((target) => !submittedStudentIds.has(target.student_id));
  const submittedCount = submittedStudentIds.size;

  return {
    assignment: assignment as unknown as AssignmentRow,
    submissions: submissionRows,
    targets: targetRows,
    targetCount: targetRows.length,
    submittedCount,
    notSubmittedCount: Math.max(targetRows.length - submittedCount, 0),
    notSubmittedTargets,
  };
}

export async function getTeacherSubmissionDetail(
  assignmentId: string,
  submissionId: string,
  teacherId: string,
): Promise<TeacherSubmissionDetail> {
  const supabase = createServerSupabaseClient();

  const { data: assignment, error: assignmentError } = await supabase
    .from("assignments")
    .select("id, title, teacher_id, question_type")
    .filter("id", "eq", assignmentId)
    .filter("teacher_id", "eq", teacherId)
    .single();

  if (assignmentError) throw assignmentError;
  const assignmentSummary = assignment as unknown as AssignmentSummaryRow;

  const { data: submission, error: submissionError } = await supabase
    .from("submissions")
    .select("*, profiles!submissions_student_id_fkey(name)")
    .filter("id", "eq", submissionId)
    .filter("assignment_id", "eq", assignmentSummary.id)
    .single();

  if (submissionError) throw submissionError;

  const typedSubmission = submission as unknown as SubmissionRow & { profiles: { name: string } | null };

  if ((assignment as { question_type: AssignmentRow["question_type"] }).question_type !== "mixed") {
    return {
      assignmentQuestionType: (assignment as { question_type: AssignmentRow["question_type"] }).question_type,
      submission: typedSubmission,
      mixedQuestions: [],
      submissionAnswers: [],
    };
  }

  const [questionsResult, optionsResult, answersResult] = await Promise.all([
    supabase
      .from("assignment_questions")
      .select("*")
      .filter("assignment_id", "eq", assignmentId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("assignment_question_options")
      .select("*, assignment_questions!inner(assignment_id)")
      .filter("assignment_questions.assignment_id", "eq", assignmentId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("submission_answers")
      .select("*")
      .filter("submission_id", "eq", submissionId),
  ]);

  if (questionsResult.error) throw questionsResult.error;
  if (optionsResult.error) throw optionsResult.error;
  if (answersResult.error) throw answersResult.error;

  const questionRows = ((questionsResult.data ?? []) as unknown) as AssignmentQuestionRow[];
  const optionRows = ((optionsResult.data ?? []) as unknown) as AssignmentQuestionOptionRow[];
  const answerRows = ((answersResult.data ?? []) as unknown) as SubmissionAnswerRow[];

  const optionsMap = new Map<string, AssignmentQuestionOptionRow[]>();
  optionRows.forEach((option) => {
    const list = optionsMap.get(option.question_id) ?? [];
    list.push(option);
    optionsMap.set(option.question_id, list);
  });

  const mixedQuestions: TeacherSubmissionMixedQuestion[] = questionRows.map((question) => ({
    ...question,
    options: (optionsMap.get(question.id) ?? []).sort((a, b) => a.sort_order - b.sort_order),
  }));

  return {
    assignmentQuestionType: "mixed",
    submission: typedSubmission,
    mixedQuestions,
    submissionAnswers: answerRows,
  };
}
