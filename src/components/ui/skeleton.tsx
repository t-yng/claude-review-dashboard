import { cn } from "@/lib/utils";

/** ローディング用スケルトン（content-jumping 防止）。 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}
