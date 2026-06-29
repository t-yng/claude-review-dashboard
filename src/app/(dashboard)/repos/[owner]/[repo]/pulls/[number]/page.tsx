import { getTranslations } from "next-intl/server";
import { Header } from "@/components/app/header";
import { AuthBanner } from "@/components/app/auth-status";
import { BackLink } from "@/components/app/back-link";
import { ReviewWorkspace } from "@/components/app/review-workspace";

interface PageProps {
  params: Promise<{ owner: string; repo: string; number: string }>;
}

/** Review results screen. */
export default async function ReviewPage({ params }: PageProps) {
  const { owner, repo, number } = await params;
  const repoFullName = `${owner}/${repo}`;
  const t = await getTranslations("review");

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
