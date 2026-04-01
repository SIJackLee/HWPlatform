import { signAssignmentQuestionImageUrlJson } from "@/lib/assignment-question-images";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  AssignmentQuestionOptionRow,
  AssignmentQuestionRow,
  ObjectiveDetailRow,
  ObjectiveOptionRow,
  SubmissionAnswerRow,
  StudentAssignmentDetail,
  StudentAssignmentItem,
  StudentDashboardStats,
  SubmissionRow,
} from "@/types/student";
import type { Database } from "@/types/database";

type AssignmentRow = Database["public"]["Tables"]["assignments"]["Row"];

export async function getStudentAssignments(studentId: string): Promise<StudentAssignmentItem[]> {
  const supabase = createServerSupabaseClient();
  const guestResult = (await supabase
    .from("guest_students")
    .select("class_id")
    .eq("id", studentId)
    .is("revoked_at", null)
    .maybeSingle()) as unknown as {
    data: { class_id: string } | null;
    error: { message: string } | null;
  };
  if (guestResult.error || !guestResult.data) {
    return [];
  }

  const [{ data: assignmentRowsRaw, error: assignmentError }, { data: submissions, error: submissionError }] =
    await Promise.all([
      supabase
        .from("assignments")
        .select("*")
        .eq("class_id", guestResult.data.class_id)
        .order("due_at", { ascending: true }),
      supabase.from("submissions").select("*").eq("guest_student_id", studentId),
    ]);

  if (assignmentError) throw assignmentError;
  if (submissionError) throw submissionError;

  const assignmentRows = (assignmentRowsRaw ?? []) as AssignmentRow[];
  if (assignmentRows.length === 0) return [];

  const submissionRows = (submissions ?? []) as unknown as SubmissionRow[];
  const submissionMap = new Map<string, SubmissionRow>();
  submissionRows.forEach((submission) => {
    submissionMap.set(submission.assignment_id, submission);
  });

  return assignmentRows.map((assignment) => {
    const submission = submissionMap.get(assignment.id) ?? null;
    return {
      ...assignment,
      submission,
      status: submission ? "submitted" : "in_progress",
    };
  });
}

export async function getStudentDashboardStats(studentId: string): Promise<StudentDashboardStats> {
  const assignmentItems = await getStudentAssignments(studentId);

  const inProgressCount = assignmentItems.filter((item) => item.status === "in_progress").length;
  const submittedCount = assignmentItems.filter((item) => item.status === "submitted").length;
  const feedbackCount = assignmentItems.filter((item) => Boolean(item.submission?.feedback_text)).length;

  return {
    inProgressCount,
    submittedCount,
    feedbackCount,
  };
}

export async function getStudentAssignmentDetail(assignmentId: string, studentId: string): Promise<StudentAssignmentDetail> {
  const supabase = createServerSupabaseClient();

  const guestResult = (await supabase
    .from("guest_students")
    .select("class_id")
    .eq("id", studentId)
    .is("revoked_at", null)
    .maybeSingle()) as unknown as {
    data: { class_id: string } | null;
    error: { message: string } | null;
  };
  if (guestResult.error || !guestResult.data) {
    return { assignment: null, submission: null };
  }

  const assignmentResult = (await supabase
    .from("assignments")
    .select("*")
    .eq("id", assignmentId)
    .eq("class_id", guestResult.data.class_id)
    .maybeSingle()) as unknown as {
    data: AssignmentRow | null;
    error: { message: string } | null;
  };
  if (assignmentResult.error || !assignmentResult.data) {
    return { assignment: null, submission: null };
  }

  const { data: submission, error: submissionError } = await supabase
    .from("submissions")
    .select("*")
    .eq("assignment_id", assignmentId)
    .eq("guest_student_id", studentId)
    .maybeSingle();

  if (submissionError) throw submissionError;

  if (assignmentResult.data.question_type === "objective") {
    const [detailResult, optionsResult] = await Promise.all([
      supabase.from("assignment_objective_details").select("*").filter("assignment_id", "eq", assignmentId).maybeSingle(),
      supabase
        .from("assignment_objective_options")
        .select("*")
        .filter("assignment_id", "eq", assignmentId)
        .order("sort_order", { ascending: true }),
    ]);
    if (detailResult.error) throw detailResult.error;
    if (optionsResult.error) throw optionsResult.error;

    return {
      assignment: assignmentResult.data,
      submission: submission as unknown as SubmissionRow | null,
      objectiveDetail: (detailResult.data as unknown as ObjectiveDetailRow | null) ?? null,
      objectiveOptions: ((optionsResult.data ?? []) as unknown) as ObjectiveOptionRow[],
    };
  }

  if (assignmentResult.data.question_type === "mixed") {
    const [questionsResult, questionOptionsResult, submissionAnswersResult] = await Promise.all([
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
      submission
        ? supabase
            .from("submission_answers")
            .select("*")
            .filter("submission_id", "eq", (submission as { id: string }).id)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (questionsResult.error) throw questionsResult.error;
    if (questionOptionsResult.error) throw questionOptionsResult.error;
    if (submissionAnswersResult.error) throw submissionAnswersResult.error;

    const questions = ((questionsResult.data ?? []) as unknown) as AssignmentQuestionRow[];
    const options = ((questionOptionsResult.data ?? []) as unknown) as (AssignmentQuestionOptionRow & {
      assignment_questions?: { assignment_id: string };
    })[];
    const optionsMap = new Map<string, AssignmentQuestionOptionRow[]>();
    options.forEach((option) => {
      const list = optionsMap.get(option.question_id) ?? [];
      list.push(option);
      optionsMap.set(option.question_id, list);
    });
    const mixedQuestionsRaw = questions.map((question) => ({
      ...question,
      options: (optionsMap.get(question.id) ?? []).sort((a, b) => a.sort_order - b.sort_order),
    }));
    const signedTtlSeconds = 60 * 60 * 24;
    const mixedQuestions = await Promise.all(
      mixedQuestionsRaw.map(async (question) => ({
        ...question,
        image_url: await signAssignmentQuestionImageUrlJson(supabase, question.image_url ?? null, signedTtlSeconds),
      })),
    );

    return {
      assignment: assignmentResult.data,
      submission: submission as SubmissionRow | null,
      objectiveDetail: null,
      objectiveOptions: [],
      mixedQuestions,
      submissionAnswers: ((submissionAnswersResult.data ?? []) as unknown) as SubmissionAnswerRow[],
    };
  }

  return {
    assignment: assignmentResult.data,
    submission: submission as unknown as SubmissionRow | null,
    objectiveDetail: null,
    objectiveOptions: [],
    mixedQuestions: [],
    submissionAnswers: [],
  };
}
