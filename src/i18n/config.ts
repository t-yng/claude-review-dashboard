/** Supported locale definitions. Used only for the UI display language (the review output language is controlled by the prompt). */
export const locales = ["ja", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ja";

/** Name of the cookie that holds the locale. */
export const LOCALE_COOKIE = "locale";

/** Display name for each locale (for the language switcher UI). */
export const LOCALE_LABELS: Record<Locale, string> = {
  ja: "日本語",
  en: "English",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.includes(value as Locale);
}

/**
 * Picks the best matching locale from an `Accept-Language` header value.
 * Returns `undefined` if no supported locale matches.
 */
export function matchLocale(acceptLanguage: string | null | undefined): Locale | undefined {
  if (!acceptLanguage) return undefined;

  // Parse entries like "en-US,en;q=0.9,ja;q=0.8" into [{ tag, q }] sorted by quality.
  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number.parseFloat(qParam.trim().slice(2)) : 1;
      return { tag: tag.trim().toLowerCase(), q: Number.isNaN(q) ? 0 : q };
    })
    .filter((entry) => entry.tag !== "")
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    // Match on the primary subtag (e.g. "en-US" -> "en").
    const primary = tag.split("-")[0];
    const matched = locales.find((l) => l === primary);
    if (matched) return matched;
  }

  return undefined;
}
