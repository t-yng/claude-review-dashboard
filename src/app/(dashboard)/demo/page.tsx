import { getTranslations } from "next-intl/server";
import { CheckCircle2 } from "lucide-react";
import { BackLink } from "@/components/app/back-link";
import { DemoReviewWorkspace } from "@/components/app/demo-review-workspace";
import {
  DEMO_OWNER,
  DEMO_PR_NUMBER,
  DEMO_REPO,
  demoUser,
} from "@/lib/demo/mock-review";

/**
 * Portfolio demo of the review-results screen.
 *
 * Renders the full review workspace with static mock data (see
 * `@/lib/demo/mock-review`) so it can be shown or screenshotted without any
 * GitHub / Claude authentication. Uses a self-contained header showing a
 * "signed in" state instead of the live auth indicator.
 */
export default async function DemoPage() {
  const t = await getTranslations("review");
  const repoFullName = `${DEMO_OWNER}/${DEMO_REPO}`;

  return (
    <>
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold">
            {repoFullName} #{DEMO_PR_NUMBER}
          </h1>
          <p className="truncate text-xs text-muted-foreground">{t("headerSubtitle")}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs text-accent">
          <CheckCircle2 className="size-3.5" />
          <span className="font-medium">{demoUser}</span>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-4xl space-y-5">
          <BackLink href={`/repos/${DEMO_OWNER}/${DEMO_REPO}`} label={t("backToPulls")} />
          <DemoReviewWorkspace />
        </div>
      </main>
    </>
  );
}
