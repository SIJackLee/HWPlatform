import { signOut } from "@/actions/auth";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/teacher/dashboard", label: "대시보드" },
  { href: "/teacher/assignments", label: "숙제 목록" },
];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      title="Teacher Console"
      navItems={navItems}
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
