"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";

interface AppShellProps {
  title: string;
  navItems: Array<{ href: string; label: string }>;
  subNavItems?: Array<{ parentHref: string; href: string; label: string }>;
  actions?: ReactNode;
  children: ReactNode;
}

export function AppShell({ title, navItems, subNavItems = [], actions, children }: AppShellProps) {
  const pathname = usePathname();
  const homeHref = navItems[0]?.href ?? "/";
  const navLinkClass =
    "inline-flex h-8 items-center justify-start whitespace-nowrap rounded-lg px-2.5 text-sm font-medium hover:bg-muted hover:text-foreground";
  const mobileNavLinkClass =
    "inline-flex h-11 flex-1 shrink-0 items-center justify-center whitespace-nowrap rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted";

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Link href={homeHref} className="text-lg font-semibold hover:underline" aria-label="메인으로 이동">
              {title}
            </Link>
          </div>
          <div className="flex items-center gap-2">{actions}</div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-4 py-6 pb-24 md:grid-cols-[220px_1fr] md:pb-6">
        <aside className="hidden rounded-lg border bg-background p-3 md:block">
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => {
              const childItems = subNavItems.filter((sub) => sub.parentHref === item.href);
              const showChildren = childItems.length > 0 && pathname.startsWith(item.href);
              return (
                <div key={item.href} className="space-y-1">
                  <Link href={item.href} className={navLinkClass}>
                    {item.label}
                  </Link>
                  {showChildren ? (
                    <div className="ml-2 flex flex-col gap-1 border-l pl-2">
                      {childItems.map((sub) => (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className="inline-flex h-7 items-center whitespace-nowrap rounded-md px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>
        </aside>

        <main className="rounded-lg border bg-background p-6">{children}</main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] backdrop-blur md:hidden"
      >
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={mobileNavLinkClass}>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
