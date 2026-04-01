"use server";

import { createHmac, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthState } from "@/lib/auth/session";
import { appSessionSecret } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function normalizeInviteCode(raw: string) {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function hashInviteCode(code: string) {
  return createHmac("sha256", `${appSessionSecret}:invite`).update(code).digest("hex");
}

function generateInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  const chars = Array.from(bytes).map((b) => alphabet[b % alphabet.length]);
  return `HW-${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}`;
}

export async function createClass(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    redirect("/teacher/classes?error=반 이름을 입력해 주세요.");
  }

  const { user, profile } = await getAuthState();
  if (!user || profile?.role !== "teacher") {
    redirect("/login?error=권한이 없습니다.");
  }

  const supabase = createServerSupabaseClient();
  const createResult = (await supabase
    .from("classes")
    .insert({ teacher_id: user.id, name })
    .select("id")
    .single()) as unknown as {
    data: { id: string } | null;
    error: { message: string } | null;
  };
  if (createResult.error || !createResult.data) {
    redirect(`/teacher/classes?error=${encodeURIComponent(createResult.error?.message ?? "반 생성 실패")}`);
  }

  revalidatePath("/teacher/classes");
  redirect(`/teacher/classes/${createResult.data.id}`);
}

export async function createInviteCode(formData: FormData) {
  const classId = String(formData.get("classId") ?? "").trim();
  if (!classId) {
    redirect("/teacher/classes?error=반 정보가 올바르지 않습니다.");
  }

  const { user, profile } = await getAuthState();
  if (!user || profile?.role !== "teacher") {
    redirect("/login?error=권한이 없습니다.");
  }

  const supabase = createServerSupabaseClient();
  const classResult = (await supabase
    .from("classes")
    .select("id")
    .eq("id", classId)
    .eq("teacher_id", user.id)
    .maybeSingle()) as unknown as {
    data: { id: string } | null;
    error: { message: string } | null;
  };
  if (classResult.error || !classResult.data) {
    redirect("/teacher/classes?error=반 권한이 없습니다.");
  }

  const code = generateInviteCode();
  const codeHash = hashInviteCode(normalizeInviteCode(code));
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await supabase
    .from("class_invite_codes")
    .update({ revoked_at: new Date().toISOString() })
    .eq("class_id", classId)
    .is("revoked_at", null);

  const insertResult = (await supabase.from("class_invite_codes").insert({
    class_id: classId,
    code_hash: codeHash,
    display_code: code,
    expires_at: expiresAt,
  })) as unknown as { error: { message: string } | null };
  if (insertResult.error) {
    redirect(`/teacher/classes/${classId}?error=${encodeURIComponent(insertResult.error.message)}`);
  }

  revalidatePath(`/teacher/classes/${classId}`);
  redirect(`/teacher/classes/${classId}?newCode=${encodeURIComponent(code)}`);
}

export async function revokeInviteCode(formData: FormData) {
  const inviteId = String(formData.get("inviteId") ?? "").trim();
  const classId = String(formData.get("classId") ?? "").trim();
  if (!inviteId || !classId) {
    redirect("/teacher/classes?error=요청 정보가 올바르지 않습니다.");
  }

  const { user, profile } = await getAuthState();
  if (!user || profile?.role !== "teacher") {
    redirect("/login?error=권한이 없습니다.");
  }

  const supabase = createServerSupabaseClient();
  const checkResult = (await supabase
    .from("classes")
    .select("id")
    .eq("id", classId)
    .eq("teacher_id", user.id)
    .maybeSingle()) as unknown as {
    data: { id: string } | null;
    error: { message: string } | null;
  };
  if (checkResult.error || !checkResult.data) {
    redirect("/teacher/classes?error=반 권한이 없습니다.");
  }

  await supabase
    .from("class_invite_codes")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", inviteId)
    .eq("class_id", classId);

  revalidatePath(`/teacher/classes/${classId}`);
  redirect(`/teacher/classes/${classId}`);
}

export async function deleteClass(formData: FormData) {
  const classId = String(formData.get("classId") ?? "").trim();
  const returnTo = String(formData.get("returnTo") ?? "").trim();
  if (!classId) {
    redirect("/teacher/classes?error=반 정보가 올바르지 않습니다.");
  }

  const { user, profile } = await getAuthState();
  if (!user || profile?.role !== "teacher") {
    redirect("/login?error=권한이 없습니다.");
  }

  const supabase = createServerSupabaseClient();
  const classResult = (await supabase
    .from("classes")
    .select("id, name")
    .eq("id", classId)
    .eq("teacher_id", user.id)
    .maybeSingle()) as unknown as {
    data: { id: string; name: string } | null;
    error: { message: string } | null;
  };
  if (classResult.error || !classResult.data) {
    redirect("/teacher/classes?error=삭제 권한이 없는 반입니다.");
  }

  const assignmentsCountResult = (await supabase
    .from("assignments")
    .select("id", { count: "exact", head: true })
    .eq("class_id", classId)) as unknown as {
    count: number | null;
    error: { message: string } | null;
  };
  if (assignmentsCountResult.error) {
    redirect(`/teacher/classes?error=${encodeURIComponent(assignmentsCountResult.error.message)}`);
  }
  if ((assignmentsCountResult.count ?? 0) > 0) {
    redirect("/teacher/classes?error=이 반에 숙제가 남아 있어 삭제할 수 없습니다. 숙제를 먼저 삭제해 주세요.");
  }

  const deleteResult = (await supabase
    .from("classes")
    .delete()
    .eq("id", classId)
    .eq("teacher_id", user.id)) as unknown as {
    error: { message: string } | null;
  };
  if (deleteResult.error) {
    redirect(`/teacher/classes?error=${encodeURIComponent(deleteResult.error.message)}`);
  }

  revalidatePath("/teacher/classes");
  revalidatePath("/teacher/dashboard");
  if (returnTo.startsWith("/teacher/") && !returnTo.startsWith("//")) {
    redirect(returnTo);
  }
  redirect("/teacher/classes");
}
