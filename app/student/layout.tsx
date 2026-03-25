import { signOut } from "@/actions/auth";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/student/dashboard", label: "대시보드" },
  { href: "/student/assignments", label: "내 숙제" },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      title="Student Console"
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
