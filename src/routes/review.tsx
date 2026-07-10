import { useParams } from "@tanstack/react-router";
import { useTranslations } from "use-intl";
import { Header } from "@/components/app/header";
import { AuthBanner } from "@/components/app/auth-status";
import { BackLink } from "@/components/app/back-link";
import { ReviewWorkspace } from "@/components/app/review-workspace";

/** Review results screen. */
export function ReviewPage() {
  const { owner, repo, number } = useParams({ strict: false }) as {
    owner: string;
    repo: string;
    number: string;
  };
  const repoFullName = `${owner}/${repo}`;
  const t = useTranslations("review");

  return (
    <>
      <Header title={`${repoFullName} #${number}`} subtitle={t("headerSubtitle")} />
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-4xl space-y-5">
          <BackLink href={`/repos/${owner}/${repo}`} label={t("backToPulls")} />
          <AuthBanner />
          <ReviewWorkspace owner={owner} repo={repo} number={Number(number)} />
        </div>
      </main>
    </>
  );
}
