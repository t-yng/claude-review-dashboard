"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { type Locale, locales, LOCALE_LABELS } from "@/i18n/config";
import { setLocale } from "@/i18n/locale";
import { Select } from "@/components/ui/select";

/** Language switcher. Saves the choice to a cookie and re-renders server components. */
export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("language");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleChange(next: Locale) {
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <label className="flex items-center gap-2 text-xs text-subtle">
      <Languages className="size-3.5 shrink-0" />
      <span className="sr-only">{t("label")}</span>
      <Select
        value={locale}
        onChange={(e) => handleChange(e.target.value as Locale)}
        disabled={pending}
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
