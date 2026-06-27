"use client";

import { useFormatter } from "next-intl";

/**
 * ISO8601 を現在ロケールの相対時間で表示するコンポーネント。
 * 表示言語は next-intl のロケール設定に追従する。
 */
export function RelativeTime({ iso }: { iso: string }) {
  const format = useFormatter();
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return <>{iso}</>;
  return <>{format.relativeTime(then)}</>;
}
