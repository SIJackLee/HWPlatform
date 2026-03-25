import type { Profile, SessionUser, UserRole } from "@/types/auth";
import { getAppSessionFromCookies } from "@/lib/auth/custom-session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getAuthState() {
  const session = await getAppSessionFromCookies();
  if (!session) {
    return { user: null, profile: null as Profile | null };
  }

  const supabase = createServerSupabaseClient();
  const profileResult = (await supabase
    .from("profiles")
    .select("*")
    .filter("id", "eq", session.profile_id)
    .filter("is_active", "eq", true)
    .maybeSingle()) as unknown as { data: Profile | null };

  if (!profileResult.data) {
    return { user: null, profile: null as Profile | null };
  }

  const user: SessionUser = { id: profileResult.data.id };
  return { user, profile: profileResult.data };
}

export function roleHomePath(role: UserRole) {
  return role === "teacher" ? "/teacher/dashboard" : "/student/dashboard";
}
