import { Link } from "@/components/ui/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";
import { GitPullRequest, Plus, Minus, Clock, ChevronRight } from "lucide-react";
import { api } from "@/lib/client/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ErrorState, EmptyState } from "@/components/app/states";
import { RelativeTime } from "@/lib/client/format";

/** List of open PRs for the given repository. */
export function PullList({ owner, repo }: { owner: string; repo: string }) {
  const t = useTranslations("pulls");
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["pulls", owner, repo],
    queryFn: () => api.pulls(owner, repo),
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;
  }

  const pulls = data?.pulls ?? [];
  if (pulls.length === 0) {
    return (
      <EmptyState
        icon={GitPullRequest}
        title={t("noOpenTitle")}
        description={t("noOpenDescription")}
      />
    );
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-card">
      {pulls.map((pr) => (
        <li key={pr.number}>
          <Link
            href={`/repos/${owner}/${repo}/pulls/${pr.number}`}
            className="group flex items-center gap-4 px-4 py-3.5 transition-colors duration-200 hover:bg-card-hover"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <GitPullRequest className="size-4" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">{pr.title}</span>
                {pr.isDraft ? <Badge>{t("draft")}</Badge> : null}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
                <span className="font-mono">#{pr.number}</span>
                {pr.author ? <span>@{pr.author.login}</span> : null}
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" />
                  <RelativeTime iso={pr.updatedAt} />
                </span>
                {typeof pr.additions === "number" ? (
                  <span className="inline-flex items-center gap-1 text-accent">
                    <Plus className="size-3" />
                    {pr.additions}
                  </span>
                ) : null}
                {typeof pr.deletions === "number" ? (
                  <span className="inline-flex items-center gap-1 text-critical">
                    <Minus className="size-3" />
                    {pr.deletions}
                  </span>
                ) : null}
                {pr.headRefName ? (
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.7rem] text-muted-foreground">
                    {pr.headRefName}
                  </span>
                ) : null}
              </div>
            </div>
            <ChevronRight className="size-4 shrink-0 text-subtle transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
