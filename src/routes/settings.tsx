import { useTranslations } from "use-intl";
import { Header } from "@/components/app/header";
import { SettingsForm } from "@/components/app/settings-form";

/** Settings / prompt editing screen. */
export function SettingsPage() {
  const t = useTranslations("settingsPage");
  return (
    <>
      <Header title={t("title")} subtitle={t("subtitle")} />
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-3xl">
          <SettingsForm />
        </div>
      </main>
    </>
  );
}
