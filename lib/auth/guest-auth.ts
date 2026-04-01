import type { SessionUser } from "@/types/auth";
import { getGuestSessionFromCookies } from "@/lib/auth/guest-session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface GuestProfile {
  id: string;
  class_id: string;
  name: string;
}

export async function getGuestAuthState() {
  const session = await getGuestSessionFromCookies();
  if (!session) {
    return { user: null as SessionUser | null, profile: null as GuestProfile | null };
  }

  const supabase = createServerSupabaseClient();
  const guestResult = (await supabase
    .from("guest_students")
    .select("id, class_id, name")
    .eq("id", session.guest_student_id)
    .eq("class_id", session.class_id)
    .is("revoked_at", null)
    .maybeSingle()) as unknown as {
    data: GuestProfile | null;
  };

  if (!guestResult.data) {
    return { user: null as SessionUser | null, profile: null as GuestProfile | null };
  }

  return {
    user: { id: guestResult.data.id },
    profile: guestResult.data,
  };
}
