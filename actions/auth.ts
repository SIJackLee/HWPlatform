"use server";

import { redirect } from "next/navigation";

import { createAppSession, clearAppSession } from "@/lib/auth/custom-session";
import { clearGuestSession } from "@/lib/auth/guest-session";
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
    redirect("/join");
  }

  failLogin("유효하지 않은 로그인 유형입니다.");
}

export async function signOut() {
  await clearAppSession();
  await clearGuestSession();
  redirect("/login");
}
