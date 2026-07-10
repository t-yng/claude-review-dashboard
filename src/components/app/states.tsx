import { useTranslations } from "use-intl";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Error display (with a retry button). */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const t = useTranslations("common");
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius)] border border-critical/30 bg-critical-bg/40 px-6 py-12 text-center">
      <AlertCircle className="size-7 text-critical" />
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RefreshCw className="size-3.5" />
          {t("retry")}
        </Button>
      ) : null}
    </div>
  );
}

/** Generic empty state. */
export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius)] border border-dashed border-border py-16 text-center">
      <Icon className="size-7 text-subtle" />
      <p className="text-sm text-muted-foreground">{title}</p>
      {description ? <p className="max-w-md text-xs text-subtle">{description}</p> : null}
    </div>
  );
}
