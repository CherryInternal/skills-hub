"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Search, Sparkles, Download, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Section } from "@/components/ui/section";
import { cn } from "@/lib/utils";
import { api } from "~/trpc/react";
import {
  SKILL_DOMAINS,
  pickDomainLabel,
  pickLocale,
  type Skill,
  type SkillDomain,
} from "./skills-data";
import { SkillDetailSheet } from "./skill-detail-sheet";

type SortOption = "popular" | "newest" | "name_asc";

function formatDownloads(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function isNewSkill(releaseDate: string): boolean {
  const released = new Date(releaseDate);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return released >= thirtyDaysAgo;
}

function SkillCard({
  skill,
  onClick,
  locale,
  t,
}: {
  skill: Skill;
  onClick: () => void;
  locale: string;
  t: ReturnType<typeof useTranslations<"marketplace">>;
}) {
  const Icon = Sparkles;
  const isNew = isNewSkill(skill.releaseDate);
  const name = pickLocale(skill.name, locale);
  const description = pickLocale(skill.description, locale);
  const domainLabel = pickDomainLabel(skill.domain, locale);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group border-border bg-card relative flex cursor-pointer flex-col overflow-hidden rounded-xl border text-left transition-all duration-200 hover:shadow-md dark:border-white/[0.12] dark:hover:border-white/[0.20]"
    >
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start gap-3.5">
          <div className="bg-muted text-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
            <Icon className="size-4" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm leading-tight font-semibold tracking-tight">
                {name}
              </h3>
              {isNew && (
                <span className="shrink-0 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {t("newBadge")}
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-muted-foreground/60 text-xs font-medium">
                {skill.author}
              </span>
              <span className="text-muted-foreground/30">·</span>
              <span className="text-muted-foreground/40 font-[Menlo,monospace] text-xs">
                v{skill.version}
              </span>
            </div>
          </div>
        </div>

        <p className="text-foreground line-clamp-2 text-xs leading-relaxed">
          {description}
        </p>

        <div className="mt-auto flex flex-wrap gap-1">
          <span className="text-muted-foreground/80 ring-foreground/10 rounded-sm px-1.5 py-0.5 text-[10px] ring-1 dark:ring-white/[0.12]">
            {domainLabel}
          </span>
          {skill.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-muted-foreground ring-foreground/10 rounded-sm px-1.5 py-0.5 text-[10px] ring-1 dark:ring-white/[0.12]"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="border-border/60 text-muted-foreground flex items-center border-t px-5 py-2.5 text-xs dark:border-white/[0.08]">
        <span className="flex items-center gap-1">
          <Download className="size-3" />
          {formatDownloads(skill.downloads)}
        </span>
      </div>
    </button>
  );
}


export function SkillsMarketplace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const detailParam = searchParams.get("detail");
  const locale = useLocale();
  const t = useTranslations("marketplace");

  const skillsQuery = api.skill.list.useQuery({ limit: 200 });
  const allSkills = (skillsQuery.data?.items ?? []) as Skill[];

  const [activeDomain, setActiveDomain] = useState<SkillDomain | null>(() => {
    const d = searchParams.get("domain");
    return d && (SKILL_DOMAINS as readonly string[]).includes(d)
      ? (d as SkillDomain)
      : null;
  });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("popular");
  const [selected, setSelected] = useState<Skill | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(60);

  useEffect(() => {
    setVisibleCount(60);
  }, [activeDomain, search, sort]);

  const filtered = useMemo(() => {
    let list = allSkills.slice();
    if (activeDomain) list = list.filter((s) => s.domain === activeDomain);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (s) =>
          pickLocale(s.name, locale).toLowerCase().includes(q) ||
          pickLocale(s.description, locale).toLowerCase().includes(q) ||
          s.author.toLowerCase().includes(q) ||
          s.tags.some((tag) => tag.toLowerCase().includes(q)),
      );
    }
    switch (sort) {
      case "popular":
        list.sort((a, b) => b.downloads - a.downloads);
        break;
      case "newest":
        list.sort(
          (a, b) =>
            new Date(b.releaseDate).getTime() -
            new Date(a.releaseDate).getTime(),
        );
        break;
      case "name_asc":
        list.sort((a, b) =>
          pickLocale(a.name, locale).localeCompare(pickLocale(b.name, locale)),
        );
        break;
    }
    return list;
  }, [allSkills, activeDomain, search, sort, locale]);

  const domainCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of SKILL_DOMAINS) counts[d] = 0;
    for (const s of allSkills) counts[s.domain] = (counts[s.domain] ?? 0) + 1;
    return counts;
  }, [allSkills]);

  const openDetail = (s: Skill) => {
    setSelected(s);
    setSheetOpen(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set("detail", s.id);
    router.replace(`/?${params.toString()}`, {
      scroll: false,
    });
  };

  const closeDetail = (open: boolean) => {
    setSheetOpen(open);
    if (!open) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("detail");
      const qs = params.toString();
      router.replace(qs ? `/?${qs}` : "/", {
        scroll: false,
      });
    }
  };

  useEffect(() => {
    if (!detailParam) {
      if (sheetOpen) setSheetOpen(false);
      return;
    }
    if (selected?.id === detailParam) return;
    const found = allSkills.find((s) => s.id === detailParam);
    if (found) {
      setSelected(found);
      setSheetOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailParam, allSkills]);

  return (
    <>
      <Section className="px-6 sm:px-8 pt-8! pb-16!">
        <div className="max-w-container mx-auto flex flex-col gap-6 sm:gap-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-1.5">
              <h1 className="animate-appear text-2xl leading-none font-semibold tracking-tight">
                {t("title")}
              </h1>
              <p className="animate-appear text-muted-foreground text-sm font-normal opacity-0 delay-100">
                {t("subtitle")}
              </p>
            </div>
          </div>

          <div className="animate-appear flex w-full gap-8 opacity-0 delay-200">
            <aside className="hidden w-56 shrink-0 lg:block">
              <div className="sticky top-28 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
                    <Layers className="size-3.5" />
                    {t("categoriesHeading")}
                  </h3>
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => setActiveDomain(null)}
                      className={cn(
                        "flex cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-sm",
                        activeDomain === null
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                      )}
                    >
                      <span>{t("allCategories")}</span>
                      <span className="text-muted-foreground/70 text-xs tabular-nums">
                        {Object.values(domainCounts).reduce((a, b) => a + b, 0)}
                      </span>
                    </button>
                    {SKILL_DOMAINS.map((d) => {
                      const count = domainCounts[d] ?? 0;
                      const disabled = count === 0;
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => !disabled && setActiveDomain(d)}
                          disabled={disabled}
                          className={cn(
                            "flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm",
                            disabled && "text-muted-foreground/40 cursor-not-allowed",
                            !disabled && "cursor-pointer",
                            !disabled && activeDomain === d
                              ? "bg-muted text-foreground"
                              : !disabled
                                ? "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                : "",
                          )}
                        >
                          <span>{pickDomainLabel(d, locale)}</span>
                          <span className="text-muted-foreground/70 text-xs tabular-nums">
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </aside>

            <div className="min-w-0 flex-1">
              <div className="mb-6 flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="text-muted-foreground absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("searchPlaceholder")}
                    className="h-9 pl-9"
                  />
                </div>

                <Select
                  value={sort}
                  onValueChange={(v) => setSort(v as SortOption)}
                >
                  <SelectTrigger className="h-9 w-40 shrink-0 shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">{t("sortPopular")}</SelectItem>
                    <SelectItem value="newest">{t("sortNewest")}</SelectItem>
                    <SelectItem value="name_asc">{t("sortName")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="text-muted-foreground mb-4 text-sm">
                {t("itemCount", { count: filtered.length })}
                {activeDomain ? ` · ${pickDomainLabel(activeDomain, locale)}` : ""}
              </div>

              {skillsQuery.isLoading ? (
                <div className="text-muted-foreground py-20 text-center">
                  {t("loading")}
                </div>
              ) : filtered.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {filtered.slice(0, visibleCount).map((skill) => (
                      <SkillCard
                        key={skill.id}
                        skill={skill}
                        locale={locale}
                        t={t}
                        onClick={() => openDetail(skill)}
                      />
                    ))}
                  </div>
                  {visibleCount < filtered.length && (
                    <div className="mt-6 flex flex-col items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setVisibleCount((n) => n + 60)}
                        className="h-9"
                      >
                        {t("loadMore")}
                      </Button>
                      <span className="text-muted-foreground/70 text-xs tabular-nums">
                        {t("showingOf", {
                          visible: Math.min(visibleCount, filtered.length),
                          total: filtered.length,
                        })}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-muted-foreground py-20 text-center">
                  {t("emptyTitle")}
                </div>
              )}
            </div>
          </div>
        </div>
      </Section>

      <SkillDetailSheet
        skill={selected}
        open={sheetOpen}
        onOpenChange={closeDetail}
      />
    </>
  );
}
