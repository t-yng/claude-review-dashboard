import { useMemo, useState } from "react";
import { useTranslations } from "use-intl";
import { Sparkles, Send, ListChecks, ExternalLink } from "lucide-react";
import { SEVERITY_ORDER } from "@/lib/client/severity";
import { demoItems, demoPull, demoSession } from "@/lib/demo/mock-review";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReviewCard } from "@/components/app/review-card";

/**
 * A self-contained, static rendering of the review-results screen for the
 * portfolio `/demo` route. It mirrors the "done" state of {@link ReviewWorkspace}
 * but uses the mock data in `@/lib/demo/mock-review` and holds only local
 * selection state — no data fetching, streaming, or authentication required.
 */
export function DemoReviewWorkspace() {
  const t = useTranslations("review");
  const pr = demoPull;

  const sortedItems = useMemo(
    () =>
      [...demoItems].sort(
        (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
      ),
    [],
  );

  const selectableIds = useMemo(
    () => sortedItems.filter((i) => i.status !== "submitted").map((i) => i.id),
    [sortedItems],
  );

  // Pre-select all postable findings by default, matching the real workspace.
  const [selected, setSelected] = useState<Set<string>>(() => new Set(selectableIds));

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(selectableIds));
  }

  const submittedCount = demoItems.filter((i) => i.status === "submitted").length;

  return (
    <div className="space-y-5">
      {/* PR summary + run button */}
      <div className="rounded-[var(--radius)] border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-subtle">
              <span className="font-mono">#{pr.number}</span>
              {pr.author ? <span>@{pr.author.login}</span> : null}
              {pr.headRefName ? (
                <span className="font-mono">
                  {pr.baseRefName} ← {pr.headRefName}
                </span>
              ) : null}
            </div>
            <h2 className="text-lg font-semibold leading-snug">{pr.title}</h2>
            {pr.body ? (
              <p className="line-clamp-2 max-w-2xl text-sm text-muted-foreground">{pr.body}</p>
            ) : null}
          </div>
          <Button className="shrink-0">
            <Sparkles className="size-4" />
            {t("rerun")}
          </Button>
        </div>
      </div>

      {/* Results */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-surface/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3 text-sm">
          <button
            onClick={toggleAll}
            className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ListChecks className="size-4" />
            {allSelected ? t("deselectAll") : t("selectAll")}
          </button>
          <span className="text-subtle">·</span>
          <span className="text-muted-foreground">
            {t("issueCount", { count: demoItems.length })}
            {submittedCount > 0 ? t("submittedSuffix", { count: submittedCount }) : ""}
          </span>
          <Badge variant="accent">{t("selectedCount", { count: selected.size })}</Badge>
        </div>
        <Button disabled={selected.size === 0} size="sm">
          <Send className="size-3.5" />
          {t("submit", { count: selected.size })}
        </Button>
      </div>

      <div className="space-y-3">
        {sortedItems.map((item) => (
          <ReviewCard
            key={item.id}
            item={item}
            checked={selected.has(item.id)}
            onCheckedChange={(v) => toggle(item.id, v)}
          />
        ))}
      </div>

      <p className="flex items-center gap-1 text-xs text-subtle">
        <ExternalLink className="size-3" />
        model: <span className="font-mono">{demoSession.model}</span>
      </p>
    </div>
  );
}
