"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Wand2,
  Save,
  RotateCcw,
  Play,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  SKILL_DOMAINS,
  SKILLS,
  pickLocale,
  type Skill,
  type SkillDomain,
} from "@/components/skills/skills-data";
import {
  DEFAULT_AI_CONFIG,
  DEFAULT_AI_PROMPT,
  loadAIConfig,
  loadSubmissions,
  mockAIVerdict,
  saveAIConfig,
  type AIReviewConfig,
} from "@/components/skills/skills-storage";

const MODEL_OPTIONS = [
  { value: "claude-opus-4-7", label: "Claude Opus 4.7" },
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { value: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
  { value: "gpt-5", label: "GPT-5" },
  { value: "gemini-2-pro", label: "Gemini 2 Pro" },
];

function clampNumber(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

export function AdminAIReviewConfig() {
  const t = useTranslations("admin.aiReview");
  const [config, setConfig] = useState<AIReviewConfig>(DEFAULT_AI_CONFIG);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    const c = loadAIConfig();
    setConfig({
      ...c,
      autoApproveThreshold: clampNumber(c.autoApproveThreshold, 0, 100),
      autoRejectThreshold: clampNumber(c.autoRejectThreshold, 0, 100),
    });
  }, []);

  const update = <K extends keyof AIReviewConfig>(
    key: K,
    value: AIReviewConfig[K],
  ) => setConfig((c) => ({ ...c, [key]: value }));

  const submissions = useMemo(() => loadSubmissions(), []);
  const samplePool = useMemo<Skill[]>(() => {
    const fromSubs = submissions.map((s) => s.skill);
    return [...fromSubs, ...SKILLS];
  }, [submissions]);

  const [testSkillId, setTestSkillId] = useState<string>(
    samplePool[0]?.id ?? "",
  );
  const testSkill = samplePool.find((s) => s.id === testSkillId);
  const testVerdict = useMemo(
    () => (testSkill ? mockAIVerdict(testSkill, config) : null),
    [testSkill, config],
  );

  const toggleEscalateDomain = (domain: SkillDomain) => {
    update(
      "escalateDomains",
      config.escalateDomains.includes(domain)
        ? config.escalateDomains.filter((d) => d !== domain)
        : [...config.escalateDomains, domain],
    );
  };

  const handleSave = () => {
    setSaved("saving");
    saveAIConfig(config);
    setTimeout(() => setSaved("saved"), 300);
    setTimeout(() => setSaved("idle"), 2200);
  };

  const handleReset = () => {
    setConfig(DEFAULT_AI_CONFIG);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Wand2 className="text-foreground size-5" strokeWidth={2} />
          <h1 className="text-foreground text-xl font-semibold tracking-tight">
            {t("pageTitle")}
          </h1>
        </div>
        <p className="text-muted-foreground text-sm">{t("pageDescription")}</p>
      </div>

      {/* Enable toggle */}
      <div className="border-border bg-card flex items-center justify-between rounded-xl border p-5 dark:border-white/[0.12]">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-foreground text-sm font-semibold">
              {t("enableTitle")}
            </h3>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                config.enabled
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {config.enabled ? t("statusOn") : t("statusOff")}
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            {t("enableDescription")}
          </p>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={(v) => update("enabled", v)}
          aria-label={t("enableTitle")}
        />
      </div>

      {/* Model + thresholds */}
      <div className="border-border bg-card grid grid-cols-1 gap-5 rounded-xl border p-5 sm:grid-cols-3 dark:border-white/[0.12]">
        <div className="space-y-1.5">
          <Label>{t("modelLabel")}</Label>
          <Select
            value={config.model}
            onValueChange={(v) => update("model", v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODEL_OPTIONS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t("autoApproveThresholdLabel")}</Label>
          <div className="border-input flex h-9 items-center gap-3 rounded-lg border bg-transparent px-3 dark:bg-input/30">
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={config.autoApproveThreshold}
              onChange={(e) =>
                update(
                  "autoApproveThreshold",
                  clampNumber(Number(e.target.value), 0, 100),
                )
              }
              className="flex-1 accent-zinc-900 dark:accent-zinc-100"
            />
            <span className="text-foreground w-12 text-right text-sm font-medium tabular-nums">
              {config.autoApproveThreshold}%
            </span>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>{t("autoRejectThresholdLabel")}</Label>
          <div className="border-input flex h-9 items-center gap-3 rounded-lg border bg-transparent px-3 dark:bg-input/30">
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={config.autoRejectThreshold}
              onChange={(e) =>
                update(
                  "autoRejectThreshold",
                  clampNumber(Number(e.target.value), 0, 100),
                )
              }
              className="flex-1 accent-zinc-900 dark:accent-zinc-100"
            />
            <span className="text-foreground w-12 text-right text-sm font-medium tabular-nums">
              {config.autoRejectThreshold}%
            </span>
          </div>
        </div>
      </div>

      {/* Prompt */}
      <div className="border-border bg-card flex flex-col gap-3 rounded-xl border p-5 dark:border-white/[0.12]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-foreground text-sm font-semibold">
              {t("promptTitle")}
            </h3>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {t("promptDescription")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => update("prompt", DEFAULT_AI_PROMPT)}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
          >
            <RotateCcw className="size-3" />
            {t("restoreDefault")}
          </button>
        </div>
        <Textarea
          value={config.prompt}
          onChange={(e) => update("prompt", e.target.value)}
          rows={10}
          className="font-[Menlo,monospace] text-xs leading-relaxed"
        />
      </div>

      {/* Rules */}
      <div className="border-border bg-card flex flex-col gap-4 rounded-xl border p-5 dark:border-white/[0.12]">
        <div>
          <h3 className="text-foreground text-sm font-semibold">
            {t("rulesTitle")}
          </h3>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {t("rulesDescription")}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="blocked-kw">{t("blockedKeywordsLabel")}</Label>
          <Input
            id="blocked-kw"
            value={config.blockedKeywordsCsv}
            onChange={(e) => update("blockedKeywordsCsv", e.target.value)}
            placeholder="crypto, gambling, scam"
          />
          <p className="text-muted-foreground text-xs">
            {t("blockedKeywordsHelp")}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>{t("escalateDomainsLabel")}</Label>
          <div className="flex flex-wrap gap-1.5">
            {SKILL_DOMAINS.map((d) => {
              const active = config.escalateDomains.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleEscalateDomain(d)}
                  className={cn(
                    "inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border px-2.5 text-xs font-medium",
                    active
                      ? "border-foreground text-foreground"
                      : "border-input text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                  )}
                >
                  {active ? (
                    <ShieldCheck className="size-3" />
                  ) : (
                    <AlertTriangle className="size-3 opacity-40" />
                  )}
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      </div>


      {/* Save bar */}
      <div className="sticky bottom-4 flex items-center justify-end gap-2 self-end">
        <Button variant="ghost" onClick={handleReset}>
          {t("resetAll")}
        </Button>
        <Button
          onClick={handleSave}
          className="bg-foreground text-background hover:bg-foreground/90 h-9 gap-1.5 shadow-lg"
          disabled={saved === "saving"}
        >
          <Save className="size-4" />
          {saved === "saved" ? t("saved") : t("saveConfig")}
        </Button>
      </div>
    </div>
  );
}
