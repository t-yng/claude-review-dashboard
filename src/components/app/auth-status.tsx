"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { api } from "@/lib/client/api";
import { Skeleton } from "@/components/ui/skeleton";

/** ヘッダー右側の gh 認証状態インジケータ。 */
export function AuthStatusIndicator() {
  const t = useTranslations("auth");
  const { data, isLoading } = useQuery({
    queryKey: ["auth-status"],
    queryFn: api.authStatus,
  });

  if (isLoading) {
    return <Skeleton className="h-7 w-32" />;
  }

  if (data?.loggedIn) {
    return (
      <div className="flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs text-accent">
        <CheckCircle2 className="size-3.5" />
        <span className="font-medium">{data.username ?? "logged in"}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-full border border-warning/30 bg-warning-bg px-3 py-1 text-xs text-warning">
      <AlertTriangle className="size-3.5" />
      <span className="font-medium">{t("loggedOut")}</span>
    </div>
  );
}

/**
 * 未ログイン時に表示する認証バナー。
 * アプリからは gh auth login を実行せず、案内のみ行う。
 */
export function AuthBanner() {
  const t = useTranslations("auth");
  const { data } = useQuery({ queryKey: ["auth-status"], queryFn: api.authStatus });

  if (!data || data.loggedIn) return null;

  return (
    <div className="flex items-start gap-3 rounded-[var(--radius)] border border-warning/30 bg-warning-bg px-4 py-3">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
      <div className="space-y-1 text-sm">
        <p className="font-medium text-warning">{t("bannerTitle")}</p>
        <p className="text-muted-foreground">
          {t.rich("bannerBody", {
            code: (chunks) => (
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                {chunks}
              </code>
            ),
          })}
        </p>
        {data.error ? <p className="font-mono text-xs text-subtle">{data.error}</p> : null}
      </div>
    </div>
  );
}
