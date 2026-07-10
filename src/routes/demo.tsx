import { useTranslations } from "use-intl";
import { CheckCircle2 } from "lucide-react";
import { BackLink } from "@/components/app/back-link";
import { Header } from "@/components/app/header";
import { DemoReviewWorkspace } from "@/components/app/demo-review-workspace";
import { DEMO_OWNER, DEMO_PR_NUMBER, DEMO_REPO, demoUser } from "@/lib/demo/mock-review";

/**
 * Portfolio demo of the review-results screen. Renders the full workspace with
 * static mock data (see `@/lib/demo/mock-review`) so it can be shown without any
 * GitHub / Claude authentication.
 */
export function DemoPage() {
  const t = useTranslations("review");
  const repoFullName = `${DEMO_OWNER}/${DEMO_REPO}`;

  return (
    <>
      <Header
        title={`${repoFullName} #${DEMO_PR_NUMBER}`}
        subtitle={t("headerSubtitle")}
        actions={
          <div className="flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs text-accent">
            <CheckCircle2 className="size-3.5" />
            <span className="font-medium">{demoUser}</span>
          </div>
        }
      />
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-4xl space-y-5">
          <BackLink href={`/repos/${DEMO_OWNER}/${DEMO_REPO}`} label={t("backToPulls")} />
          <DemoReviewWorkspace />
        </div>
      </main>
    </>
  );
}
