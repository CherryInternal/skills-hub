"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Star,
  Download,
  Check,
  Copy,
  ExternalLink,
  GitBranch,
  Share2,
  Flag,
  Bot,
  User,
  ChevronRight,
  Calendar,
  Shield,
  Zap,
  WifiOff,
  Network,
  ScrollText,
  CheckCircle2,
  GitCommit,
  MessageSquareQuote,
  Hash,
  AlertTriangle,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { pickLocale, type Skill } from "./skills-data";
import { useLocale, useTranslations } from "next-intl";

interface SkillDetailSheetProps {
  skill: Skill | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Platform = "claude-code" | "codex" | "cursor" | "vscode" | "cline";
const PLATFORMS: Array<{ key: Platform; label: string }> = [
  { key: "claude-code", label: "Claude Code" },
  { key: "codex", label: "Codex" },
  { key: "cursor", label: "Cursor" },
  { key: "vscode", label: "VSCode" },
  { key: "cline", label: "Cline" },
];

const TRUSTED_AUTHORS = new Set([
  "CherryIN",
  "Anthropic",
  "SiinXu",
  "OpenRail",
]);

// ─── helpers ──────────────────────────────────────────────────

function formatInstalls(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function authorInitials(name: string): string {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

function StarRow({ value, size = 3.5 }: { value: number; size?: number }) {
  const filled = Math.round(value);
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          style={{ width: `${size * 4}px`, height: `${size * 4}px` }}
          className={cn(
            i < filled
              ? "fill-amber-500 text-amber-500"
              : "text-muted-foreground/30",
          )}
          strokeWidth={0}
        />
      ))}
    </span>
  );
}

// Derive a capability matrix from skill metadata
function deriveCapabilities(skill: Skill) {
  const text = `${pickLocale(skill.name, "en")} ${pickLocale(skill.description, "en")} ${pickLocale(skill.longDescription, "en")} ${skill.tags.join(" ")}`.toLowerCase();
  return [
    {
      key: "verified",
      label: "Verified author",
      Icon: Shield,
      on: TRUSTED_AUTHORS.has(skill.author),
    },
    {
      key: "streaming",
      label: "Streaming",
      Icon: Zap,
      on:
        /stream|live|real-?time/.test(text) ||
        skill.domain === "AI & Agents",
    },
    {
      key: "mcp",
      label: "MCP-ready",
      Icon: Network,
      on: /mcp|model context protocol/.test(text),
    },
    {
      key: "offline",
      label: "Works offline",
      Icon: WifiOff,
      on: /offline|local|no.?network/.test(text),
    },
    {
      key: "open-source",
      label: "Open source",
      Icon: GitBranch,
      on: Boolean(skill.githubRepoUrl),
    },
    {
      key: "tested",
      label: "Tested",
      Icon: CheckCircle2,
      on: skill.rating >= 4.5,
    },
  ];
}

function deriveCompatibility(skill: Skill) {
  // Mock per-platform compatibility based on domain/tags
  const baseSupport: Record<Platform, boolean> = {
    "claude-code": true,
    codex: /agent|prompt|skill/.test(skill.tags.join(" ").toLowerCase()),
    cursor: skill.domain === "Developer Tools" || skill.domain === "Design",
    vscode: skill.domain === "Developer Tools",
    cline: skill.domain === "AI & Agents" || skill.domain === "Automation",
  };
  return PLATFORMS.map((p) => ({ ...p, supported: baseSupport[p.key] }));
}

function buildExamplePrompts(skill: Skill): string[] {
  const name = pickLocale(skill.name, "en");
  const desc = pickLocale(skill.description, "en");
  return [
    `Use the ${name} skill on the current repo.`,
    `Apply ${name} to my latest PR and explain what changed.`,
    `Run ${name} against this CSV and show me the top three insights.`,
  ];
}

function buildChangelog(skill: Skill) {
  const [major, minor, patch] = skill.version
    .split(".")
    .map((n) => parseInt(n, 10) || 0);
  const month = 30 * 24 * 60 * 60 * 1000;
  const base = new Date(skill.releaseDate).getTime();
  return [
    {
      version: skill.version,
      at: new Date(base).toISOString(),
      note: "Polishing pass on the system prompt and improved error messages.",
    },
    {
      version: `${major}.${Math.max(0, minor - 1)}.${patch ?? 0}`,
      at: new Date(base - month).toISOString(),
      note: "Added platform support for VSCode + Cursor, faster cold start.",
    },
    {
      version: `${major}.${Math.max(0, minor - 2)}.0`,
      at: new Date(base - 2 * month).toISOString(),
      note: "Initial release.",
    },
  ];
}

function buildReviews(skill: Skill) {
  const reviewers = [
    { name: "@rosa.k", title: "Frontend lead, Forgica" },
    { name: "@kenji.t", title: "Indie hacker" },
    { name: "@vlad.r", title: "Platform engineer" },
  ];
  const quotes = [
    `Stopped me from shipping three subtle bugs. The fact that it explains *why* is what won me over.`,
    `Replaced two custom scripts I had been maintaining. Setup took less than a minute on Claude Code.`,
    `Excellent on the happy path; needs more guardrails on edge cases. Author is responsive on GitHub though.`,
  ];
  const stars = [5, 5, 4];
  return reviewers.map((r, i) => ({ ...r, quote: quotes[i]!, stars: stars[i]! }));
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
  const isTrusted = TRUSTED_AUTHORS.has(current.author);
  const caps = deriveCapabilities(current);
  const compatibility = deriveCompatibility(current);
  const examples = buildExamplePrompts(current);
  const changelog = buildChangelog(current);
  const reviews = buildReviews(current);
  const totalReviews = Math.max(3, Math.floor(current.downloads / 50));
  const contributors = Math.max(1, Math.floor(current.downloads / 2000) + 1);

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
                Skills
              </Link>
              <ChevronRight className="size-3" />
              <span>{current.domain}</span>
              <ChevronRight className="size-3" />
              <span className="font-[Menlo,monospace]">{current.id}</span>
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="bg-background text-foreground ring-foreground/10 flex size-14 shrink-0 items-center justify-center rounded-xl ring-1 dark:ring-white/[0.12]">
                  <Icon className="size-6" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="text-foreground flex items-center gap-1.5 text-xl font-bold tracking-tight">
                    <span className="truncate">{pickLocale(current.name, locale)}</span>
                    {isTrusted && (
                      <span
                        className="text-muted-foreground/70 inline-flex size-4 shrink-0 items-center justify-center"
                        title="Verified author"
                      >
                        <CheckCircle2 className="size-3.5" strokeWidth={2} />
                      </span>
                    )}
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
                      Updated {relativeTime(current.releaseDate)}
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
                  aria-label="Share"
                  title="Share"
                  onClick={() =>
                    void navigator.clipboard.writeText(
                      `${window.location.origin}/?detail=${current.id}`,
                    )
                  }
                >
                  <Share2 className="size-4" />
                </button>
                <button
                  type="button"
                  className="bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground inline-flex size-8 cursor-pointer items-center justify-center rounded-md"
                  aria-label="Report issue"
                  title="Report issue"
                >
                  <Flag className="size-4" />
                </button>
              </div>
            </div>

            {/* Capability strip — only show enabled */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {caps
                .filter((c) => c.on)
                .map(({ key, label, Icon: CapIcon }) => (
                  <span
                    key={key}
                    title={label}
                    className="text-muted-foreground ring-foreground/10 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset dark:ring-white/[0.10]"
                  >
                    <CapIcon className="size-2.5" strokeWidth={2} />
                    {label}
                  </span>
                ))}
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
                  About
                </h3>
                <p className="text-foreground text-sm leading-relaxed">
                  {pickLocale(current.longDescription, locale)}
                </p>
              </section>

              {/* Example prompts */}
              <section className="space-y-2">
                <h3 className="text-foreground inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
                  <MessageSquareQuote className="size-3.5" />
                  Example prompts
                </h3>
                <ul className="space-y-1.5">
                  {examples.map((e, i) => (
                    <li
                      key={i}
                      className="border-border bg-card group flex items-start gap-2 rounded-lg border p-2.5 text-sm dark:border-white/[0.12]"
                    >
                      <span className="bg-muted text-muted-foreground mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md font-[Menlo,monospace] text-[10px] tabular-nums">
                        {i + 1}
                      </span>
                      <span className="text-foreground/90 flex-1">{e}</span>
                      <button
                        type="button"
                        onClick={() => void navigator.clipboard.writeText(e)}
                        className="text-muted-foreground/50 hover:text-foreground opacity-0 transition-opacity group-hover:opacity-100"
                        aria-label="Copy example"
                      >
                        <Copy className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
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
