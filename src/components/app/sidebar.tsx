"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LayoutDashboard, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { LocaleSwitcher } from "./locale-switcher";

const NAV = [
  {
    href: "/",
    labelKey: "repositories",
    icon: LayoutDashboard,
    match: (p: string) => p === "/" || p.startsWith("/repos"),
  },
  {
    href: "/settings",
    labelKey: "settings",
    icon: Settings,
    match: (p: string) => p.startsWith("/settings"),
  },
] as const;

/** 左サイドバー（ナビゲーション）。 */
export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <Sparkles className="size-4" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">AI Review</span>
          <span className="text-xs text-subtle">Dashboard</span>
        </div>
      </div>

      <nav className="flex flex-col gap-1 px-3 py-2">
        {NAV.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-sm font-medium transition-colors duration-200",
                active
                  ? "bg-accent/10 text-accent"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-4 p-4">
        <LocaleSwitcher />
        <p className="text-xs leading-relaxed text-subtle">
          {t.rich("authReuse", {
            gh: (chunks) => <span className="text-muted-foreground">{chunks}</span>,
            claude: (chunks) => <span className="text-muted-foreground">{chunks}</span>,
          })}
        </p>
      </div>
    </aside>
  );
}
