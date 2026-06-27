"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Search, GitFork, Lock, ChevronRight, FolderGit2 } from "lucide-react";
import { api } from "@/lib/client/api";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/app/states";

/** 選択したオーナーを保持する localStorage のキー。 */
const OWNER_STORAGE_KEY = "repo-list:selected-owner";

/** リポジトリ一覧（オーナー選択・検索・絞り込み付き）。 */
export function RepoList() {
  const t = useTranslations("repos");
  const [q, setQ] = useState("");
  const [owner, setOwner] = useState("");
  // localStorage からの復元が完了したかどうか。完了前は保存しない。
  const [restored, setRestored] = useState(false);

  // マウント後に前回選択したオーナーを localStorage から復元する。
  // （ハイドレーションのミスマッチを避けるため初期描画後に行う）
  useEffect(() => {
    const saved = window.localStorage.getItem(OWNER_STORAGE_KEY);
    if (saved) setOwner(saved);
    setRestored(true);
  }, []);

  // オーナーの選択が変わるたびに localStorage へ保存する。
  useEffect(() => {
    if (!restored) return;
    if (owner) {
      window.localStorage.setItem(OWNER_STORAGE_KEY, owner);
    } else {
      window.localStorage.removeItem(OWNER_STORAGE_KEY);
    }
  }, [owner, restored]);

  const ownersQuery = useQuery({
    queryKey: ["owners"],
    queryFn: api.owners,
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["repos", owner],
    queryFn: () => api.repos(owner || undefined),
  });

  const filtered = useMemo(() => {
    const repos = data?.repos ?? [];
    const needle = q.trim().toLowerCase();
    if (!needle) return repos;
    return repos.filter(
      (r) =>
        r.nameWithOwner.toLowerCase().includes(needle) ||
        (r.description ?? "").toLowerCase().includes(needle),
    );
  }, [data, q]);

  const owners = ownersQuery.data?.owners ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          disabled={ownersQuery.isLoading}
          className="sm:w-56"
          aria-label={t("selectOwner")}
        >
          <option value="">{t("all")}</option>
          {owners.map((o) => (
            <option key={o.login} value={o.login}>
              {o.login}
              {o.type === "user" ? t("mineSuffix") : ""}
            </option>
          ))}
        </Select>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyRepos hasQuery={q.trim().length > 0} />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-card">
          {filtered.map((repo) => (
            <li key={repo.nameWithOwner}>
              <Link
                href={`/repos/${repo.nameWithOwner}`}
                className="group flex items-center gap-4 px-4 py-3.5 transition-colors duration-200 hover:bg-card-hover"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <FolderGit2 className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{repo.nameWithOwner}</span>
                    {repo.isPrivate ? (
                      <Lock className="size-3 shrink-0 text-subtle" />
                    ) : (
                      <GitFork className="size-3 shrink-0 text-subtle" />
                    )}
                  </div>
                  {repo.description ? (
                    <p className="truncate text-xs text-muted-foreground">{repo.description}</p>
                  ) : null}
                </div>
                <ChevronRight className="size-4 shrink-0 text-subtle transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyRepos({ hasQuery }: { hasQuery: boolean }) {
  const t = useTranslations("repos");
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius)] border border-dashed border-border py-16 text-center">
      <FolderGit2 className="size-7 text-subtle" />
      <p className="text-sm text-muted-foreground">
        {hasQuery ? t("noMatch") : t("notFound")}
      </p>
    </div>
  );
}
