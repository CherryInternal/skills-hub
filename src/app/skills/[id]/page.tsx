import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  Download,
  GitBranch,
  ExternalLink,
  Star,
  Shield,
  Sparkles,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { api } from "~/trpc/server";
import {
  pickDomainLabel,
  pickLocale,
  type SkillDomain,
} from "@/components/skills/skills-data";
import { SkillContentTabs } from "@/components/skills/skill-content-tabs";

// Full-page skill view (SSR) — the roomy counterpart to the preview Sheet:
// SKILL.md as the README-style main content + a sidebar + the file browser.
export default async function SkillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const skill = await api.skill.getById({ id });
  if (!skill) notFound();

  const locale = await getLocale();
  const t = await getTranslations("detail");
  const name = pickLocale(skill.name, locale);
  const desc = pickLocale(skill.description, locale);

  const metaRow =
    "flex items-center justify-between gap-3 text-xs border-b border-border/60 pb-2 last:border-0 last:pb-0 dark:border-white/[0.08]";

  return (
    <main className="bg-muted/20 min-h-screen">
      <div className="mx-auto max-w-5xl px-6 py-8 sm:py-10">
        {/* 面包屑 */}
        <nav className="text-muted-foreground/70 flex items-center gap-1 text-[11px]">
          <Link href="/" className="hover:text-foreground">
            {t("breadcrumbRoot")}
          </Link>
          <ChevronRight className="size-3" />
          <span>{skill.domain}</span>
          <ChevronRight className="size-3" />
          <span className="text-foreground">{name}</span>
        </nav>

        {/* Header */}
        <header className="mt-4 flex items-start gap-4">
          <div className="bg-card text-foreground ring-foreground/10 flex size-16 shrink-0 items-center justify-center rounded-2xl ring-1 dark:ring-white/[0.12]">
            <Sparkles className="size-7" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-foreground text-2xl font-bold tracking-tight">
              {name}
            </h1>
            <p className="text-muted-foreground mt-1 max-w-prose text-sm leading-relaxed">
              {desc}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 ring-1 ring-amber-500/30 ring-inset dark:text-amber-400">
                <Star className="size-2.5" strokeWidth={2} />
                {t("curatedBadge")}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 ring-1 ring-emerald-500/30 ring-inset dark:text-emerald-400">
                <Shield className="size-2.5" strokeWidth={2} />
                {t("verifiedBadge")}
              </span>
            </div>
          </div>
        </header>

        {/* 两栏:主内容 + sidebar */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_288px]">
          {/* 主栏:SKILL.md / 内容 切换 */}
          <div className="min-w-0">
            <SkillContentTabs
              skillMd={skill.skillMd ?? null}
              skillId={skill.id}
              hasPackage={!!skill.hasPackage}
            />
          </div>

          {/* Sidebar */}
          <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
            <div className="border-border bg-card space-y-3 rounded-xl border p-4 dark:border-white/[0.12]">
              {skill.hasPackage && (
                <a
                  href={`/api/skills/${skill.id}/download`}
                  className="bg-foreground text-background hover:bg-foreground/90 flex h-10 w-full items-center justify-center gap-2 rounded-md text-sm font-medium"
                >
                  <Download className="size-4" />
                  {t("download")}
                </a>
              )}

              <dl className="space-y-2">
                <div className={metaRow}>
                  <dt className="text-muted-foreground">{t("metaAuthor")}</dt>
                  <dd className="text-foreground/90 truncate font-medium">
                    {skill.author}
                  </dd>
                </div>
                <div className={metaRow}>
                  <dt className="text-muted-foreground">{t("metaVersion")}</dt>
                  <dd className="text-foreground/90 font-[Menlo,monospace]">
                    v{skill.version}
                  </dd>
                </div>
                <div className={metaRow}>
                  <dt className="text-muted-foreground">{t("metaDomain")}</dt>
                  <dd className="text-foreground/90">
                    {pickDomainLabel(skill.domain as SkillDomain, locale)}
                  </dd>
                </div>
                <div className={metaRow}>
                  <dt className="text-muted-foreground">{t("metaDownloads")}</dt>
                  <dd className="text-foreground/90 tabular-nums">
                    {skill.downloads}
                  </dd>
                </div>
              </dl>

              {(skill.githubRepoUrl ?? skill.sourceUrl) && (
                <div className="border-border/60 space-y-1.5 border-t pt-3 dark:border-white/[0.08]">
                  {skill.githubRepoUrl && (
                    <a
                      href={skill.githubRepoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs"
                    >
                      <GitBranch className="size-3.5 shrink-0" />
                      GitHub
                    </a>
                  )}
                  {skill.sourceUrl && (
                    <a
                      href={skill.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 truncate text-xs"
                    >
                      <ExternalLink className="size-3.5 shrink-0" />
                      <span className="truncate">{t("metaSource")}</span>
                    </a>
                  )}
                </div>
              )}

              {skill.tags.length > 0 && (
                <div className="border-border/60 flex flex-wrap gap-1.5 border-t pt-3 dark:border-white/[0.08]">
                  {skill.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-muted-foreground ring-foreground/10 rounded-sm px-1.5 py-0.5 text-[10px] ring-1 dark:ring-white/[0.12]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
