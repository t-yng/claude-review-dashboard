import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale, LOCALE_COOKIE, matchLocale } from "./config";

/**
 * next-intl request config. Does not use URL routing; resolves the locale
 * by reading it from the cookie. When the cookie is absent (e.g. first visit),
 * it falls back to the browser's `Accept-Language` header, then the default.
 */
export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get(LOCALE_COOKIE)?.value;

  let locale: string;
  if (isLocale(cookieLocale)) {
    locale = cookieLocale;
  } else {
    const headerStore = await headers();
    locale = matchLocale(headerStore.get("accept-language")) ?? defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
