"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Save, RotateCcw } from "lucide-react";
import { api } from "@/lib/client/api";
import { DEFAULT_REVIEW_PROMPT, MODEL_OPTIONS } from "@/lib/schema/settings";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** AppSettings の編集フォーム。 */
export function SettingsForm() {
  const t = useTranslations("settingsForm");
  const { data, isLoading } = useQuery({ queryKey: ["settings"], queryFn: api.getSettings });

  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(MODEL_OPTIONS[0].value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setPrompt(data.reviewPrompt);
      setModel(data.model);
    }
  }, [data]);

  async function handleSave() {
    setSaving(true);
    try {
      await api.saveSettings({ reviewPrompt: prompt.trim(), model });
      toast.success(t("savedTitle"));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      toast.error(t("saveFailedTitle"), { description: message });
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>{t("modelTitle")}</CardTitle>
          <CardDescription>{t("modelDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-3">
            {MODEL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setModel(opt.value)}
                className={cn(
                  "rounded-[var(--radius)] border px-4 py-3 text-left text-sm transition-colors duration-200",
                  model === opt.value
                    ? "border-accent/60 bg-accent/10 text-foreground"
                    : "border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground",
                )}
              >
                <span className="block font-medium">{opt.label}</span>
                <span className="block font-mono text-xs text-subtle">{opt.value}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("promptTitle")}</CardTitle>
          <CardDescription>{t("promptDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="review-prompt" className="sr-only">
            {t("promptTitle")}
          </Label>
          <Textarea
            id="review-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[320px] font-mono text-[0.8125rem] leading-relaxed"
            placeholder={t("promptPlaceholder")}
          />
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPrompt(DEFAULT_REVIEW_PROMPT)}
              type="button"
            >
              <RotateCcw className="size-3.5" />
              {t("resetDefault")}
            </Button>
            <span className="text-xs text-subtle">{t("charCount", { count: prompt.length })}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || prompt.trim().length === 0}>
          <Save className="size-4" />
          {saving ? t("saving") : t("save")}
        </Button>
      </div>
    </div>
  );
}
