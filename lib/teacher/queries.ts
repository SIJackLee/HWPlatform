import { signAssignmentQuestionImageUrlJson } from "@/lib/assignment-question-images";
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

function toReadableDbError(prefix: string, err: { message?: string; code?: string; details?: string; hint?: string }) {
  const parts = [err.message, err.code, err.details, err.hint].filter((p) => p != null && String(p).length > 0);
  return new Error(parts.length > 0 ? `${prefix}: ${parts.join(" | ")}` : prefix);
}

export async function getTeacherDashboardStats(teacherId: string): Promise<TeacherDashboardStats> {
  const supabase = createServerSupabaseClient();

  const classesResult = (await supabase
    .from("classes")
    .select("id, name")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: true })) as unknown as {
    data: Array<{ id: string; name: string }> | null;
    error: { message?: string; code?: string; details?: string; hint?: string } | null;
  };
  if (classesResult.error) throw toReadableDbError("classes 조회 실패", classesResult.error);
  const classes = classesResult.data ?? [];
  const classIds = classes.map((row) => row.id);

  const { data: assignments, error: assignmentError } = await supabase
    .from("assignments")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });

  if (assignmentError) throw toReadableDbError("assignments 조회 실패", assignmentError);
  const assignmentRows = (assignments ?? []) as unknown as AssignmentRow[];

  const assignmentIds = assignmentRows.map((assignment) => assignment.id);
  const [{ data: studentsRaw, error: studentsError }, { data: submissionsRaw, error: submissionsError }] =
    await Promise.all([
      classIds.length > 0
        ? supabase
            .from("guest_students")
            .select("id, class_id, name")
            .in("class_id", classIds)
            .is("revoked_at", null)
        : Promise.resolve({ data: [], error: null }),
      assignmentIds.length > 0
        ? supabase
            .from("submissions")
            .select("id, assignment_id, guest_student_id, submitted_at")
            .in("assignment_id", assignmentIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
  if (studentsError) throw toReadableDbError("guest_students 조회 실패", studentsError);
  if (submissionsError) throw toReadableDbError("submissions 조회 실패", submissionsError);

  const students = (studentsRaw ?? []) as Array<{ id: string; class_id: string; name: string }>;
  const submissions = (submissionsRaw ?? []) as Array<{
    id: string;
    assignment_id: string;
    guest_student_id: string;
    submitted_at: string;
  }>;

  const assignmentsByClass = new Map<string, AssignmentRow[]>();
  assignmentRows.forEach((row) => {
    const list = assignmentsByClass.get(row.class_id) ?? [];
    list.push(row);
    assignmentsByClass.set(row.class_id, list);
  });

  const studentsByClass = new Map<string, Array<{ id: string; class_id: string; name: string }>>();
  students.forEach((row) => {
    const list = studentsByClass.get(row.class_id) ?? [];
    list.push(row);
    studentsByClass.set(row.class_id, list);
  });

  const submittedGuestsByAssignment = new Map<string, Set<string>>();
  submissions.forEach((row) => {
    const set = submittedGuestsByAssignment.get(row.assignment_id) ?? new Set<string>();
    set.add(row.guest_student_id);
    submittedGuestsByAssignment.set(row.assignment_id, set);
  });

  const classNameById = new Map(classes.map((row) => [row.id, row.name]));
  const assignmentById = new Map(assignmentRows.map((row) => [row.id, row]));
  const studentById = new Map(students.map((row) => [row.id, row]));

  const classSummaries = classes.map((classRow) => {
    const classAssignments = assignmentsByClass.get(classRow.id) ?? [];
    const classStudents = studentsByClass.get(classRow.id) ?? [];
    const studentCount = classStudents.length;
    const submittedCount = classAssignments.reduce((sum, assignment) => {
      return sum + ((submittedGuestsByAssignment.get(assignment.id)?.size ?? 0) || 0);
    }, 0);
    const notSubmittedCount = classAssignments.reduce((sum, assignment) => {
      const submittedSize = submittedGuestsByAssignment.get(assignment.id)?.size ?? 0;
      return sum + Math.max(studentCount - submittedSize, 0);
    }, 0);
    return {
      classId: classRow.id,
      className: classRow.name,
      assignmentCount: classAssignments.length,
      studentCount,
      submittedCount,
      notSubmittedCount,
    };
  });

  const classStudents = students.map((student) => {
    const classAssignments = assignmentsByClass.get(student.class_id) ?? [];
    const studentSubmissions = submissions.filter((row) => row.guest_student_id === student.id);
    const submittedCount = studentSubmissions.length;
    const inProgressCount = Math.max(classAssignments.length - submittedCount, 0);
    const lastSubmittedAt =
      studentSubmissions
        .map((row) => row.submitted_at)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
    return {
      classId: student.class_id,
      studentId: student.id,
      studentName: student.name,
      submittedCount,
      inProgressCount,
      lastSubmittedAt,
    };
  });

  const recentSubmissions = submissions
    .map((row) => {
      const assignment = assignmentById.get(row.assignment_id);
      const student = studentById.get(row.guest_student_id);
      if (!assignment || !student) return null;
      return {
        submissionId: row.id,
        assignmentId: assignment.id,
        assignmentTitle: assignment.title,
        classId: assignment.class_id,
        className: classNameById.get(assignment.class_id) ?? "반 없음",
        studentName: student.name,
        submittedAt: row.submitted_at,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null)
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    .slice(0, 12);

  const totalSubmissions = submissions.length;
  const totalAssignments = assignmentRows.length;
  const recentAssignments = assignmentRows
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);
  const totalStudents = students.length;

  const recentSubmissionRate =
    totalAssignments === 0 ? 0 : Math.round((totalSubmissions / totalAssignments) * 100);

  return {
    totalClasses: classes.length,
    totalStudents,
    totalAssignments,
    totalSubmissions,
    recentAssignments,
    recentSubmissionRate,
    classSummaries,
    classStudents,
    recentSubmissions,
  }
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

  const classIds = Array.from(new Set(assignmentRows.map((assignment) => assignment.class_id)));
  const [studentsResult, submissionsResult, questionsResult] = await Promise.all([
    classIds.length > 0
      ? supabase.from("guest_students").select("id, class_id").in("class_id", classIds).is("revoked_at", null)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("submissions").select("assignment_id, guest_student_id").in("assignment_id", assignmentIds),
    supabase.from("assignment_questions").select("assignment_id").in("assignment_id", assignmentIds),
  ]);
  if (studentsResult.error) throw studentsResult.error;
  if (submissionsResult.error) throw submissionsResult.error;
  if (questionsResult.error) throw questionsResult.error;

  const classStudentMap = new Map<string, Set<string>>();
  (studentsResult.data ?? []).forEach((student) => {
    const set = classStudentMap.get(student.class_id) ?? new Set<string>();
    set.add(student.id);
    classStudentMap.set(student.class_id, set);
  });
  const submissionMap = new Map<string, Set<string>>();
  (submissionsResult.data ?? []).forEach((submission) => {
    const set = submissionMap.get(submission.assignment_id) ?? new Set<string>();
    if (submission.guest_student_id) set.add(submission.guest_student_id);
    submissionMap.set(submission.assignment_id, set);
  });
  const questionCountMap = new Map<string, number>();
  (questionsResult.data ?? []).forEach((question) => {
    questionCountMap.set(question.assignment_id, (questionCountMap.get(question.assignment_id) ?? 0) + 1);
  });

  return assignmentRows.map((assignment) => {
    const targetCount = classStudentMap.get(assignment.class_id)?.size ?? 0;
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
      .select("*, guest_students(name, class_id)")
      .filter("assignment_id", "eq", assignmentId)
      .order("submitted_at", { ascending: false }),
    supabase
      .from("guest_students")
      .select("id, class_id, name, name_norm, pin4_hmac, created_at, last_seen_at, revoked_at")
      .eq("class_id", (assignment as AssignmentRow).class_id)
      .is("revoked_at", null)
      .order("created_at", { ascending: true }),
  ]);

  const { data: submissions, error: submissionError } = submissionsResult;
  const { data: targets, error: targetsError } = targetsResult;

  if (submissionError) throw submissionError;
  if (targetsError) throw targetsError;

  const submissionRows = (submissions ?? []) as unknown as (SubmissionRow & {
    guest_students: { name: string; class_id: string } | null;
  })[];
  const targetRows = (targets ?? []) as unknown as AssignmentTargetWithStudent[];
  const targetStudentIds = new Set(targetRows.map((target) => target.id));
  const submittedStudentIds = new Set(
    submissionRows
      .filter((submission) => targetStudentIds.has(submission.guest_student_id))
      .map((submission) => submission.guest_student_id),
  );
  const notSubmittedTargets = targetRows.filter((target) => !submittedStudentIds.has(target.id));
  const submittedCount = submittedStudentIds.size;

  const assignmentRow = assignment as unknown as AssignmentRow;
  let mixedQuestions: TeacherSubmissionMixedQuestion[] = [];
  let submissionRowsWithObjectiveScore = submissionRows as Array<
    SubmissionRow & {
      guest_students: { name: string; class_id: string } | null;
      objective_correct_count?: number;
      objective_wrong_count?: number;
      objective_graded_count?: number;
    }
  >;
  if (assignmentRow.question_type === "mixed") {
    const [questionsResult, optionsResult] = await Promise.all([
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
    ]);
    if (questionsResult.error) throw questionsResult.error;
    if (optionsResult.error) throw optionsResult.error;

    const questionRows = ((questionsResult.data ?? []) as unknown) as AssignmentQuestionRow[];
    const optionRows = ((optionsResult.data ?? []) as unknown) as AssignmentQuestionOptionRow[];
    const optionsMap = new Map<string, AssignmentQuestionOptionRow[]>();
    optionRows.forEach((option) => {
      const list = optionsMap.get(option.question_id) ?? [];
      list.push(option);
      optionsMap.set(option.question_id, list);
    });
    const signedTtlSeconds = 60 * 60 * 24;
    mixedQuestions = await Promise.all(
      questionRows.map(async (question) => ({
        ...question,
        options: (optionsMap.get(question.id) ?? []).sort((a, b) => a.sort_order - b.sort_order),
        image_url: await signAssignmentQuestionImageUrlJson(supabase, question.image_url ?? null, signedTtlSeconds),
      })),
    );

    const submissionIds = submissionRows.map((row) => row.id);
    if (submissionIds.length > 0) {
      const objectiveAnswerResult = (await supabase
        .from("submission_answers")
        .select("submission_id, is_correct, assignment_questions!inner(assignment_id, question_type)")
        .in("submission_id", submissionIds)
        .eq("assignment_questions.assignment_id", assignmentId)
        .eq("assignment_questions.question_type", "objective")) as unknown as {
        data:
          | Array<{
              submission_id: string;
              is_correct: boolean | null;
            }>
          | null;
        error: { message: string } | null;
      };
      if (objectiveAnswerResult.error) throw objectiveAnswerResult.error;

      const scoreMap = new Map<string, { correct: number; wrong: number; graded: number }>();
      (objectiveAnswerResult.data ?? []).forEach((row) => {
        const current = scoreMap.get(row.submission_id) ?? { correct: 0, wrong: 0, graded: 0 };
        if (row.is_correct === true) {
          current.correct += 1;
          current.graded += 1;
        } else if (row.is_correct === false) {
          current.wrong += 1;
          current.graded += 1;
        }
        scoreMap.set(row.submission_id, current);
      });

      submissionRowsWithObjectiveScore = submissionRows.map((row) => {
        const score = scoreMap.get(row.id);
        return {
          ...row,
          objective_correct_count: score?.correct ?? 0,
          objective_wrong_count: score?.wrong ?? 0,
          objective_graded_count: score?.graded ?? 0,
        };
      });
    }
  }

  return {
    assignment: assignmentRow,
    submissions: submissionRowsWithObjectiveScore,
    targets: targetRows,
    targetCount: targetRows.length,
    submittedCount,
    notSubmittedCount: Math.max(targetRows.length - submittedCount, 0),
    notSubmittedTargets,
    mixedQuestions,
  };
}

function parseImageUrlJsonToArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string" && v.length > 0);
  } catch {
    return [];
  }
}

export async function getTeacherAssignmentForEdit(assignmentId: string, teacherId: string) {
  const supabase = createServerSupabaseClient();

  const { data: assignment, error: assignmentError } = await supabase
    .from("assignments")
    .select("id, class_id, title, description, due_at, question_type")
    .eq("id", assignmentId)
    .eq("teacher_id", teacherId)
    .single();
  if (assignmentError || !assignment) throw assignmentError ?? new Error("숙제를 찾을 수 없습니다.");

  const submissionsCountResult = await supabase
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("assignment_id", assignmentId);
  if (submissionsCountResult.error) throw submissionsCountResult.error;

  const [questionsResult, optionsResult] = await Promise.all([
    supabase
      .from("assignment_questions")
      .select("id, question_type, prompt, model_answer, sort_order, image_url")
      .eq("assignment_id", assignmentId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("assignment_question_options")
      .select("question_id, option_text, is_correct, sort_order, assignment_questions!inner(assignment_id)")
      .eq("assignment_questions.assignment_id", assignmentId)
      .order("sort_order", { ascending: true }),
  ]);
  if (questionsResult.error) throw questionsResult.error;
  if (optionsResult.error) throw optionsResult.error;

  const optionRows = (optionsResult.data ?? []) as Array<{
    question_id: string;
    option_text: string;
    is_correct: boolean;
    sort_order: number;
  }>;
  const optionsMap = new Map<string, typeof optionRows>();
  optionRows.forEach((row) => {
    const list = optionsMap.get(row.question_id) ?? [];
    list.push(row);
    optionsMap.set(row.question_id, list);
  });

  const questions = (questionsResult.data ?? []).map((question) => {
    const options = optionsMap.get(question.id) ?? [];
    return {
      type: question.question_type,
      prompt: question.prompt,
      modelAnswer: question.model_answer ?? "",
      options: options.map((o) => o.option_text),
      correctOptionIndexes: options.filter((o) => o.is_correct).map((o) => Math.max(o.sort_order - 1, 0)),
      existingImageUrls: parseImageUrlJsonToArray(question.image_url),
    };
  });

  return {
    assignment: assignment as {
      id: string;
      class_id: string;
      title: string;
      description: string;
      due_at: string;
      question_type: "mixed" | "subjective" | "objective";
    },
    questions,
    submissionCount: submissionsCountResult.count ?? 0,
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
    .select("*, guest_students(name)")
    .filter("id", "eq", submissionId)
    .filter("assignment_id", "eq", assignmentSummary.id)
    .single();

  if (submissionError) throw submissionError;

  const typedSubmission = submission as unknown as SubmissionRow & { guest_students: { name: string } | null };

  if ((assignment as { question_type: AssignmentRow["question_type"] }).question_type !== "mixed") {
    if ((assignment as { question_type: AssignmentRow["question_type"] }).question_type === "objective") {
      const [detailResult, optionsResult] = await Promise.all([
        supabase
          .from("assignment_objective_details")
          .select("prompt, allow_multiple, explanation")
          .eq("assignment_id", assignmentId)
          .maybeSingle(),
        supabase
          .from("assignment_objective_options")
          .select("id, option_text, is_correct, sort_order")
          .eq("assignment_id", assignmentId)
          .order("sort_order", { ascending: true }),
      ]);
      if (detailResult.error) throw detailResult.error;
      if (optionsResult.error) throw optionsResult.error;

      return {
        assignmentQuestionType: "objective",
        submission: typedSubmission,
        objectiveDetail: (detailResult.data as { prompt: string; allow_multiple: boolean; explanation: string | null } | null) ?? null,
        objectiveOptions: (optionsResult.data ??
          []) as Array<{ id: string; option_text: string; is_correct: boolean; sort_order: number }>,
        mixedQuestions: [],
        submissionAnswers: [],
      };
    }

    return {
      assignmentQuestionType: (assignment as { question_type: AssignmentRow["question_type"] }).question_type,
      submission: typedSubmission,
      objectiveDetail: null,
      objectiveOptions: [],
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

  const signedTtlSeconds = 60 * 60 * 24;
  const mixedQuestions: TeacherSubmissionMixedQuestion[] = await Promise.all(
    questionRows.map(async (question) => ({
      ...question,
      options: (optionsMap.get(question.id) ?? []).sort((a, b) => a.sort_order - b.sort_order),
      image_url: await signAssignmentQuestionImageUrlJson(supabase, question.image_url ?? null, signedTtlSeconds),
    })),
  );

  return {
    assignmentQuestionType: "mixed",
    submission: typedSubmission,
    objectiveDetail: null,
    objectiveOptions: [],
    mixedQuestions,
    submissionAnswers: answerRows,
  };
}
