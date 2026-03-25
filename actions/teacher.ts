"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthState } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function createAssignment(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const dueAt = String(formData.get("dueAt") ?? "").trim();
  const questionType = "mixed" as const;
  const mixedQuestionsRaw = String(formData.get("mixedQuestions") ?? "[]");
  const studentIds = formData
    .getAll("studentIds")
    .map((value) => String(value).trim())
    .filter((value) => value.length > 0);

  if (!title || !description || !dueAt || studentIds.length === 0) {
    redirect("/teacher/assignments/new?error=모든 필드를 입력해 주세요.");
  }
  type MixedQuestionInput = {
    type: "subjective" | "objective";
    prompt: string;
    sort_order: number;
    options: Array<{ option_text: string; is_correct: boolean; sort_order: number }>;
  };

  let mixedQuestions: MixedQuestionInput[] = [];
  try {
    mixedQuestions = JSON.parse(mixedQuestionsRaw) as MixedQuestionInput[];
  } catch {
    redirect("/teacher/assignments/new?error=혼합형 문항 데이터 형식이 올바르지 않습니다.");
  }
  if (!Array.isArray(mixedQuestions) || mixedQuestions.length === 0) {
    redirect("/teacher/assignments/new?error=혼합형 문항을 1개 이상 추가해 주세요.");
  }
  const invalidMixed = mixedQuestions.some((question) => {
    if (!question.prompt?.trim()) return true;
    if (question.type === "objective") {
      const validOptions = (question.options ?? []).filter((option) => option.option_text?.trim().length > 0);
      const correctCount = validOptions.filter((option) => option.is_correct).length;
      return validOptions.length < 2 || correctCount < 1;
    }
    return false;
  });
  if (invalidMixed) {
    const invalidIndex = mixedQuestions.findIndex((question) => {
      if (!question.prompt?.trim()) return true;
      if (question.type === "objective") {
        const validOptions = (question.options ?? []).filter((option) => option.option_text?.trim().length > 0);
        const correctCount = validOptions.filter((option) => option.is_correct).length;
        return validOptions.length < 2 || correctCount < 1;
      }
      return false;
    });
    redirect(`/teacher/assignments/new?error=${encodeURIComponent(`${invalidIndex + 1}번 문항 입력을 확인해 주세요.`)}`);
  }

  const { user, profile } = await getAuthState();
  if (!user || profile?.role !== "teacher") {
    redirect("/login?error=권한이 없습니다.");
  }

  const supabase = createServerSupabaseClient();

  const studentsCheckResult = (await supabase
    .from("profiles")
    .select("id")
    .filter("role", "eq", "student")
    .filter("is_active", "eq", true)
    .in("id", studentIds)) as unknown as {
    data: Array<{ id: string }> | null;
    error: { message: string } | null;
  };

  if (studentsCheckResult.error) {
    redirect(`/teacher/assignments/new?error=${encodeURIComponent(studentsCheckResult.error.message)}`);
  }

  const validStudentIds = new Set((studentsCheckResult.data ?? []).map((student) => student.id));
  if (validStudentIds.size === 0) {
    redirect("/teacher/assignments/new?error=유효한 student 대상을 1명 이상 선택해 주세요.");
  }

  // WARNING: Supabase generic mismatch workaround for this repo's manual DB types.
  const assignmentsWriter = supabase.from("assignments") as unknown as {
    insert: (values: {
      teacher_id: string;
      title: string;
      description: string;
      question_type: "subjective" | "objective" | "mixed";
      due_at: string;
    }) => {
      select: (fields: string) => {
        single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
      };
    };
  };

  const { data, error } = await assignmentsWriter.insert({
      teacher_id: user.id,
      title,
      description,
      question_type: questionType,
      due_at: new Date(dueAt).toISOString(),
    }).select("id").single();

  if (error || !data) {
    redirect(`/teacher/assignments/new?error=${encodeURIComponent(error?.message ?? "생성에 실패했습니다.")}`);
  }

  const targetsWriter = supabase.from("assignment_targets") as unknown as {
    insert: (values: Array<{ assignment_id: string; student_id: string }>) => Promise<{
      error: { message: string } | null;
    }>;
  };

  const targetRows = Array.from(validStudentIds).map((studentId) => ({
    assignment_id: data.id,
    student_id: studentId,
  }));
  const targetInsertResult = await targetsWriter.insert(targetRows);

  if (targetInsertResult.error) {
    const assignmentsDeleteWriter = supabase.from("assignments") as unknown as {
      delete: () => {
        filter: (field: string, op: string, value: string) => Promise<{ error: { message: string } | null }>;
      };
    };

    await assignmentsDeleteWriter.delete().filter("id", "eq", data.id);
    redirect(`/teacher/assignments/new?error=${encodeURIComponent(targetInsertResult.error.message)}`);
  }

  const questionsWriter = supabase.from("assignment_questions") as unknown as {
    insert: (values: Array<{
      assignment_id: string;
      question_type: "subjective" | "objective";
      prompt: string;
      sort_order: number;
    }>) => {
      select: (fields: string) => Promise<{
        data: Array<{ id: string; sort_order: number }> | null;
        error: { message: string } | null;
      }>;
    };
  };
  const questionsPayload = mixedQuestions.map((question, idx) => ({
    assignment_id: data.id,
    question_type: question.type,
    prompt: question.prompt.trim(),
    sort_order: idx + 1,
  }));
  const questionsInsert = await questionsWriter.insert(questionsPayload).select("id, sort_order");
  if (questionsInsert.error || !questionsInsert.data) {
    redirect(`/teacher/assignments/new?error=${encodeURIComponent(questionsInsert.error?.message ?? "문항 저장 실패")}`);
  }
  const questionIdBySort = new Map<number, string>(
    questionsInsert.data.map((row) => [row.sort_order, row.id]),
  );

  const optionRows = mixedQuestions.flatMap((question, idx) => {
    if (question.type !== "objective") return [];
    const questionId = questionIdBySort.get(idx + 1);
    if (!questionId) return [];
    return (question.options ?? [])
      .filter((option) => option.option_text.trim().length > 0)
      .map((option, optionIdx) => ({
        question_id: questionId,
        option_text: option.option_text.trim(),
        is_correct: option.is_correct,
        sort_order: optionIdx + 1,
      }));
  });
  if (optionRows.length > 0) {
    const questionOptionsWriter = supabase.from("assignment_question_options") as unknown as {
      insert: (values: Array<{
        question_id: string;
        option_text: string;
        is_correct: boolean;
        sort_order: number;
      }>) => Promise<{ error: { message: string } | null }>;
    };
    const optionsInsert = await questionOptionsWriter.insert(optionRows);
    if (optionsInsert.error) {
      redirect(`/teacher/assignments/new?error=${encodeURIComponent(optionsInsert.error.message)}`);
    }
  }

  revalidatePath("/teacher/dashboard");
  revalidatePath("/teacher/assignments");
  revalidatePath("/student/dashboard");
  revalidatePath("/student/assignments");
  redirect(`/teacher/assignments/${data.id}`);
}

export async function saveSubmissionFeedback(formData: FormData) {
  const submissionId = String(formData.get("submissionId") ?? "");
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const feedbackText = String(formData.get("feedbackText") ?? "").trim();

  if (!submissionId || !assignmentId) {
    redirect("/teacher/dashboard?error=잘못된 요청입니다.");
  }

  const { user, profile } = await getAuthState();
  if (!user || profile?.role !== "teacher") {
    redirect("/login?error=권한이 없습니다.");
  }

  const supabase = createServerSupabaseClient();
  const assignmentCheck = (await supabase
    .from("assignments")
    .select("id")
    .filter("id", "eq", assignmentId)
    .filter("teacher_id", "eq", user.id)
    .maybeSingle()) as unknown as {
    data: { id: string } | null;
    error: { message: string } | null;
  };

  if (assignmentCheck.error || !assignmentCheck.data) {
    redirect("/teacher/dashboard?error=권한이 없습니다.");
  }

  // WARNING: Supabase generic mismatch workaround for this repo's manual DB types.
  const submissionsWriter = supabase.from("submissions") as unknown as {
    update: (values: { feedback_text: string; feedback_updated_at: string }) => {
      eq: (field: string, value: string) => {
        eq: (field: string, value: string) => Promise<{ error: { message: string } | null }>;
      };
    };
  };

  const { error } = await submissionsWriter.update({
      feedback_text: feedbackText,
      feedback_updated_at: new Date().toISOString(),
    }).eq("id", submissionId).eq("assignment_id", assignmentId);

  if (error) {
    redirect(
      `/teacher/assignments/${assignmentId}/submissions/${submissionId}?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath(`/teacher/assignments/${assignmentId}`);
  revalidatePath(`/teacher/assignments/${assignmentId}/submissions/${submissionId}`);
  redirect(`/teacher/assignments/${assignmentId}/submissions/${submissionId}?success=${encodeURIComponent("피드백이 저장되었습니다.")}`);
}

export async function deleteAssignment(formData: FormData) {
  const assignmentId = String(formData.get("assignmentId") ?? "").trim();
  if (!assignmentId) {
    redirect("/teacher/assignments?error=삭제할 숙제를 찾을 수 없습니다.");
  }

  const { user, profile } = await getAuthState();
  if (!user || profile?.role !== "teacher") {
    redirect("/login?error=권한이 없습니다.");
  }

  const supabase = createServerSupabaseClient();
  const assignmentsDeleteWriter = supabase.from("assignments") as unknown as {
    delete: () => {
      eq: (field: string, value: string) => {
        eq: (field: string, value: string) => Promise<{ error: { message: string } | null }>;
      };
    };
  };

  const { error } = await assignmentsDeleteWriter.delete().eq("id", assignmentId).eq("teacher_id", user.id);
  if (error) {
    redirect(`/teacher/assignments?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/teacher/dashboard");
  revalidatePath("/teacher/assignments");
  revalidatePath("/student/dashboard");
  revalidatePath("/student/assignments");
  redirect("/teacher/assignments");
}
