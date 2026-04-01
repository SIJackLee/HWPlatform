"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getGuestAuthState } from "@/lib/auth/guest-auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function submitAssignmentAnswer(formData: FormData) {
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const answerText = String(formData.get("answerText") ?? "").trim();
  const selectedOptionIds = formData
    .getAll("selectedOptionIds")
    .map((value) => String(value))
    .filter((value) => value.length > 0);
  const mixedAnswersRaw = String(formData.get("mixedAnswers") ?? "[]");

  if (!assignmentId) {
    redirect(`/student/assignments/${assignmentId}?error=답안을 입력해 주세요.`);
  }

  const { user, profile } = await getGuestAuthState();
  if (!user || !profile) {
    redirect("/join?error=권한이 없습니다.");
  }

  const supabase = createServerSupabaseClient();
  const assignmentScopeResult = (await supabase
    .from("assignments")
    .select("id, class_id, question_type")
    .eq("id", assignmentId)
    .eq("class_id", profile.class_id)
    .maybeSingle()) as unknown as {
    data: { id: string; class_id: string; question_type: "subjective" | "objective" | "mixed" } | null;
    error: { message: string } | null;
  };

  if (assignmentScopeResult.error || !assignmentScopeResult.data) {
    redirect("/student/assignments?error=접근 권한이 없는 숙제입니다.");
  }

  const assignment = assignmentScopeResult.data;

  let finalAnswerText = answerText;
  let finalSelectedOptionIds: string[] = [];
  let finalIsCorrect: boolean | null = null;
  if (assignment.question_type === "objective") {
    if (selectedOptionIds.length === 0) {
      redirect(`/student/assignments/${assignmentId}?error=객관식 답안을 선택해 주세요.`);
    }
    const optionsResult = (await supabase
      .from("assignment_objective_options")
      .select("id, is_correct")
      .filter("assignment_id", "eq", assignmentId)) as unknown as {
      data: Array<{ id: string; is_correct: boolean }> | null;
      error: { message: string } | null;
    };
    if (optionsResult.error) {
      redirect(`/student/assignments/${assignmentId}?error=${encodeURIComponent(optionsResult.error.message)}`);
    }
    const optionRows = optionsResult.data ?? [];
    const validOptionIds = new Set(optionRows.map((row) => row.id));
    finalSelectedOptionIds = selectedOptionIds.filter((id) => validOptionIds.has(id));
    if (finalSelectedOptionIds.length === 0) {
      redirect(`/student/assignments/${assignmentId}?error=유효한 선택지를 고르세요.`);
    }
    const correctOptionIds = optionRows.filter((row) => row.is_correct).map((row) => row.id).sort();
    const selectedSorted = [...finalSelectedOptionIds].sort();
    finalIsCorrect =
      correctOptionIds.length === selectedSorted.length &&
      correctOptionIds.every((id, idx) => id === selectedSorted[idx]);
    finalAnswerText = finalSelectedOptionIds.join(",");
  } else if (assignment.question_type === "mixed") {
    // submissions.answer_text has NOT NULL + non-empty check constraint.
    // For mixed assignments, detailed answers are stored in submission_answers.
    finalAnswerText = "[mixed]";
  } else if (!answerText) {
    redirect(`/student/assignments/${assignmentId}?error=답안을 입력해 주세요.`);
  }

  // WARNING: Supabase generic mismatch workaround for this repo's manual DB types.
  const submissionsWriter = supabase.from("submissions") as unknown as {
    upsert: (
      values: {
        assignment_id: string;
        guest_student_id: string;
        answer_text: string;
        selected_option_ids: string[];
        is_correct: boolean | null;
        submitted_at: string;
      },
      options: { onConflict: string },
    ) => Promise<{ error: { message: string } | null }>;
  };

  const { error } = await submissionsWriter.upsert(
    {
      assignment_id: assignmentId,
      guest_student_id: user.id,
      answer_text: finalAnswerText,
      selected_option_ids: finalSelectedOptionIds,
      is_correct: finalIsCorrect,
      submitted_at: new Date().toISOString(),
    },
    {
      onConflict: "assignment_id,guest_student_id",
    },
  );

  if (error) {
    redirect(`/student/assignments/${assignmentId}?error=${encodeURIComponent(error.message)}`);
  }

  if (assignment.question_type === "mixed") {
    type MixedAnswerInput = {
      question_id: string;
      question_type: "subjective" | "objective";
      answer_text: string;
      selected_option_ids: string[];
    };
    let mixedAnswers: MixedAnswerInput[] = [];
    try {
      mixedAnswers = JSON.parse(mixedAnswersRaw) as MixedAnswerInput[];
    } catch {
      redirect(`/student/assignments/${assignmentId}?error=혼합형 답안 형식이 올바르지 않습니다.`);
    }
    const submissionIdResult = (await supabase
      .from("submissions")
      .select("id")
      .eq("assignment_id", assignmentId)
      .eq("guest_student_id", user.id)
      .single()) as unknown as {
      data: { id: string } | null;
      error: { message: string } | null;
    };
    if (submissionIdResult.error || !submissionIdResult.data) {
      redirect(`/student/assignments/${assignmentId}?error=답안 저장에 실패했습니다.`);
    }

    const questionsResult = (await supabase
      .from("assignment_questions")
      .select("id, question_type")
      .filter("assignment_id", "eq", assignmentId)) as unknown as {
      data: Array<{ id: string; question_type: "subjective" | "objective" }> | null;
      error: { message: string } | null;
    };
    if (questionsResult.error) {
      redirect(`/student/assignments/${assignmentId}?error=${encodeURIComponent(questionsResult.error.message)}`);
    }
    const questions = questionsResult.data ?? [];
    const validQuestionMap = new Map(questions.map((q) => [q.id, q.question_type]));
    let optionRows: Array<{ id: string; question_id: string; is_correct: boolean }> = [];
    if (questions.length > 0) {
      const optionRowsResult = (await supabase
        .from("assignment_question_options")
        .select("id, question_id, is_correct")
        .in("question_id", questions.map((q) => q.id))) as unknown as {
        data: Array<{ id: string; question_id: string; is_correct: boolean }> | null;
        error: { message: string } | null;
      };
      if (optionRowsResult.error) {
        redirect(`/student/assignments/${assignmentId}?error=${encodeURIComponent(optionRowsResult.error.message)}`);
      }
      optionRows = optionRowsResult.data ?? [];
    }
    const optionsByQuestion = new Map<string, Array<{ id: string; is_correct: boolean }>>();
    optionRows.forEach((row) => {
      const list = optionsByQuestion.get(row.question_id) ?? [];
      list.push({ id: row.id, is_correct: row.is_correct });
      optionsByQuestion.set(row.question_id, list);
    });

    const answerRows = mixedAnswers
      .filter((answer) => validQuestionMap.has(answer.question_id))
      .map((answer) => {
        const questionType = validQuestionMap.get(answer.question_id);
        if (questionType === "objective") {
          const options = optionsByQuestion.get(answer.question_id) ?? [];
          const validIds = new Set(options.map((opt) => opt.id));
          const selectedIds = (answer.selected_option_ids ?? []).filter((id) => validIds.has(id));
          const correctIds = options.filter((opt) => opt.is_correct).map((opt) => opt.id).sort();
          const selectedSorted = [...selectedIds].sort();
          const isCorrect =
            correctIds.length === selectedSorted.length &&
            correctIds.every((id, idx) => id === selectedSorted[idx]);
          return {
            submission_id: submissionIdResult.data!.id,
            question_id: answer.question_id,
            answer_text: null,
            selected_option_ids: selectedIds,
            is_correct: isCorrect,
          };
        }
        return {
          submission_id: submissionIdResult.data!.id,
          question_id: answer.question_id,
          answer_text: String(answer.answer_text ?? "").trim(),
          selected_option_ids: [],
          is_correct: null,
        };
      });

    if (answerRows.length === 0) {
      redirect(`/student/assignments/${assignmentId}?error=문항별 답안을 입력해 주세요.`);
    }

    const answersWriter = supabase.from("submission_answers") as unknown as {
      upsert: (
        values: Array<{
          submission_id: string;
          question_id: string;
          answer_text: string | null;
          selected_option_ids: string[];
          is_correct: boolean | null;
        }>,
        options: { onConflict: string },
      ) => Promise<{ error: { message: string } | null }>;
    };
    const mixedUpsert = await answersWriter.upsert(answerRows, { onConflict: "submission_id,question_id" });
    if (mixedUpsert.error) {
      redirect(`/student/assignments/${assignmentId}?error=${encodeURIComponent(mixedUpsert.error.message)}`);
    }
  }

  revalidatePath("/student/dashboard");
  revalidatePath("/student/assignments");
  revalidatePath(`/student/assignments/${assignmentId}`);
}
