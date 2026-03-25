"use server";

import { redirect } from "next/navigation";

import { createAppSession, clearAppSession } from "@/lib/auth/custom-session";
import { verifySecret } from "@/lib/auth/password";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/auth";

function getRoleHomePath(role: UserRole) {
  return role === "teacher" ? "/teacher/dashboard" : "/student/dashboard";
}

function failLogin(message: string): never {
  redirect(`/login?error=${encodeURIComponent(message)}`);
}

export async function signIn(formData: FormData) {
  const loginType = String(formData.get("loginType") ?? "");
  const supabase = createServerSupabaseClient();

  if (loginType === "teacher") {
    const loginId = String(formData.get("teacherLoginId") ?? "").trim();
    const password = String(formData.get("teacherPassword") ?? "").trim();
    if (!loginId || !password) {
      failLogin("로그인 아이디와 비밀번호를 입력해 주세요.");
    }

    const credentialsResult = (await supabase
      .from("account_credentials")
      .select("profile_id, password_hash, is_active")
      .filter("role", "eq", "teacher")
      .filter("teacher_login_id", "eq", loginId)
      .filter("is_active", "eq", true)
      .maybeSingle()) as unknown as {
      data: { profile_id: string; password_hash: string | null; is_active: boolean } | null;
      error: { message: string } | null;
    };

    if (credentialsResult.error || !credentialsResult.data || !credentialsResult.data.password_hash) {
      failLogin("계정을 찾을 수 없습니다.");
    }

    const isPasswordValid = await verifySecret(password, credentialsResult.data.password_hash);
    if (!isPasswordValid) {
      failLogin("비밀번호가 올바르지 않습니다.");
    }

    const profileResult = (await supabase
      .from("profiles")
      .select("id, role, name, is_active")
      .filter("id", "eq", credentialsResult.data.profile_id)
      .filter("is_active", "eq", true)
      .single()) as unknown as {
      data: { id: string; role: UserRole; name: string; is_active: boolean } | null;
      error: { message: string } | null;
    };

    if (profileResult.error || !profileResult.data || profileResult.data.role !== "teacher") {
      failLogin("계정을 찾을 수 없습니다.");
    }

    await createAppSession({
      profileId: profileResult.data.id,
      role: profileResult.data.role,
      name: profileResult.data.name,
    });
    redirect(getRoleHomePath(profileResult.data.role));
  }

  if (loginType === "student") {
    const name = String(formData.get("studentName") ?? "").trim();
    const phoneLast4 = String(formData.get("studentPhoneLast4") ?? "").trim();
    if (!name || !/^\d{4}$/.test(phoneLast4)) {
      failLogin("이름과 전화번호 뒤 4자리를 정확히 입력해 주세요.");
    }

    const profileCandidatesResult = (await supabase
      .from("profiles")
      .select("id, role, name, is_active")
      .filter("role", "eq", "student")
      .filter("name", "eq", name)
      .filter("is_active", "eq", true)) as unknown as {
      data: Array<{ id: string; role: UserRole; name: string; is_active: boolean }> | null;
      error: { message: string } | null;
    };

    if (profileCandidatesResult.error) {
      failLogin("로그인 중 오류가 발생했습니다.");
    }

    const profileCandidates = profileCandidatesResult.data ?? [];
    if (profileCandidates.length === 0) {
      failLogin("계정을 찾을 수 없습니다.");
    }

    const profileIds = profileCandidates.map((profile) => profile.id);
    const credentialsResult = (await supabase
      .from("account_credentials")
      .select("profile_id, student_phone_last4_hash, is_active")
      .filter("role", "eq", "student")
      .filter("is_active", "eq", true)
      .in("profile_id", profileIds)) as unknown as {
      data: Array<{ profile_id: string; student_phone_last4_hash: string | null; is_active: boolean }> | null;
      error: { message: string } | null;
    };

    if (credentialsResult.error) {
      failLogin("로그인 중 오류가 발생했습니다.");
    }

    const matchedProfiles: Array<{ id: string; role: UserRole; name: string }> = [];
    for (const profile of profileCandidates) {
      const credential = (credentialsResult.data ?? []).find((item) => item.profile_id === profile.id);
      if (!credential?.student_phone_last4_hash) continue;
      // IMPORTANT: phone_last4 is compared only on server against hash.
      const isMatch = await verifySecret(phoneLast4, credential.student_phone_last4_hash);
      if (isMatch) {
        matchedProfiles.push(profile);
      }
    }

    if (matchedProfiles.length === 0) {
      failLogin("계정을 찾을 수 없습니다.");
    }
    if (matchedProfiles.length > 1) {
      failLogin("동명이인 계정이 있어 운영자 확인이 필요합니다.");
    }

    const matched = matchedProfiles[0];
    await createAppSession({
      profileId: matched.id,
      role: matched.role,
      name: matched.name,
    });
    redirect(getRoleHomePath(matched.role));
  }

  failLogin("유효하지 않은 로그인 유형입니다.");
}

export async function signOut() {
  await clearAppSession();
  redirect("/login");
}
