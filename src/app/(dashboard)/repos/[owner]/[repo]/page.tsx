import { getTranslations } from "next-intl/server";
import { Header } from "@/components/app/header";
import { AuthBanner } from "@/components/app/auth-status";
import { PullList } from "@/components/app/pull-list";
import { BackLink } from "@/components/app/back-link";

interface PageProps {
  params: Promise<{ owner: string; repo: string }>;
}

/** PR 一覧画面。 */
export default async function RepoPullsPage({ params }: PageProps) {
  const { owner, repo } = await params;
  const repoFullName = `${owner}/${repo}`;
  const t = await getTranslations("pulls");

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
