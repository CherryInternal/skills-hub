"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Download,
  Check,
  Copy,
  ExternalLink,
  GitBranch,
  Share2,
  ChevronRight,
  Calendar,
  Shield,
  Star,
  ScrollText,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { pickLocale, type Skill } from "./skills-data";
import { useLocale, useTranslations } from "next-intl";

interface SkillDetailSheetProps {
  skill: Skill | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── helpers ──────────────────────────────────────────────────

function relativeTime(iso: string, locale: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const zh = locale === "zh";
  if (days <= 0) return zh ? "今天" : "today";
  if (days === 1) return zh ? "昨天" : "yesterday";
  if (days < 30) return zh ? `${days} 天前` : `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return zh ? `${months} 个月前` : `${months}mo ago`;
  const years = Math.floor(months / 12);
  return zh ? `${years} 年前` : `${years}y ago`;
}

// ─── download panel ──────────────────────────────────────────

function DownloadPanel({ skill }: { skill: Skill }) {
  const t = useTranslations("detail");
  const locale = useLocale();
  const [copied, setCopied] = useState(false);

  if (!skill.hasPackage) {
    return (
      <div className="border-border bg-card text-muted-foreground rounded-xl border p-4 text-sm dark:border-white/[0.12]">
        {t("noPackage")}
      </div>
    );
  }

  const downloadUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/skills/${skill.id}/download`
      : `/api/skills/${skill.id}/download`;

  const prompt = t("agentPromptTemplate", {
    name: pickLocale(skill.name, locale),
    url: downloadUrl,
  });

  const copyPrompt = () => {
    void navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4 dark:border-white/[0.12]">
      <a
        href={downloadUrl}
        className="bg-foreground text-background hover:bg-foreground/90 inline-flex h-10 items-center justify-center gap-2 rounded-md text-sm font-medium"
      >
        <Download className="size-4" />
        {t("download")}
      </a>
      <div className="bg-muted/40 border-border relative rounded-md border p-3 dark:border-white/[0.10]">
        <pre className="text-foreground/90 max-h-36 overflow-y-auto pr-7 font-[Menlo,monospace] text-[11px] leading-relaxed whitespace-pre-wrap">
          {prompt}
        </pre>
        <button
          type="button"
          onClick={copyPrompt}
          className="hover:bg-accent text-muted-foreground hover:text-foreground absolute top-2 right-2 cursor-pointer rounded p-1"
          title={copied ? t("agentPromptCopied") : t("copyAgentPrompt")}
        >
          {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ─── main sheet ──────────────────────────────────────────────

export function SkillDetailSheet({
  skill,
  open,
  onOpenChange,
}: SkillDetailSheetProps) {
  const locale = useLocale();
  const t = useTranslations("detail");
  const [activeSkill, setActiveSkill] = useState<Skill | null>(skill);

  if (skill && skill.id !== activeSkill?.id) {
    setActiveSkill(skill);
  }

  const current = activeSkill ?? skill;
  if (!current) return null;

  const Icon = Sparkles;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-hidden p-0 sm:max-w-2xl lg:max-w-3xl"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <SheetHeader className="border-border/60 bg-background relative space-y-3 border-b px-6 pt-6 pb-5 dark:border-white/[0.08]">
            <div className="text-muted-foreground/70 flex items-center gap-1 text-[11px]">
              <Link href="/" className="hover:text-foreground">
                {t("breadcrumbRoot")}
              </Link>
              <ChevronRight className="size-3" />
              <span>{current.domain}</span>
              <ChevronRight className="size-3" />
              <span>{pickLocale(current.name, locale)}</span>
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="bg-background text-foreground ring-foreground/10 flex size-14 shrink-0 items-center justify-center rounded-xl ring-1 dark:ring-white/[0.12]">
                  <Icon className="size-6" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="text-foreground flex items-center gap-1.5 text-xl font-bold tracking-tight">
                    <span className="truncate">{pickLocale(current.name, locale)}</span>
                  </SheetTitle>
                  <p className="text-foreground/80 mt-1 line-clamp-2 max-w-prose text-sm leading-relaxed">
                    {pickLocale(current.description, locale)}
                  </p>
                  <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                    <span className="text-foreground/70">{current.author}</span>
                    <span className="text-muted-foreground/30">·</span>
                    <span className="inline-flex items-center gap-1 font-[Menlo,monospace]">
                      v{current.version}
                    </span>
                    <span className="text-muted-foreground/30">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="size-3" />
                      {t("updated", { time: relativeTime(current.releaseDate, locale) })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {current.githubRepoUrl && (
                  <a
                    href={current.githubRepoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground inline-flex size-8 items-center justify-center rounded-md"
                    aria-label="GitHub repo"
                    title="GitHub repo"
                  >
                    <GitBranch className="size-4" />
                  </a>
                )}
                <button
                  type="button"
                  className="bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground inline-flex size-8 cursor-pointer items-center justify-center rounded-md"
                  aria-label={t("shareLabel")}
                  title={t("shareLabel")}
                  onClick={() => {
                    void navigator.clipboard.writeText(
                      `${window.location.origin}/?detail=${current.id}`,
                    );
                    toast.success(t("shareCopied"));
                  }}
                >
                  <Share2 className="size-4" />
                </button>
              </div>
            </div>

            {/* Capability strip */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span
                title={t("curatedBadge")}
                className="text-muted-foreground ring-foreground/10 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset dark:ring-white/[0.10]"
              >
                <Star className="size-2.5" strokeWidth={2} />
                {t("curatedBadge")}
              </span>
              <span
                title={t("verifiedBadge")}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 ring-1 ring-emerald-500/30 ring-inset dark:text-emerald-400"
              >
                <Shield className="size-2.5" strokeWidth={2} />
                {t("verifiedBadge")}
              </span>
            </div>
          </SheetHeader>

          {/* Body: single column */}
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="mx-auto flex max-w-3xl flex-col gap-5">
              {/* 数据来源 */}
              <section className="space-y-1.5">
                <h3 className="text-foreground inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
                  <ExternalLink className="size-3.5" />
                  {t("dataSource")}
                </h3>
                <div className="border-border bg-card rounded-lg border p-3 dark:border-white/[0.12]">
                  <p className="text-foreground/80 text-xs leading-relaxed">
                    CherryIN {t("curatedBy")}<span className="text-foreground font-medium">{current.author}</span> {t("provided")}
                  </p>
                  {current.sourceUrl && (
                    <a
                      href={current.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground mt-2 inline-flex max-w-full items-center gap-1.5 truncate text-[11px] underline-offset-2 hover:underline"
                    >
                      <ExternalLink className="size-3 shrink-0" />
                      <span className="truncate font-[Menlo,monospace]">
                        {current.sourceUrl}
                      </span>
                    </a>
                  )}
                </div>
              </section>

              {/* About */}
              <section className="space-y-1.5">
                <h3 className="text-foreground inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
                  <ScrollText className="size-3.5" />
                  {t("about")}
                </h3>
                <p className="text-foreground text-sm leading-relaxed">
                  {pickLocale(current.longDescription, locale)}
                </p>
              </section>

              {/* Install */}
              <section className="space-y-2">
                <h3 className="text-foreground inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
                  <Download className="size-3.5" />
                  {t("installHeading")}
                </h3>
                <DownloadPanel skill={current} />
              </section>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
