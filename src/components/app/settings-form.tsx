import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import { Save, RotateCcw } from "lucide-react";
import { api } from "@/lib/client/api";
import type { AppSettings, ModelOption } from "@/lib/schema/settings";
import { DEFAULT_MODEL, DEFAULT_REVIEW_PROMPT } from "@/lib/schema/settings";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Edit form for AppSettings. */
export function SettingsForm() {
  const { data, isLoading } = useQuery({ queryKey: ["settings"], queryFn: api.getSettings });

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Remount when the loaded settings change so the editable state re-initializes.
  return <SettingsFormFields key={`${data.model}:${data.reviewPrompt}`} settings={data} />;
}

/** The editable fields, seeded from the loaded settings. */
function SettingsFormFields({ settings }: { settings: AppSettings }) {
  const t = useTranslations("settingsForm");

  const [prompt, setPrompt] = useState(settings.reviewPrompt);
  const [model, setModel] = useState(settings.model);
  const {
    data: models,
    isLoading: modelsLoading,
    error: modelsError,
  } = useQuery({ queryKey: ["models"], queryFn: api.models, staleTime: Infinity, retry: false });

  // Fall back to the default when the saved model is no longer offered.
  const effectiveModel = resolveSelection(model, models);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await api.saveSettings({ reviewPrompt: prompt.trim(), model: effectiveModel });
      toast.success(t("savedTitle"));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      toast.error(t("saveFailedTitle"), { description: message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>{t("modelTitle")}</CardTitle>
          <CardDescription>{t("modelDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {modelsLoading ? (
            <div className="grid gap-2 sm:grid-cols-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : modelsError || !models?.length ? (
            <p className="text-sm text-muted-foreground">
              {modelsError ? t("modelsLoadFailed") : t("modelsEmpty")}
              {modelsError && (
                <span className="block font-mono text-xs text-subtle">
                  {modelsError instanceof Error ? modelsError.message : String(modelsError)}
                </span>
              )}
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-3">
              {models.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setModel(opt.value)}
                  className={cn(
                    "rounded-[var(--radius)] border px-4 py-3 text-left text-sm transition-colors duration-200",
                    effectiveModel === opt.value
                      ? "border-accent/60 bg-accent/10 text-foreground"
                      : "border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground",
                  )}
                >
                  <span className="block font-medium">{opt.displayName}</span>
                  <span className="block font-mono text-xs text-subtle">
                    {opt.resolvedModel ?? opt.value}
                  </span>
                </button>
              ))}
            </div>
          )}
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

/**
 * Pick the model to select/save. Keeps the saved value if it is still offered
 * (by alias or resolved id), otherwise falls back to DEFAULT_MODEL, then the
 * first listed model. With no list available the saved value is kept as-is.
 */
function resolveSelection(saved: string, models: ModelOption[] | undefined): string {
  if (!models?.length) return saved;
  const match = models.find((m) => m.value === saved || m.resolvedModel === saved);
  if (match) return match.value;
  return (models.find((m) => m.value === DEFAULT_MODEL) ?? models[0]).value;
}
