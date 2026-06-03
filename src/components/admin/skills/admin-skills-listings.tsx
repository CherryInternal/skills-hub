"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { LogOut, Pencil, Plus, Search, Store, Trash2 } from "lucide-react";
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
import { pickLocale } from "@/components/skills/skills-data";
import { api } from "~/trpc/react";
import { logout } from "~/app/admin/actions";
import {
  AdminSkillEditSheet,
  type AdminSkill,
} from "./admin-skill-edit-sheet";

type StatusFilter = "all" | "published" | "unpublished";

const STATUS_TABS: Array<{ key: StatusFilter; labelKey: string }> = [
  { key: "all", labelKey: "statusAll" },
  { key: "published", labelKey: "statusPublished" },
  { key: "unpublished", labelKey: "statusUnpublished" },
];

function formatDownloads(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function AdminSkillsListings() {
  const locale = useLocale();
  const t = useTranslations("admin.listings");
  const utils = api.useUtils();
  const listQuery = api.skill.adminList.useQuery();
  const items = useMemo(() => listQuery.data ?? [], [listQuery.data]);

  const setPublished = api.skill.setPublished.useMutation({
    onSuccess: () => utils.skill.adminList.invalidate(),
  });
  const deleteSkill = api.skill.delete.useMutation({
    onSuccess: () => utils.skill.adminList.invalidate(),
  });

  const [status, setStatus] = useState<StatusFilter>("all");
  const [domain, setDomain] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AdminSkill | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const counts = useMemo(() => {
    const c = { all: items.length, published: 0, unpublished: 0 };
    for (const it of items) {
      if (it.published) c.published += 1;
      else c.unpublished += 1;
    }
    return c;
  }, [items]);

  const domainCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of items) map.set(i.domain, (map.get(i.domain) ?? 0) + 1);
    return map;
  }, [items]);

  const domains = useMemo(
    () => [...domainCounts.keys()].sort((a, b) => a.localeCompare(b)),
    [domainCounts],
  );

  const filtered = useMemo(() => {
    let list = items.slice();
    if (status === "published") list = list.filter((i) => i.published);
    else if (status === "unpublished") list = list.filter((i) => !i.published);
    if (domain !== "all") list = list.filter((i) => i.domain === domain);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (i) =>
          pickLocale(i.name, "en").toLowerCase().includes(q) ||
          pickLocale(i.name, "zh").toLowerCase().includes(q) ||
          i.author.toLowerCase().includes(q) ||
          i.domain.toLowerCase().includes(q) ||
          i.tags.some((tg) => tg.toLowerCase().includes(q)),
      );
    }
    return list.sort((a, b) => {
      if (a.published !== b.published) return a.published ? -1 : 1;
      return b.downloads - a.downloads;
    });
  }, [items, status, domain, search]);

  const handleToggle = (item: AdminSkill, next: boolean) => {
    setPublished.mutate({ id: item.id, published: next });
  };

  const handleDelete = (item: AdminSkill) => {
    const name = pickLocale(item.name, locale);
    if (
      !window.confirm(
        `${t("deleteConfirmPrefix")}「${name}」${t("deleteConfirmSuffix")}`,
      )
    ) {
      return;
    }
    deleteSkill.mutate({ id: item.id });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Store className="text-foreground size-5" strokeWidth={2} />
            <h1 className="text-foreground text-xl font-semibold tracking-tight">
              {t("title")}
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="bg-foreground text-background hover:bg-foreground/90 h-9 gap-1.5"
            onClick={() => {
              setEditing(null);
              setEditOpen(true);
            }}
          >
            <Plus className="size-3.5" />
            新建 skill
          </Button>
          <form action={logout}>
            <Button type="submit" variant="outline" size="sm" className="h-9 gap-1.5">
              <LogOut className="size-3.5" />
              {t("logout")}
            </Button>
          </form>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
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
          <Select value={domain} onValueChange={(v) => setDomain(v)}>
            <SelectTrigger className="h-9 w-48 shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("domainAll")} ({counts.all})
              </SelectItem>
              {domains.map((d) => (
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
              {listQuery.isLoading ? t("loading") : t("emptyTitle")}
            </p>
            {!listQuery.isLoading && (
              <p className="text-muted-foreground text-xs">{t("emptyHint")}</p>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colName")}</TableHead>
                <TableHead>{t("colAuthor")}</TableHead>
                <TableHead className="text-right">{t("colInstalls")}</TableHead>
                <TableHead className="text-center">{t("colStatus")}</TableHead>
                <TableHead className="text-center">{t("colPublish")}</TableHead>
                <TableHead className="w-24 text-right">{t("colActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="bg-muted text-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
                        <Store className="size-4" strokeWidth={2} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-foreground truncate text-sm font-semibold tracking-tight">
                          {pickLocale(item.name, locale)}
                        </div>
                        <div className="text-muted-foreground truncate text-xs">
                          {item.domain} ·{" "}
                          <span className="font-[Menlo,monospace]">
                            v{item.version}
                          </span>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {item.author}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    {formatDownloads(item.downloads)}
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
                      <Badge variant="outline" className="rounded-full text-[11px]">
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
                          ? `${t("unpublishAria")} ${pickLocale(item.name, locale)}`
                          : `${t("publishAriaPrefix")} ${pickLocale(item.name, locale)} ${t("publishAriaSuffix")}`
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
                          aria-label={`${t("deleteAria")} ${pickLocale(item.name, locale)}`}
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
                        aria-label={`${t("editAria")} ${pickLocale(item.name, locale)}`}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <AdminSkillEditSheet
        skill={editing}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={() => utils.skill.adminList.invalidate()}
      />
    </div>
  );
}
