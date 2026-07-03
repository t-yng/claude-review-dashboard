import { AuthStatusIndicator } from "./auth-status";

/** Top header. Shows a breadcrumb-like title and the authentication status. */
export function Header({ title, subtitle }: { title?: string; subtitle?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur">
      <div className="min-w-0">
        <h1 className="truncate text-sm font-semibold">{title ?? "Claude Review Dashboard"}</h1>
        {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      <AuthStatusIndicator />
    </header>
  );
}
