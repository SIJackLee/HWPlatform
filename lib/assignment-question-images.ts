import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * 문항 이미지 저장 정책 (고정: 복사)
 *
 * - `assignment_questions.image_url`에 기록되는 URL은 **항상** 이 숙제·문항 전용 객체를 가리킨다.
 *   경로 규칙: `assignments/{assignmentId}/questions/{questionId}/...` (버킷 `assignment-question-images`).
 * - 선생님 **라이브러리**(`library/{teacherId}/...`)에서 문항으로 넣을 때도 라이브러리 객체 URL을 그대로 넣지 않고,
 *   Storage에서 위 문항 경로로 **복사(copy)** 한 뒤, 복사본의 URL만 JSON 배열에 넣는다.
 *   (라이브러리에서 삭제·변경해도 이미 배포된 숙제 문항이 깨지지 않게 하기 위함.)
 */
export const ASSIGNMENT_QUESTION_IMAGE_BUCKET = "assignment-question-images";

/** Public object URL → Storage object path (bucket 제외). */
export function publicUrlToStoragePath(publicUrl: string, bucket: string): string | null {
  const needle = `/storage/v1/object/public/${bucket}/`;
  const i = publicUrl.indexOf(needle);
  if (i === -1) return null;
  return decodeURIComponent(publicUrl.slice(i + needle.length));
}

export function parseImageUrls(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === "string");
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return raw ? [raw] : [];
  }
}

/**
 * DB에 저장된 public URL 배열(JSON 문자열)을 Storage 서명 URL로 바꿉니다.
 * 비공개 버킷·RLS로 인해 브라우저에서 public URL이 막힐 때 사용합니다.
 */
export async function signAssignmentQuestionImageUrlJson(
  supabase: SupabaseClient<Database>,
  imageUrlJson: string | null,
  expiresInSeconds: number,
): Promise<string | null> {
  if (!imageUrlJson) return null;
  const urls = parseImageUrls(imageUrlJson);
  if (urls.length === 0) return imageUrlJson;

  const bucket = ASSIGNMENT_QUESTION_IMAGE_BUCKET;
  const signed: string[] = [];
  for (const u of urls) {
    const path = publicUrlToStoragePath(u, bucket);
    if (!path) {
      signed.push(u);
      continue;
    }
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
    if (error || !data?.signedUrl) {
      signed.push(u);
      continue;
    }
    signed.push(data.signedUrl);
  }
  return JSON.stringify(signed);
}
