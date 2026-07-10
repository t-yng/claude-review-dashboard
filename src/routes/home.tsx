import { useTranslations } from "use-intl";
import { Header } from "@/components/app/header";
import { AuthBanner } from "@/components/app/auth-status";
import { RepoList } from "@/components/app/repo-list";

/** Dashboard / repository list screen. */
export function HomePage() {
  const t = useTranslations("home");
  return (
    <>
      <Header title={t("title")} subtitle={t("subtitle")} />
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-5xl space-y-5">
          <AuthBanner />
          <RepoList />
        </div>
      </main>
    </>
  );
}
