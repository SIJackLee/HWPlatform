import { ASSIGNMENT_QUESTION_IMAGE_BUCKET } from "@/lib/assignment-question-images";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type TeacherLibraryAssetPreview = { id: string; previewUrl: string; filename: string };

const SIGNED_PREVIEW_TTL_SECONDS = 60 * 60 * 24;

export async function getTeacherImageLibraryForForm(teacherId: string): Promise<TeacherLibraryAssetPreview[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("teacher_image_assets")
    .select("id, storage_path, original_filename")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });

  // 테이블 미생성·마이그레이션 전·일시적 API 오류 시에도 숙제 등록 화면은 열리도록 빈 목록으로 폴백합니다.
  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[teacher_image_assets]", error.message, error.code ?? "");
    }
    return [];
  }

  const bucket = ASSIGNMENT_QUESTION_IMAGE_BUCKET;
  const out: TeacherLibraryAssetPreview[] = [];
  for (const row of data ?? []) {
    const { data: signed, error: signErr } = await supabase.storage
      .from(bucket)
      .createSignedUrl(row.storage_path, SIGNED_PREVIEW_TTL_SECONDS);
    if (signErr || !signed?.signedUrl) continue;
    const fallbackFilename = decodeURIComponent((row.storage_path.split("/").pop() ?? "image").trim());
    out.push({
      id: row.id,
      previewUrl: signed.signedUrl,
      filename: (row.original_filename ?? "").trim() || fallbackFilename,
    });
  }
  return out;
}
