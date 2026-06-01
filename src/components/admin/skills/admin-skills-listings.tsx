"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Search, Store, Sparkles, Terminal, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deleteListing,
  loadListings,
  setListingPublished,
  type ListingItem,
  type ListingSource,
} from "@/components/skills/skills-storage";
import { pickLocale, SKILL_DOMAINS, type SkillDomain } from "@/components/skills/skills-data";
import { AdminSkillEditSheet } from "./admin-skill-edit-sheet";

type SourceFilter = "all" | ListingSource;
type StatusFilter = "all" | "published" | "unpublished";
type DomainFilter = "all" | SkillDomain;

const SOURCE_TABS: Array<{ key: SourceFilter; labelKey: string }> = [
  { key: "all", labelKey: "sourceAll" },
  { key: "catalog", labelKey: "sourceCatalog" },
  { key: "submission", labelKey: "sourceSubmission" },
];

const STATUS_TABS: Array<{ key: StatusFilter; labelKey: string }> = [
  { key: "all", labelKey: "statusAll" },
  { key: "published", labelKey: "statusPublished" },
  { key: "unpublished", labelKey: "statusUnpublished" },
];

function formatInstalls(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function AdminSkillsListings() {
  const locale = useLocale();
  const t = useTranslations("admin.listings");
  const [items, setItems] = useState<ListingItem[]>([]);
  const [source, setSource] = useState<SourceFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [domain, setDomain] = useState<DomainFilter>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ListingItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const refresh = () => setItems(loadListings());

  useEffect(() => {
    refresh();
  }, []);

  const counts = useMemo(() => {
    const c = {
      all: items.length,
      catalog: 0,
      submission: 0,
      published: 0,
      unpublished: 0,
    };
    for (const it of items) {
      c[it.source] += 1;
      if (it.published) c.published += 1;
      else c.unpublished += 1;
    }
    return c;
  }, [items]);

  const domainCounts = useMemo(() => {
    const map = new Map<SkillDomain, number>();
    for (const d of SKILL_DOMAINS) map.set(d, 0);
    for (const i of items) {
      map.set(i.skill.domain, (map.get(i.skill.domain) ?? 0) + 1);
    }
    return map;
  }, [items]);

  const filtered = useMemo(() => {
    let list = items.slice();
    if (source !== "all") list = list.filter((i) => i.source === source);
    if (status === "published") list = list.filter((i) => i.published);
    else if (status === "unpublished") list = list.filter((i) => !i.published);
    if (domain !== "all") list = list.filter((i) => i.skill.domain === domain);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (i) =>
          pickLocale(i.skill.name, "en").toLowerCase().includes(q) ||
          pickLocale(i.skill.name, "zh").toLowerCase().includes(q) ||
          i.skill.author.toLowerCase().includes(q) ||
          i.skill.domain.toLowerCase().includes(q) ||
          i.skill.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return list.sort((a, b) => {
      if (a.published !== b.published) return a.published ? -1 : 1;
      return b.skill.installs - a.skill.installs;
    });
  }, [items, source, status, domain, search]);

  const handleToggle = (item: ListingItem, next: boolean) => {
    setListingPublished(item, next, "admin");
    refresh();
  };

  const handleDelete = (item: ListingItem) => {
    const name = pickLocale(item.skill.name, locale);
    if (
      !window.confirm(
        `${t("deleteConfirmPrefix")}「${name}」${t("deleteConfirmSuffix")}`,
      )
    ) {
      return;
    }
    deleteListing(item, "admin");
    refresh();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Store className="text-foreground size-5" strokeWidth={2} />
          <h1 className="text-foreground text-xl font-semibold tracking-tight">
            {t("title")}
          </h1>
        </div>
        <p className="text-muted-foreground text-sm">
          {t("subtitle")}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">{t("sourceLabel")}</span>
          <Select
            value={source}
            onValueChange={(v) => setSource(v as SourceFilter)}
          >
            <SelectTrigger className="h-9 w-44 shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOURCE_TABS.map(({ key, labelKey }) => (
                <SelectItem key={key} value={key}>
                  {t(labelKey)} (
                  {key === "all"
                    ? counts.all
                    : key === "catalog"
                      ? counts.catalog
                      : counts.submission}
                  )
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">{t("statusLabel")}</span>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as StatusFilter)}
          >
            <SelectTrigger className="h-9 w-44 shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_TABS.map(({ key, labelKey }) => (
                <SelectItem key={key} value={key}>
                  {t(labelKey)} (
                  {key === "all"
                    ? counts.all
                    : key === "published"
                      ? counts.published
                      : counts.unpublished}
                  )
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">{t("domainLabel")}</span>
          <Select
            value={domain}
            onValueChange={(v) => setDomain(v as DomainFilter)}
          >
            <SelectTrigger className="h-9 w-48 shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("domainAll")} ({counts.all})</SelectItem>
              {SKILL_DOMAINS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d} ({domainCounts.get(d) ?? 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border-border bg-card flex items-center gap-2 rounded-xl border p-3 dark:border-white/[0.12]">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-9 border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0"
          />
        </div>
      </div>

      <div className="border-border bg-card overflow-hidden rounded-xl border dark:border-white/[0.12]">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Store className="text-muted-foreground/50 size-8" />
            <p className="text-foreground text-sm font-medium">
              {t("emptyTitle")}
            </p>
            <p className="text-muted-foreground text-xs">
              {t("emptyHint")}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colName")}</TableHead>
                <TableHead>{t("colCategory")}</TableHead>
                <TableHead>{t("colAuthor")}</TableHead>
                <TableHead>{t("colSource")}</TableHead>
                <TableHead className="text-right">{t("colInstalls")}</TableHead>
                <TableHead className="text-center">{t("colStatus")}</TableHead>
                <TableHead className="text-center">{t("colPublish")}</TableHead>
                <TableHead className="w-24 text-right">{t("colActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => {
                const CategoryIcon =
                  item.skill.category === "skill" ? Sparkles : Terminal;
                return (
                  <TableRow key={`${item.source}-${item.skill.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="bg-muted text-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
                          <CategoryIcon className="size-4" strokeWidth={2} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-foreground truncate text-sm font-semibold tracking-tight">
                            {pickLocale(item.skill.name, locale)}
                          </div>
                          <div className="text-muted-foreground truncate text-xs">
                            {item.skill.domain} ·{" "}
                            <span className="font-[Menlo,monospace]">
                              v{item.skill.version}
                            </span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {item.skill.category === "skill" ? "Skill" : "CLI"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {item.skill.author}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="rounded-md text-[11px] font-medium"
                      >
                        {item.source === "catalog"
                          ? t("badgeCatalog")
                          : t("badgeSubmission")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      {formatInstalls(item.skill.installs)}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.published ? (
                        <Badge
                          variant="outline"
                          className="rounded-full border-emerald-500/40 bg-emerald-500/10 text-[11px] text-emerald-700 dark:text-emerald-300"
                        >
                          {t("statusPublished")}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="rounded-full text-[11px]"
                        >
                          {t("statusUnpublished")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={item.published}
                        onCheckedChange={(v) => handleToggle(item, v)}
                        aria-label={
                          item.published
                            ? `${t("unpublishAria")} ${pickLocale(item.skill.name, locale)}`
                            : `${t("publishAriaPrefix")} ${pickLocale(item.skill.name, locale)} ${t("publishAriaSuffix")}`
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        {!item.published && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 h-8 px-2"
                            onClick={() => handleDelete(item)}
                            aria-label={`${t("deleteAria")} ${pickLocale(item.skill.name, locale)}`}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => {
                            setEditing(item);
                            setEditOpen(true);
                          }}
                          aria-label={`${t("editAria")} ${pickLocale(item.skill.name, locale)}`}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <AdminSkillEditSheet
        item={editing}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={refresh}
      />
    </div>
  );
}
