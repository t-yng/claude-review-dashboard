import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import {
  Sparkles,
  Send,
  ListChecks,
  CircleSlash,
  ExternalLink,
  ClipboardCheck,
} from "lucide-react";
import type { ReviewItem, ReviewSession } from "@/lib/schema/review";
import type { ReviewProgress } from "@/lib/review/engine";
import { api } from "@/lib/client/api";
import { streamReview } from "@/lib/client/review-stream";
import { parseDiffHunks, rangeCommentIssue } from "@/lib/github/diff";
import { SEVERITY_ORDER } from "@/lib/client/severity";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ErrorState, EmptyState } from "@/components/app/states";
import { ReviewCard } from "@/components/app/review-card";
import { ReviewProgressPanel } from "@/components/app/review-progress";

type RunState = "idle" | "running" | "done" | "error";

export function ReviewWorkspace({
  owner,
  repo,
  number,
}: {
  owner: string;
  repo: string;
  number: number;
}) {
  const t = useTranslations("review");
  const tCommon = useTranslations("common");
  const prQuery = useQuery({
    queryKey: ["pull", owner, repo, number],
    queryFn: () => api.pullDetail(owner, repo, number),
  });

  const [runState, setRunState] = useState<RunState>("idle");
  const [progress, setProgress] = useState<ReviewProgress[]>([]);
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [runError, setRunError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Compute postable hunks from the diff (client-side pre-validation).
  const hunkMap = useMemo(
    () => (prQuery.data ? parseDiffHunks(prQuery.data.diff) : null),
    [prQuery.data],
  );

  const invalidReason = (item: ReviewItem): string | undefined => {
    if (!hunkMap) return undefined;
    const issue = rangeCommentIssue(hunkMap, item.filePath, item.startLine, item.endLine);
    if (!issue) return undefined;
    switch (issue.code) {
      case "reversed":
        return t("invalidReasonReversed", { filePath: item.filePath });
      case "multi-hunk":
        return t("invalidReasonMultiHunk", { filePath: item.filePath, line: issue.line });
      case "not-in-diff":
      default:
        return t("invalidReason", { filePath: item.filePath, line: issue.line });
    }
  };

  const sortedItems = useMemo(
    () =>
      [...items].sort(
        (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
      ),
    [items],
  );

  const selectableIds = useMemo(
    () => sortedItems.filter((i) => i.status !== "submitted" && !invalidReason(i)).map((i) => i.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sortedItems, hunkMap],
  );

  async function handleRun() {
    setRunState("running");
    setProgress([]);
    setSession(null);
    setItems([]);
    setSelected(new Set());
    setRunError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    await streamReview(owner, repo, number, {
      signal: controller.signal,
      onProgress: (p) => setProgress((prev) => [...prev, p]),
      onSession: (s) => {
        setSession(s);
        setItems(s.items);
        // Select all postable items by default.
        const preselect = new Set(
          s.items.filter((i) => i.status !== "submitted" && !invalidReason(i)).map((i) => i.id),
        );
        setSelected(preselect);
        setRunState("done");
      },
      onError: (message) => {
        setRunError(message);
        setRunState("error");
        toast.error(t("toast.runFailedTitle"), { description: message });
      },
    }).catch((e: unknown) => {
      const message = e instanceof Error ? e.message : String(e);
      setRunError(message);
      setRunState("error");
    });
  }

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

  async function handleSubmit() {
    if (!prQuery.data || selected.size === 0) return;
    const chosen = items.filter((i) => selected.has(i.id));
    setSubmitting(true);
    try {
      const result = await api.submitComments(owner, repo, number, {
        headSha: session?.headSha ?? prQuery.data.headRefOid,
        items: chosen,
      });

      const submittedSet = new Set(result.submittedIds);
      setItems((prev) =>
        prev.map((i) => (submittedSet.has(i.id) ? { ...i, status: "submitted" } : i)),
      );
      setSelected(new Set());

      if (result.submittedIds.length > 0) {
        toast.success(t("toast.submittedTitle", { count: result.submittedIds.length }), {
          description: result.reviewUrl ? t("toast.submittedDescription") : undefined,
          action: result.reviewUrl
            ? {
                label: tCommon("open"),
                onClick: () => window.open(result.reviewUrl, "_blank"),
              }
            : undefined,
        });
      }
      if (result.skipped.length > 0) {
        toast.warning(t("toast.skippedTitle", { count: result.skipped.length }), {
          description: result.skipped[0]?.reason,
        });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      toast.error(t("toast.submitFailedTitle"), { description: message });
    } finally {
      setSubmitting(false);
    }
  }

  if (prQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (prQuery.error) {
    return (
      <ErrorState message={(prQuery.error as Error).message} onRetry={() => prQuery.refetch()} />
    );
  }

  const pr = prQuery.data!;
  const submittedCount = items.filter((i) => i.status === "submitted").length;

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
          <Button onClick={handleRun} disabled={runState === "running"} className="shrink-0">
            <Sparkles className="size-4" />
            {runState === "running"
              ? t("running")
              : items.length > 0
                ? t("rerun")
                : t("run")}
          </Button>
        </div>
      </div>

      {/* Progress */}
      {(runState === "running" || (runState === "error" && progress.length > 0)) && (
        <ReviewProgressPanel progress={progress} error={runError} state={runState} />
      )}

      {runState === "error" && progress.length === 0 && runError ? (
        <ErrorState message={runError} onRetry={handleRun} />
      ) : null}

      {/* Results */}
      {items.length > 0 ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-surface/95 px-4 py-3 backdrop-blur">
            <div className="flex items-center gap-3 text-sm">
              <button
                onClick={toggleAll}
                disabled={selectableIds.length === 0}
                className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
              >
                <ListChecks className="size-4" />
                {allSelected ? t("deselectAll") : t("selectAll")}
              </button>
              <span className="text-subtle">·</span>
              <span className="text-muted-foreground">
                {t("issueCount", { count: items.length })}
                {submittedCount > 0 ? t("submittedSuffix", { count: submittedCount }) : ""}
              </span>
              <Badge variant="accent">{t("selectedCount", { count: selected.size })}</Badge>
            </div>
            <Button onClick={handleSubmit} disabled={selected.size === 0 || submitting} size="sm">
              <Send className="size-3.5" />
              {submitting ? t("submitting") : t("submit", { count: selected.size })}
            </Button>
          </div>

          <div className="space-y-3">
            {sortedItems.map((item) => (
              <ReviewCard
                key={item.id}
                item={item}
                checked={selected.has(item.id)}
                onCheckedChange={(v) => toggle(item.id, v)}
                invalidReason={invalidReason(item)}
              />
            ))}
          </div>
        </>
      ) : runState === "done" ? (
        <EmptyState
          icon={ClipboardCheck}
          title={t("noIssuesTitle")}
          description={t("noIssuesDescription")}
        />
      ) : runState === "idle" ? (
        <EmptyState
          icon={CircleSlash}
          title={t("idleTitle")}
          description={t("idleDescription")}
        />
      ) : null}

      {session?.model ? (
        <p className="flex items-center gap-1 text-xs text-subtle">
          <ExternalLink className="size-3" />
          model: <span className="font-mono">{session.model}</span>
        </p>
      ) : null}
    </div>
  );
}
