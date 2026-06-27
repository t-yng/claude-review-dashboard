"use client";

import { useTranslations } from "next-intl";
import { FileCode2, CheckCircle2, AlertTriangle } from "lucide-react";
import type { ReviewItem } from "@/lib/schema/review";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CodeBlock } from "@/components/code-block";
import { SEVERITY_META } from "@/lib/client/severity";
import { cn } from "@/lib/utils";

interface ReviewCardProps {
  item: ReviewItem;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** diff 範囲外などで投稿不可な場合の理由。 */
  invalidReason?: string;
}

/** 1 件のレビュー指摘カード。 */
export function ReviewCard({ item, checked, onCheckedChange, invalidReason }: ReviewCardProps) {
  const t = useTranslations("reviewCard");
  const meta = SEVERITY_META[item.severity];
  const submitted = item.status === "submitted";
  const lineLabel =
    item.startLine === item.endLine ? `L${item.startLine}` : `L${item.startLine}–${item.endLine}`;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--radius)] border bg-card transition-colors duration-200",
        checked ? "border-accent/50" : "border-border hover:border-border-strong",
        submitted && "opacity-70",
      )}
    >
      {/* 重要度カラーバー */}
      <div className={cn("absolute inset-y-0 left-0 w-1", meta.barClass)} />

      <div className="flex gap-3 p-4 pl-5">
        <div className="pt-0.5">
          <Checkbox
            checked={checked}
            onCheckedChange={(v) => onCheckedChange(v === true)}
            disabled={submitted || Boolean(invalidReason)}
            aria-label={t("selectAria", { title: item.title })}
          />
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={meta.badge}>{meta.label}</Badge>
            <Badge variant="default">{item.category}</Badge>
            {submitted ? (
              <Badge variant="accent">
                <CheckCircle2 className="size-3" />
                {t("applied")}
              </Badge>
            ) : null}
            <span className="inline-flex items-center gap-1.5 text-xs text-subtle">
              <FileCode2 className="size-3.5" />
              <span className="font-mono">{item.filePath}</span>
              <span className="font-mono text-muted-foreground">{lineLabel}</span>
            </span>
          </div>

          <h3 className="text-sm font-semibold leading-snug">{item.title}</h3>

          {item.codeSnippet ? <CodeBlock code={item.codeSnippet} filePath={item.filePath} /> : null}

          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {item.body}
          </p>

          {invalidReason ? (
            <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning-bg px-3 py-2 text-xs text-warning">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span>{invalidReason}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
