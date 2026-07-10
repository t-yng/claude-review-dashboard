import { AuthStatusIndicator } from "./auth-status";

/**
 * Top header. The whole bar is the window's drag region (`app-drag`) so the
 * frameless window can be moved from anywhere in the title area; the right-hand
 * actions are opted back out (`app-no-drag`) so they stay clickable.
 *
 * `actions` overrides the default authentication indicator (e.g. the demo
 * screen shows a static user badge instead).
 */
export function Header({
  title,
  subtitle,
  actions,
}: {
  title?: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="app-drag sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur">
      <div className="min-w-0">
        <h1 className="truncate text-sm font-semibold">{title ?? "Claude Review Dashboard"}</h1>
        {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className="app-no-drag">{actions ?? <AuthStatusIndicator />}</div>
    </header>
  );
}
