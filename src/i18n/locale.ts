"use server";

import { cookies } from "next/headers";
import { type Locale, LOCALE_COOKIE } from "./config";

/** Server Action called when switching languages. Saves the locale to a cookie. */
export async function setLocale(locale: Locale): Promise<void> {
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
