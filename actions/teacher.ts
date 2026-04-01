"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ASSIGNMENT_QUESTION_IMAGE_BUCKET } from "@/lib/assignment-question-images";
import { getAuthState } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const LIBRARY_FILE_SIZE_LIMIT_BYTES = 50 * 1024 * 1024;

function friendlyTeacherImageTableError(raw: string): string {
  if (
    raw.includes("teacher_image_assets") ||
    raw.toLowerCase().includes("schema cache") ||
    raw.includes("Could not find the table")
  ) {
    return "DB에 이미지 라이브러리 테이블이 없습니다. Supabase → SQL → 아래 파일 내용을 한 번 실행한 뒤 다시 시도해 주세요. (프로젝트의 sql/20250326_teacher_image_assets.sql)";
  }
  return raw;
}

export async function createAssignment(formData: FormData) {
  const classId = String(formData.get("classId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const dueAt = String(formData.get("dueAt") ?? "").trim();
  const questionType = "mixed" as const;
  const mixedQuestionsRaw = String(formData.get("mixedQuestions") ?? "[]");

  if (!classId || !title || !description || !dueAt) {
    redirect("/teacher/assignments/new?error=모든 필드를 입력해 주세요.");
  }

  const dueDate = new Date(dueAt);
  if (Number.isNaN(dueDate.getTime())) {
    redirect("/teacher/assignments/new?error=마감일 형식이 올바르지 않습니다.");
  }

  // DB 체크: due_at > created_at
  // datetime-local은 초 단위가 없어서 "현재 분"을 선택하면 due_at이 created_at보다 과거/동일로 해석될 수 있어,
  // 너무 가까운 값이면 안전하게 +60초 보정합니다.
  const nowMs = Date.now();
  const safeDueDateMs = dueDate.getTime() <= nowMs + 5000 ? nowMs + 60_000 : dueDate.getTime();
  const safeDueIso = new Date(safeDueDateMs).toISOString();
  type MixedQuestionInput = {
    type: "subjective" | "objective";
    prompt: string;
    model_answer?: string | null;
    sort_order: number;
    options: Array<{ option_text: string; is_correct: boolean; sort_order: number }>;
    library_asset_ids?: string[];
    existing_image_urls?: string[];
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
    if (question.type === "objective") {
      const validOptions = (question.options ?? []).filter((option) => option.option_text?.trim().length > 0);
      const correctCount = validOptions.filter((option) => option.is_correct).length;
      return validOptions.length < 2 || correctCount < 1;
    }
    return false;
  });
  if (invalidMixed) {
    const invalidIndex = mixedQuestions.findIndex((question) => {
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
  const classCheck = (await supabase
    .from("classes")
    .select("id")
    .eq("id", classId)
    .eq("teacher_id", user.id)
    .maybeSingle()) as unknown as {
    data: { id: string } | null;
    error: { message: string } | null;
  };
  if (classCheck.error || !classCheck.data) {
    redirect("/teacher/assignments/new?error=반 권한이 없습니다.");
  }

  // WARNING: Supabase generic mismatch workaround for this repo's manual DB types.
  const assignmentsWriter = supabase.from("assignments") as unknown as {
    insert: (values: {
      teacher_id: string;
      class_id: string;
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
      class_id: classId,
      title,
      description,
      question_type: questionType,
    due_at: safeDueIso,
    }).select("id").single();

  if (error || !data) {
    redirect(`/teacher/assignments/new?error=${encodeURIComponent(error?.message ?? "생성에 실패했습니다.")}`);
  }

  const questionsWriter = supabase.from("assignment_questions") as unknown as {
    insert: (values: Array<{
      assignment_id: string;
      question_type: "subjective" | "objective";
      prompt: string;
      model_answer: string | null;
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
    prompt: question.prompt.trim() || `문항 ${idx + 1}`,
    model_answer: question.type === "subjective" ? String(question.model_answer ?? "").trim() || null : null,
    sort_order: idx + 1,
  }));
  const questionsInsert = await questionsWriter.insert(questionsPayload).select("id, sort_order");
  if (questionsInsert.error || !questionsInsert.data) {
    redirect(`/teacher/assignments/new?error=${encodeURIComponent(questionsInsert.error?.message ?? "문항 저장 실패")}`);
  }
  const questionIdBySort = new Map<number, string>(
    questionsInsert.data.map((row) => [row.sort_order, row.id]),
  );

  // Upload optional per-question images → assignments/.../questions/... only (copy policy; see lib/assignment-question-images.ts).
  // assignment_questions.image_url: nullable text, JSON array string of public URLs for those objects.
  const imageBucketName = ASSIGNMENT_QUESTION_IMAGE_BUCKET;
  for (const [questionIndex, questionInput] of mixedQuestions.entries()) {
    const sortOrder = questionIndex + 1;
    const questionId = questionIdBySort.get(sortOrder);
    if (!questionId) continue;

    const fileFieldName = `questionImageFiles_${questionIndex}`;
    const files = formData
      .getAll(fileFieldName)
      .filter((f): f is File => {
        // Next.js server actions에서 파일이 들어오는 형태는 환경에 따라 다를 수 있어, File-like만 통과시킵니다.
        if (!f) return false;
        const candidate = f as unknown as { arrayBuffer?: unknown; size?: unknown };
        if (typeof candidate.arrayBuffer !== "function") return false;
        if (typeof candidate.size !== "number" || candidate.size <= 0) return false;
        return true;
      });

    const libraryIds = (questionInput.library_asset_ids ?? []).filter((id) => typeof id === "string" && id.length > 0);
    let libraryRows: Array<{ id: string; storage_path: string }> = [];
    if (libraryIds.length > 0) {
      const libResult = (await supabase
        .from("teacher_image_assets")
        .select("id, storage_path")
        .filter("teacher_id", "eq", user.id)
        .in("id", libraryIds)) as unknown as {
        data: Array<{ id: string; storage_path: string }> | null;
        error: { message: string } | null;
      };
      if (libResult.error) {
        redirect(`/teacher/assignments/new?error=${encodeURIComponent(libResult.error.message)}`);
      }
      libraryRows = libResult.data ?? [];
      if (libraryRows.length !== libraryIds.length) {
        redirect(
          `/teacher/assignments/new?error=${encodeURIComponent("이미지 라이브러리 항목을 찾을 수 없습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.")}`,
        );
      }
    }

    const pathById = new Map(libraryRows.map((r) => [r.id, r.storage_path]));
    const imageUrls: string[] = [];

    for (const assetId of libraryIds) {
      const sourcePath = pathById.get(assetId);
      if (!sourcePath) {
        redirect(
          `/teacher/assignments/new?error=${encodeURIComponent("이미지 라이브러리 항목을 찾을 수 없습니다.")}`,
        );
      }
      const sourceTail = sourcePath.includes("/") ? sourcePath.split("/").pop() ?? sourcePath : sourcePath;
      const extFromSource = sourceTail.includes(".") ? sourceTail.split(".").pop() : undefined;
      const safeExt = extFromSource ? extFromSource.toLowerCase().replace(/[^a-z0-9]+/g, "") : undefined;
      const destPath = `assignments/${data.id}/questions/${questionId}/${crypto.randomUUID()}${safeExt ? `.${safeExt}` : ""}`;

      const copyRes = await supabase.storage.from(imageBucketName).copy(sourcePath, destPath);
      if (copyRes.error) {
        redirect(`/teacher/assignments/new?error=${encodeURIComponent(copyRes.error.message)}`);
      }
      const publicUrl = supabase.storage.from(imageBucketName).getPublicUrl(destPath).data.publicUrl;
      imageUrls.push(publicUrl);
    }

    for (const file of files) {
      const originalName = file.name || "image";
      const ext = originalName.includes(".") ? originalName.split(".").pop() : undefined;
      const safeExt = ext ? ext.toLowerCase().replace(/[^a-z0-9]+/g, "") : undefined;
      const randomPart = crypto.randomUUID();
      const storagePath = `assignments/${data.id}/questions/${questionId}/${randomPart}${safeExt ? `.${safeExt}` : ""}`;

      const uploadRes = await supabase.storage
        .from(imageBucketName)
        .upload(storagePath, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadRes.error) {
        redirect(`/teacher/assignments/new?error=${encodeURIComponent(uploadRes.error.message)}`);
      }

      const publicUrl = supabase.storage.from(imageBucketName).getPublicUrl(storagePath).data.publicUrl;
      imageUrls.push(publicUrl);
    }

    if (imageUrls.length === 0) {
      await supabase.from("assignment_questions").update({ image_url: null }).eq("id", questionId);
      continue;
    }

    await supabase
      .from("assignment_questions")
      .update({ image_url: JSON.stringify(imageUrls) })
      .eq("id", questionId);
  }

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

export async function updateAssignment(formData: FormData) {
  const assignmentId = String(formData.get("assignmentId") ?? "").trim();
  const classId = String(formData.get("classId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const dueAt = String(formData.get("dueAt") ?? "").trim();
  const mixedQuestionsRaw = String(formData.get("mixedQuestions") ?? "[]");

  if (!assignmentId || !classId || !title || !description || !dueAt) {
    redirect(`/teacher/assignments/${assignmentId || ""}/edit?error=모든 필드를 입력해 주세요.`);
  }

  const dueDate = new Date(dueAt);
  if (Number.isNaN(dueDate.getTime())) {
    redirect(`/teacher/assignments/${assignmentId}/edit?error=마감일 형식이 올바르지 않습니다.`);
  }
  const nowMs = Date.now();
  const safeDueDateMs = dueDate.getTime() <= nowMs + 5000 ? nowMs + 60_000 : dueDate.getTime();
  const safeDueIso = new Date(safeDueDateMs).toISOString();

  type MixedQuestionInput = {
    type: "subjective" | "objective";
    prompt: string;
    model_answer?: string | null;
    sort_order: number;
    options: Array<{ option_text: string; is_correct: boolean; sort_order: number }>;
    library_asset_ids?: string[];
    existing_image_urls?: string[];
  };

  let mixedQuestions: MixedQuestionInput[] = [];
  try {
    mixedQuestions = JSON.parse(mixedQuestionsRaw) as MixedQuestionInput[];
  } catch {
    redirect(`/teacher/assignments/${assignmentId}/edit?error=혼합형 문항 데이터 형식이 올바르지 않습니다.`);
  }
  if (!Array.isArray(mixedQuestions) || mixedQuestions.length === 0) {
    redirect(`/teacher/assignments/${assignmentId}/edit?error=혼합형 문항을 1개 이상 추가해 주세요.`);
  }

  const invalidMixed = mixedQuestions.findIndex((question) => {
    if (question.type === "objective") {
      const validOptions = (question.options ?? []).filter((option) => option.option_text?.trim().length > 0);
      const correctCount = validOptions.filter((option) => option.is_correct).length;
      return validOptions.length < 2 || correctCount < 1;
    }
    return false;
  });
  if (invalidMixed >= 0) {
    redirect(
      `/teacher/assignments/${assignmentId}/edit?error=${encodeURIComponent(`${invalidMixed + 1}번 문항 입력을 확인해 주세요.`)}`,
    );
  }

  const { user, profile } = await getAuthState();
  if (!user || profile?.role !== "teacher") {
    redirect("/login?error=권한이 없습니다.");
  }

  const supabase = createServerSupabaseClient();
  const assignmentResult = (await supabase
    .from("assignments")
    .select("id, class_id")
    .eq("id", assignmentId)
    .eq("teacher_id", user.id)
    .maybeSingle()) as unknown as {
    data: { id: string; class_id: string } | null;
    error: { message: string } | null;
  };
  if (assignmentResult.error || !assignmentResult.data) {
    redirect("/teacher/assignments?error=수정 권한이 없습니다.");
  }
  if (assignmentResult.data.class_id !== classId) {
    redirect(`/teacher/assignments/${assignmentId}/edit?error=반 정보가 일치하지 않습니다.`);
  }

  const submissionsCountResult = (await supabase
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("assignment_id", assignmentId)) as unknown as {
    count: number | null;
    error: { message: string } | null;
  };
  if (submissionsCountResult.error) {
    redirect(`/teacher/assignments/${assignmentId}/edit?error=${encodeURIComponent(submissionsCountResult.error.message)}`);
  }
  if ((submissionsCountResult.count ?? 0) > 0) {
    redirect(`/teacher/assignments/${assignmentId}/edit?error=이미 제출이 존재하여 수정할 수 없습니다.`);
  }

  const assignmentUpdateResult = (await supabase
    .from("assignments")
    .update({
      title,
      description,
      due_at: safeDueIso,
    })
    .eq("id", assignmentId)
    .eq("teacher_id", user.id)) as unknown as { error: { message: string } | null };
  if (assignmentUpdateResult.error) {
    redirect(`/teacher/assignments/${assignmentId}/edit?error=${encodeURIComponent(assignmentUpdateResult.error.message)}`);
  }

  const oldQuestionsResult = (await supabase
    .from("assignment_questions")
    .select("id")
    .eq("assignment_id", assignmentId)) as unknown as {
    data: Array<{ id: string }> | null;
    error: { message: string } | null;
  };
  if (oldQuestionsResult.error) {
    redirect(`/teacher/assignments/${assignmentId}/edit?error=${encodeURIComponent(oldQuestionsResult.error.message)}`);
  }
  const oldQuestionIds = (oldQuestionsResult.data ?? []).map((q) => q.id);
  if (oldQuestionIds.length > 0) {
    await supabase.from("assignment_question_options").delete().in("question_id", oldQuestionIds);
  }
  await supabase.from("assignment_questions").delete().eq("assignment_id", assignmentId);

  const questionsWriter = supabase.from("assignment_questions") as unknown as {
    insert: (values: Array<{
      assignment_id: string;
      question_type: "subjective" | "objective";
      prompt: string;
      model_answer: string | null;
      sort_order: number;
    }>) => {
      select: (fields: string) => Promise<{
        data: Array<{ id: string; sort_order: number }> | null;
        error: { message: string } | null;
      }>;
    };
  };
  const questionsInsert = await questionsWriter
    .insert(
      mixedQuestions.map((question, idx) => ({
        assignment_id: assignmentId,
        question_type: question.type,
        prompt: question.prompt.trim() || `문항 ${idx + 1}`,
        model_answer: question.type === "subjective" ? String(question.model_answer ?? "").trim() || null : null,
        sort_order: idx + 1,
      })),
    )
    .select("id, sort_order");
  if (questionsInsert.error || !questionsInsert.data) {
    redirect(`/teacher/assignments/${assignmentId}/edit?error=${encodeURIComponent(questionsInsert.error?.message ?? "문항 저장 실패")}`);
  }
  const questionIdBySort = new Map<number, string>(questionsInsert.data.map((row) => [row.sort_order, row.id]));

  const imageBucketName = ASSIGNMENT_QUESTION_IMAGE_BUCKET;
  for (const [questionIndex, questionInput] of mixedQuestions.entries()) {
    const questionId = questionIdBySort.get(questionIndex + 1);
    if (!questionId) continue;

    const fileFieldName = `questionImageFiles_${questionIndex}`;
    const files = formData.getAll(fileFieldName).filter((f): f is File => {
      if (!f) return false;
      const candidate = f as unknown as { arrayBuffer?: unknown; size?: unknown };
      if (typeof candidate.arrayBuffer !== "function") return false;
      if (typeof candidate.size !== "number" || candidate.size <= 0) return false;
      return true;
    });

    const libraryIds = (questionInput.library_asset_ids ?? []).filter((id) => typeof id === "string" && id.length > 0);
    const existingUrls = (questionInput.existing_image_urls ?? []).filter((url) => typeof url === "string" && url.length > 0);
    let libraryRows: Array<{ id: string; storage_path: string }> = [];
    if (libraryIds.length > 0) {
      const libResult = (await supabase
        .from("teacher_image_assets")
        .select("id, storage_path")
        .eq("teacher_id", user.id)
        .in("id", libraryIds)) as unknown as {
        data: Array<{ id: string; storage_path: string }> | null;
        error: { message: string } | null;
      };
      if (libResult.error) {
        redirect(`/teacher/assignments/${assignmentId}/edit?error=${encodeURIComponent(libResult.error.message)}`);
      }
      libraryRows = libResult.data ?? [];
      if (libraryRows.length !== libraryIds.length) {
        redirect(`/teacher/assignments/${assignmentId}/edit?error=${encodeURIComponent("이미지 라이브러리 항목을 찾을 수 없습니다.")}`);
      }
    }

    const pathById = new Map(libraryRows.map((r) => [r.id, r.storage_path]));
    const imageUrls: string[] = [...existingUrls];

    for (const assetId of libraryIds) {
      const sourcePath = pathById.get(assetId);
      if (!sourcePath) continue;
      const sourceTail = sourcePath.includes("/") ? sourcePath.split("/").pop() ?? sourcePath : sourcePath;
      const extFromSource = sourceTail.includes(".") ? sourceTail.split(".").pop() : undefined;
      const safeExt = extFromSource ? extFromSource.toLowerCase().replace(/[^a-z0-9]+/g, "") : undefined;
      const destPath = `assignments/${assignmentId}/questions/${questionId}/${crypto.randomUUID()}${safeExt ? `.${safeExt}` : ""}`;
      const copyRes = await supabase.storage.from(imageBucketName).copy(sourcePath, destPath);
      if (copyRes.error) {
        redirect(`/teacher/assignments/${assignmentId}/edit?error=${encodeURIComponent(copyRes.error.message)}`);
      }
      imageUrls.push(supabase.storage.from(imageBucketName).getPublicUrl(destPath).data.publicUrl);
    }

    for (const file of files) {
      const originalName = file.name || "image";
      const ext = originalName.includes(".") ? originalName.split(".").pop() : undefined;
      const safeExt = ext ? ext.toLowerCase().replace(/[^a-z0-9]+/g, "") : undefined;
      const storagePath = `assignments/${assignmentId}/questions/${questionId}/${crypto.randomUUID()}${safeExt ? `.${safeExt}` : ""}`;
      const uploadRes = await supabase.storage.from(imageBucketName).upload(storagePath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (uploadRes.error) {
        redirect(`/teacher/assignments/${assignmentId}/edit?error=${encodeURIComponent(uploadRes.error.message)}`);
      }
      imageUrls.push(supabase.storage.from(imageBucketName).getPublicUrl(storagePath).data.publicUrl);
    }

    await supabase
      .from("assignment_questions")
      .update({ image_url: imageUrls.length > 0 ? JSON.stringify(imageUrls) : null })
      .eq("id", questionId);
  }

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
    const optionsInsert = (await supabase.from("assignment_question_options").insert(optionRows)) as unknown as {
      error: { message: string } | null;
    };
    if (optionsInsert.error) {
      redirect(`/teacher/assignments/${assignmentId}/edit?error=${encodeURIComponent(optionsInsert.error.message)}`);
    }
  }

  revalidatePath("/teacher/dashboard");
  revalidatePath("/teacher/assignments");
  revalidatePath("/teacher/assignments/new");
  revalidatePath(`/teacher/assignments/${assignmentId}`);
  revalidatePath("/student/dashboard");
  revalidatePath("/student/assignments");
  redirect(`/teacher/assignments/${assignmentId}?success=${encodeURIComponent("숙제가 수정되었습니다.")}`);
}

export async function uploadTeacherLibraryImage(formData: FormData) {
  const { user, profile } = await getAuthState();
  if (!user || profile?.role !== "teacher") {
    return { ok: false as const, error: "권한이 없습니다." };
  }

  const file = formData.get("file");
  if (!file || typeof file !== "object" || !("arrayBuffer" in file)) {
    return { ok: false as const, error: "파일을 선택해 주세요." };
  }
  const f = file as File;
  if (typeof f.size !== "number" || f.size <= 0) {
    return { ok: false as const, error: "파일을 선택해 주세요." };
  }
  if (f.size > LIBRARY_FILE_SIZE_LIMIT_BYTES) {
    return { ok: false as const, error: "이미지 용량이 50MB를 초과했습니다. 용량을 줄여 다시 시도해 주세요." };
  }

  const supabase = createServerSupabaseClient();
  const bucket = ASSIGNMENT_QUESTION_IMAGE_BUCKET;
  const originalName = f.name || "image";
  const ext = originalName.includes(".") ? originalName.split(".").pop() : undefined;
  const safeExt = ext ? ext.toLowerCase().replace(/[^a-z0-9]+/g, "") : undefined;
  const storagePath = `library/${user.id}/${crypto.randomUUID()}${safeExt ? `.${safeExt}` : ""}`;

  const uploadRes = await supabase.storage.from(bucket).upload(storagePath, f, {
    contentType: f.type || "application/octet-stream",
    upsert: false,
  });
  if (uploadRes.error) {
    const message = uploadRes.error.message.toLowerCase();
    if (message.includes("maximum allowed size") || message.includes("too large") || message.includes("payload")) {
      return { ok: false as const, error: "이미지 용량이 제한을 초과했습니다. 용량을 줄여 다시 시도해 주세요." };
    }
    return { ok: false as const, error: uploadRes.error.message };
  }

  const insertResult = (await supabase.from("teacher_image_assets").insert({
    teacher_id: user.id,
    storage_path: storagePath,
    original_filename: originalName,
  })) as unknown as { error: { message: string } | null };

  if (insertResult.error) {
    await supabase.storage.from(bucket).remove([storagePath]);
    return { ok: false as const, error: friendlyTeacherImageTableError(insertResult.error.message) };
  }

  revalidatePath("/teacher/assignments/new");
  return { ok: true as const };
}

export async function deleteTeacherLibraryImage(formData: FormData) {
  const assetId = String(formData.get("assetId") ?? "").trim();
  if (!assetId) {
    return { ok: false as const, error: "잘못된 요청입니다." };
  }

  const { user, profile } = await getAuthState();
  if (!user || profile?.role !== "teacher") {
    return { ok: false as const, error: "권한이 없습니다." };
  }

  const supabase = createServerSupabaseClient();
  const bucket = ASSIGNMENT_QUESTION_IMAGE_BUCKET;

  const rowResult = (await supabase
    .from("teacher_image_assets")
    .select("storage_path")
    .filter("id", "eq", assetId)
    .filter("teacher_id", "eq", user.id)
    .maybeSingle()) as unknown as {
    data: { storage_path: string } | null;
    error: { message: string } | null;
  };

  if (rowResult.error || !rowResult.data) {
    return { ok: false as const, error: "이미지를 찾을 수 없습니다." };
  }

  const delDb = (await supabase.from("teacher_image_assets").delete().filter("id", "eq", assetId)) as unknown as {
    error: { message: string } | null;
  };
  if (delDb.error) {
    return { ok: false as const, error: friendlyTeacherImageTableError(delDb.error.message) };
  }

  await supabase.storage.from(bucket).remove([rowResult.data.storage_path]);
  revalidatePath("/teacher/assignments/new");
  return { ok: true as const };
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
  const returnTo = String(formData.get("returnTo") ?? "").trim();
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
    const errorTarget =
      returnTo.startsWith("/teacher/") && !returnTo.startsWith("//") ? returnTo : "/teacher/assignments";
    const separator = errorTarget.includes("?") ? "&" : "?";
    redirect(`${errorTarget}${separator}error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/teacher/dashboard");
  revalidatePath("/teacher/assignments");
  revalidatePath("/student/dashboard");
  revalidatePath("/student/assignments");
  if (returnTo.startsWith("/teacher/") && !returnTo.startsWith("//")) {
    revalidatePath(returnTo.split("?")[0] ?? returnTo);
    redirect(returnTo);
  }
  redirect("/teacher/assignments");
}
