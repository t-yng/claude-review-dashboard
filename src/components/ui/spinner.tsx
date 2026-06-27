import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** 回転スピナー。 */
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-4 animate-spin", className)} aria-hidden />;
}
