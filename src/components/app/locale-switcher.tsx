import { useLocale, useTranslations } from "use-intl";
import { Languages } from "lucide-react";
import { type Locale, locales, LOCALE_LABELS } from "@/i18n/config";
import { useLocaleControl } from "@/i18n/provider";
import { Select } from "@/components/ui/select";

/** Language switcher. Persists the choice via IPC and swaps the message catalog. */
export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("language");
  const { setLocale } = useLocaleControl();

  return (
    <label className="flex items-center gap-2 text-xs text-subtle">
      <Languages className="size-3.5 shrink-0" />
      <span className="sr-only">{t("label")}</span>
      <Select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        aria-label={t("label")}
        className="h-8 text-xs"
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {LOCALE_LABELS[l]}
          </option>
        ))}
      </Select>
    </label>
  );
}
