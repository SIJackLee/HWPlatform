import { signOut } from "@/actions/auth";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { getAuthState } from "@/lib/auth/session";
import { getTeacherClasses } from "@/lib/teacher/class-queries";

const navItems = [
  { href: "/teacher/dashboard", label: "대시보드" },
  { href: "/teacher/classes", label: "반 관리" },
  { href: "/teacher/assignments", label: "숙제 목록" },
];

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getAuthState();
  const classes =
    user && profile?.role === "teacher" ? await getTeacherClasses(user.id) : [];
  const subNavItems = classes.map((row) => ({
    parentHref: "/teacher/classes",
    href: `/teacher/classes/${row.id}`,
    label: row.name,
  }));

  return (
    <AppShell
      title="Teacher Console"
      navItems={navItems}
      subNavItems={subNavItems}
      actions={
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm">
            로그아웃
          </Button>
        </form>
      }
    >
      {children}
    </AppShell>
  );
}
