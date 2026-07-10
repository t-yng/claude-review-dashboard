import { useParams } from "@tanstack/react-router";
import { useTranslations } from "use-intl";
import { Header } from "@/components/app/header";
import { AuthBanner } from "@/components/app/auth-status";
import { PullList } from "@/components/app/pull-list";
import { BackLink } from "@/components/app/back-link";

/** PR list screen. */
export function RepoPullsPage() {
  const { owner, repo } = useParams({ strict: false }) as { owner: string; repo: string };
  const repoFullName = `${owner}/${repo}`;
  const t = useTranslations("pulls");

  return (
    <>
      <Header title={repoFullName} subtitle={t("title")} />
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-5xl space-y-5">
          <BackLink href="/" label={t("backToRepos")} />
          <AuthBanner />
          <PullList owner={owner} repo={repo} />
        </div>
      </main>
    </>
  );
}
