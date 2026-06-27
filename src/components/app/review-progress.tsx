"use client";

import { useTranslations } from "next-intl";
import { Check, Loader2, AlertCircle } from "lucide-react";
import type { ReviewProgress } from "@/lib/review/engine";
import { cn } from "@/lib/utils";

const ORDER: ReviewProgress["phase"][] = ["checkout", "generating", "done"];

/** レビュー実行中の進捗パネル。 */
export function ReviewProgressPanel({
  progress,
  error,
  state,
}: {
  progress: ReviewProgress[];
  error: string | null;
  state: "idle" | "running" | "done" | "error";
}) {
  const t = useTranslations("progress");
  const latest = progress[progress.length - 1];
  const currentPhaseIndex = latest ? ORDER.indexOf(latest.phase) : -1;

  return (
    <div className="rounded-[var(--radius)] border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        {state === "error" ? (
          <AlertCircle className="size-4 text-critical" />
        ) : (
          <Loader2 className="size-4 animate-spin text-accent" />
        )}
        <span className="text-sm font-medium">
          {state === "error" ? t("aborted") : t("running")}
        </span>
      </div>

      <ol className="space-y-2.5">
        {ORDER.filter((p) => p !== "done").map((phase, idx) => {
          const reached = currentPhaseIndex >= idx || state === "done";
          const active = currentPhaseIndex === idx && state === "running";
          const done = currentPhaseIndex > idx || state === "done";
          return (
            <li key={phase} className="flex items-center gap-3 text-sm">
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border text-xs",
                  done
                    ? "border-accent bg-accent text-accent-foreground"
                    : active
                      ? "border-accent text-accent"
                      : "border-border text-subtle",
                )}
              >
                {done ? (
                  <Check className="size-3" strokeWidth={3} />
                ) : active ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  idx + 1
                )}
              </span>
              <span className={cn(reached ? "text-foreground" : "text-subtle")}>
                {t(`phase.${phase}`)}
              </span>
            </li>
          );
        })}
      </ol>

      {latest ? (
        <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
          {latest.message}
        </p>
      ) : null}
      {error ? <p className="mt-2 text-xs text-critical">{error}</p> : null}
    </div>
  );
}
