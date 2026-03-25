export type UserRole = "teacher" | "student";

export interface Profile {
  id: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SessionUser {
  id: string;
}
