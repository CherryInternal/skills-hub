"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  Check,
  X,
  AlertCircle,
  Eye,
  Sparkles,
  Wand2,
  Search,
  ExternalLink,
  EyeOff,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/skills/status-badge";
import { pickLocale } from "@/components/skills/skills-data";
import {
  loadSubmissions,
  updateSubmissionStatus,
  setPublished,
  loadAIConfig,
  type SubmissionStatus,
  type UserSubmission,
} from "@/components/skills/skills-storage";

type TabKey = "all" | SubmissionStatus | "published" | "unpublished";

const TABS: Array<{ key: TabKey; labelKey: string }> = [
  { key: "all", labelKey: "filterAll" },
  { key: "pending", labelKey: "filterPending" },
  { key: "reviewing", labelKey: "filterReviewing" },
  { key: "changes_requested", labelKey: "filterChangesRequested" },
  { key: "approved", labelKey: "filterApproved" },
  { key: "rejected", labelKey: "filterRejected" },
  { key: "published", labelKey: "filterPublished" },
  { key: "unpublished", labelKey: "filterUnpublished" },
];

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function AdminSkillsList() {
  const t = useTranslations("admin.list");
  const [items, setItems] = useState<UserSubmission[]>([]);
  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [aiEnabled, setAiEnabled] = useState(false);

  const refresh = () => setItems(loadSubmissions());

  useEffect(() => {
    refresh();
    setAiEnabled(loadAIConfig().enabled);
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, []);

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = {
      all: items.length,
      pending: 0,
      reviewing: 0,
      changes_requested: 0,
      approved: 0,
      rejected: 0,
      published: 0,
      unpublished: 0,
    };
    for (const it of items) {
      c[it.status] += 1;
      if (it.published) c.published += 1;
      else if (it.status === "approved" && !it.published) c.unpublished += 1;
    }
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    let list = items.slice();
    if (tab === "published") list = list.filter((s) => s.published);
    else if (tab === "unpublished")
      list = list.filter((s) => s.status === "approved" && !s.published);
    else if (tab !== "all") list = list.filter((s) => s.status === tab);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (s) =>
          pickLocale(s.skill.name, "en").toLowerCase().includes(q) ||
          pickLocale(s.skill.name, "zh").toLowerCase().includes(q) ||
          s.skill.author.toLowerCase().includes(q) ||
          s.skill.domain.toLowerCase().includes(q),
      );
    }
    return list.sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    );
  }, [items, tab, search]);

  const handleAction = (
    id: string,
    next: SubmissionStatus,
    message: string,
  ) => {
    updateSubmissionStatus(id, next, "admin", message);
    refresh();
  };

  const handlePublishToggle = (sub: UserSubmission) => {
    setPublished(sub.skill.id, !sub.published, "admin");
    refresh();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Sparkles className="text-foreground size-5" strokeWidth={2} />
          <h1 className="text-foreground text-xl font-semibold tracking-tight">
            {t("title")}
          </h1>
        </div>
        <p className="text-muted-foreground text-sm">
          {t("subtitle")}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">{t("statusLabel")}</span>
          <Select value={tab} onValueChange={(v) => setTab(v as TabKey)}>
            <SelectTrigger className="h-9 w-44 shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TABS.map(({ key, labelKey }) => (
                <SelectItem key={key} value={key}>
                  {t(labelKey)} ({counts[key] ?? 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Link
          href="/admin/ai-review"
          className={cn(
            "border-input hover:bg-muted/60 inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium",
            aiEnabled && "border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
          )}
        >
          <Wand2 className="size-3.5" />
          {t("aiAutoReview")}
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
              aiEnabled
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "bg-muted text-muted-foreground",
            )}
          >
            {aiEnabled ? t("statusOn") : t("statusOff")}
          </span>
        </Link>
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
          <div className="flex min-h-[55vh] flex-col items-center justify-center gap-2 py-16 text-center">
            <Sparkles className="text-muted-foreground/50 size-8" />
            <p className="text-foreground text-sm font-medium">
              {t("emptyTitle")}
            </p>
            <p className="text-muted-foreground text-xs">
              {t("emptyDescription")}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columnName")}</TableHead>
                <TableHead>{t("columnAuthor")}</TableHead>
                <TableHead>{t("columnSubmittedAt")}</TableHead>
                <TableHead className="text-center">{t("columnAi")}</TableHead>
                <TableHead className="text-center">{t("columnStatus")}</TableHead>
                <TableHead className="text-right">{t("columnActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((sub) => (
                <TableRow key={sub.skill.id}>
                  <TableCell>
                    <Link
                      href={`/admin/${sub.skill.id}`}
                      className="block min-w-0"
                    >
                      <div className="text-foreground truncate text-sm font-semibold tracking-tight">
                        {pickLocale(sub.skill.name, "zh")}
                      </div>
                      <div className="text-muted-foreground truncate text-xs">
                        {sub.skill.domain} ·{" "}
                        <span className="font-[Menlo,monospace]">
                          v{sub.skill.version}
                        </span>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {sub.skill.author}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {relativeTime(sub.submittedAt)}
                  </TableCell>
                  <TableCell className="text-center">
                    {sub.aiReview ? (
                      <span className="bg-violet-500/10 text-violet-700 dark:text-violet-300 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                        <Wand2 className="size-2.5" />
                        {sub.aiReview.confidence}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40 text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="inline-flex flex-wrap items-center justify-center gap-1">
                      <StatusBadge status={sub.status} />
                      {sub.published && (
                        <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                          {t("publishedBadge")}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      {sub.githubPrUrl && (
                        <a
                          href={sub.githubPrUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:bg-muted text-muted-foreground hover:text-foreground inline-flex size-8 items-center justify-center rounded-md"
                          title="GitHub PR"
                        >
                          <ExternalLink className="size-4" />
                        </a>
                      )}

                      {(sub.status === "pending" ||
                        sub.status === "reviewing" ||
                        sub.status === "changes_requested") && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleAction(
                                sub.skill.id,
                                "approved",
                                t("messageApproved"),
                              )
                            }
                            className="h-8 gap-1 border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
                          >
                            <Check className="size-3.5" />
                            {t("actionApprove")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleAction(
                                sub.skill.id,
                                "changes_requested",
                                t("messageChangesRequested"),
                              )
                            }
                            className="h-8 gap-1 border-orange-500/40 text-orange-700 hover:bg-orange-500/10 dark:text-orange-300"
                          >
                            <AlertCircle className="size-3.5" />
                            {t("actionRequestChanges")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleAction(
                                sub.skill.id,
                                "rejected",
                                t("messageRejected"),
                              )
                            }
                            className="h-8 gap-1 border-rose-500/40 text-rose-700 hover:bg-rose-500/10 dark:text-rose-300"
                          >
                            <X className="size-3.5" />
                            {t("actionReject")}
                          </Button>
                        </>
                      )}

                      {sub.status === "approved" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePublishToggle(sub)}
                          className={cn(
                            "h-8 gap-1",
                            sub.published
                              ? "border-amber-500/40 text-amber-700 hover:bg-amber-500/10 dark:text-amber-300"
                              : "border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300",
                          )}
                        >
                          {sub.published ? (
                            <>
                              <EyeOff className="size-3.5" />
                              {t("actionUnpublish")}
                            </>
                          ) : (
                            <>
                              <Eye className="size-3.5" />
                              {t("actionPublish")}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
