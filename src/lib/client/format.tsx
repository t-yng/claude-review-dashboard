"use client";

import { useFormatter, useNow } from "next-intl";

/**
 * Component that displays an ISO8601 timestamp as relative time in the current locale.
 * The display language follows next-intl's locale setting.
 */
export function RelativeTime({ iso }: { iso: string }) {
  const format = useFormatter();
  const now = useNow();
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return <>{iso}</>;
  return <>{format.relativeTime(then, now)}</>;
}
