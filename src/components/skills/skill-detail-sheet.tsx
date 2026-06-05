"use client";

import { useEffect, useState, type ReactNode } from "react";
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
  Folder,
  FileText,
  FolderTree,
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

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

interface TreeNode {
  name: string;
  size?: number;
  children?: Map<string, TreeNode>;
}

// Builds a nested tree from flat zip paths ("a/b/c.txt").
function buildTree(
  files: { path: string; size: number }[],
): Map<string, TreeNode> {
  const root = new Map<string, TreeNode>();
  for (const f of files) {
    const parts = f.path.split("/").filter(Boolean);
    let level = root;
    parts.forEach((part, i) => {
      const isFile = i === parts.length - 1;
      let node = level.get(part);
      if (!node) {
        node = isFile
          ? { name: part, size: f.size }
          : { name: part, children: new Map() };
        level.set(part, node);
      }
      if (node.children) level = node.children;
    });
  }
  return root;
}

// Renders the tree as indented rows (folders first, then files, A→Z).
function fileRows(
  nodes: Map<string, TreeNode>,
  depth = 0,
  prefix = "",
): ReactNode[] {
  const sorted = [...nodes.values()].sort((a, b) => {
    const aDir = !!a.children;
    const bDir = !!b.children;
    if (aDir !== bDir) return aDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  const out: ReactNode[] = [];
  for (const node of sorted) {
    const key = `${prefix}/${node.name}`;
    out.push(
      <div
        key={key}
        className="flex items-center gap-1.5 py-0.5 text-xs"
        style={{ paddingLeft: depth * 14 }}
      >
        {node.children ? (
          <Folder className="text-muted-foreground size-3.5 shrink-0" />
        ) : (
          <FileText className="text-muted-foreground/60 size-3.5 shrink-0" />
        )}
        <span className="text-foreground/90 truncate font-[Menlo,monospace]">
          {node.name}
        </span>
        {node.size != null && (
          <span className="text-muted-foreground/60 ml-auto shrink-0 pl-2 tabular-nums">
            {formatBytes(node.size)}
          </span>
        )}
      </div>,
    );
    if (node.children) out.push(...fileRows(node.children, depth + 1, key));
  }
  return out;
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

// ─── package contents ───────────────────────────────────────

function PackageContents({ skill }: { skill: Skill }) {
  const t = useTranslations("detail");
  const [files, setFiles] = useState<{ path: string; size: number }[] | null>(
    null,
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!skill.hasPackage) return;
    let cancelled = false;
    setFiles(null);
    setFailed(false);
    fetch(`/api/skills/${skill.id}/contents`)
      .then((r) =>
        r.ok
          ? (r.json() as Promise<{ files: { path: string; size: number }[] }>)
          : Promise.reject(new Error()),
      )
      .then((d) => {
        if (!cancelled) setFiles(d.files);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [skill.id, skill.hasPackage]);

  if (!skill.hasPackage) return null;

  return (
    <section className="space-y-2">
      <h3 className="text-foreground inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
        <FolderTree className="size-3.5" />
        {t("packageContents")}
      </h3>
      <div className="border-border bg-card rounded-lg border p-3 dark:border-white/[0.12]">
        {failed ? (
          <p className="text-muted-foreground text-xs">
            {t("packageContentsError")}
          </p>
        ) : files === null ? (
          <p className="text-muted-foreground text-xs">
            {t("packageContentsLoading")}
          </p>
        ) : files.length === 0 ? (
          <p className="text-muted-foreground text-xs">—</p>
        ) : (
          <div>{fileRows(buildTree(files))}</div>
        )}
      </div>
    </section>
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
                className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 ring-1 ring-amber-500/30 ring-inset dark:text-amber-400"
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

              {/* 包内容 */}
              <PackageContents skill={current} />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
