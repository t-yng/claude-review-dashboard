import type { Severity } from "@/lib/schema/review";

/** Display metadata per severity (badge variant / label / accent color class). */
export const SEVERITY_META: Record<
  Severity,
  { label: string; badge: "critical" | "warning" | "info"; barClass: string }
> = {
  critical: { label: "Critical", badge: "critical", barClass: "bg-critical" },
  warning: { label: "Warning", badge: "warning", barClass: "bg-warning" },
  info: { label: "Info", badge: "info", barClass: "bg-info" },
};

export const SEVERITY_ORDER: Severity[] = ["critical", "warning", "info"];
