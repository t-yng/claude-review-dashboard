"use server";

import { cookies } from "next/headers";
import { type Locale, LOCALE_COOKIE } from "./config";

/** 言語切替時に呼ぶ Server Action。ロケールを Cookie に保存する。 */
export async function setLocale(locale: Locale): Promise<void> {
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
