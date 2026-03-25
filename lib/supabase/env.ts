function requireEnv(
  name:
    | "NEXT_PUBLIC_SUPABASE_URL"
    | "SUPABASE_SERVICE_ROLE_KEY",
): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env: ${name}`);
  }
  return value;
}

const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseServiceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
// IMPORTANT: production should always set APP_SESSION_SECRET explicitly.
const appSessionSecret = process.env.APP_SESSION_SECRET ?? "dev-only-session-secret-change-me";

export { appSessionSecret, supabaseServiceRoleKey, supabaseUrl };
