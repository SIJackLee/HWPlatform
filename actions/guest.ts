"use server";

import { createHmac } from "node:crypto";
import { redirect } from "next/navigation";

import { createGuestSession } from "@/lib/auth/guest-session";
import { appSessionSecret } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function normalizeInviteCode(raw: string) {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function normalizeName(raw: string) {
  return raw.trim().replace(/\s+/g, " ");
}

function hashInviteCode(code: string) {
  return createHmac("sha256", `${appSessionSecret}:invite`).update(code).digest("hex");
}

function hashPin4(pin4: string) {
  return createHmac("sha256", `${appSessionSecret}:pin4`).update(pin4).digest("hex");
}

export async function joinWithInviteCode(formData: FormData) {
  const rawCode = String(formData.get("inviteCode") ?? "");
  const rawName = String(formData.get("name") ?? "");
  const rawPin4 = String(formData.get("pin4") ?? "");

  const normalizedCode = normalizeInviteCode(rawCode);
  const name = normalizeName(rawName);
  const nameNorm = name.toLowerCase();
  const pin4 = rawPin4.trim();

  if (!/^[A-Z0-9]{8,12}$/.test(normalizedCode)) {
    redirect("/join?error=초대코드 형식이 올바르지 않습니다.");
  }
  if (!name || name.length > 32) {
    redirect("/join?error=이름을 1~32자 이내로 입력해 주세요.");
  }
  if (!/^\d{4}$/.test(pin4)) {
    redirect("/join?error=숫자 4자리를 정확히 입력해 주세요.");
  }

  const supabase = createServerSupabaseClient();
  const codeHash = hashInviteCode(normalizedCode);

  const inviteResult = (await supabase
    .from("class_invite_codes")
    .select("id, class_id, expires_at, max_uses, used_count, revoked_at")
    .eq("code_hash", codeHash)
    .is("revoked_at", null)
    .maybeSingle()) as unknown as {
    data: {
      id: string;
      class_id: string;
      expires_at: string;
      max_uses: number | null;
      used_count: number;
      revoked_at: string | null;
    } | null;
    error: { message: string } | null;
  };

  if (inviteResult.error || !inviteResult.data) {
    redirect("/join?error=유효하지 않은 초대코드입니다.");
  }

  const invite = inviteResult.data;
  if (new Date(invite.expires_at).getTime() <= Date.now()) {
    redirect("/join?error=만료된 초대코드입니다.");
  }
  if (invite.max_uses != null && invite.used_count >= invite.max_uses) {
    redirect("/join?error=사용 한도를 초과한 초대코드입니다.");
  }

  const pin4Hmac = hashPin4(pin4);

  const sameNameResult = (await supabase
    .from("guest_students")
    .select("id, pin4_hmac")
    .eq("class_id", invite.class_id)
    .eq("name_norm", nameNorm)
    .is("revoked_at", null)) as unknown as {
    data: Array<{ id: string; pin4_hmac: string }> | null;
    error: { message: string } | null;
  };

  if (sameNameResult.error) {
    redirect("/join?error=입장 처리 중 오류가 발생했습니다.");
  }

  const sameNameRows = sameNameResult.data ?? [];
  const matchedExisting = sameNameRows.find((row) => row.pin4_hmac === pin4Hmac);
  if (sameNameRows.length > 0 && !matchedExisting) {
    redirect("/join?error=같은 이름으로 이미 등록된 제출자가 있습니다. 4자리 숫자를 확인해 주세요.");
  }

  let guestStudentId = matchedExisting?.id ?? null;
  let isNewGuest = false;

  if (!guestStudentId) {
    const insertGuest = (await supabase
      .from("guest_students")
      .insert({
        class_id: invite.class_id,
        name,
        name_norm: nameNorm,
        pin4_hmac: pin4Hmac,
        last_seen_at: new Date().toISOString(),
      })
      .select("id")
      .single()) as unknown as {
      data: { id: string } | null;
      error: { message: string } | null;
    };
    if (insertGuest.error || !insertGuest.data) {
      redirect("/join?error=제출자 등록에 실패했습니다.");
    }
    guestStudentId = insertGuest.data.id;
    isNewGuest = true;
  } else {
    await supabase
      .from("guest_students")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", guestStudentId);
  }

  if (isNewGuest) {
    await supabase
      .from("class_invite_codes")
      .update({ used_count: invite.used_count + 1 })
      .eq("id", invite.id);
  }

  await createGuestSession({
    guestStudentId,
    classId: invite.class_id,
    name,
  });
  redirect("/student/dashboard");
}
