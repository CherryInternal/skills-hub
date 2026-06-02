"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Inbox,
  Trash2,
  GitBranch,
  ChevronRight,
} from "lucide-react";
import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  deleteSubmission,
  loadSubmissions,
  statusProgress,
  type SubmissionStatus,
  type UserSubmission,
} from "./skills-storage";
import { StatusBadge } from "./status-badge";
import { pickLocale } from "./skills-data";
import { useLocale, useTranslations } from "next-intl";

const TAB_KEYS: Array<"all" | SubmissionStatus> = [
  "all",
  "pending",
  "reviewing",
  "changes_requested",
  "approved",
  "rejected",
];

export function MySubmissions() {
  const locale = useLocale();
  const t = useTranslations("mySubmissions");

  const relativeTime = (iso: string): string => {
    const diffMs = Date.now() - new Date(iso).getTime();
    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return t("relativeSeconds", { count: seconds });
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t("relativeMinutes", { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t("relativeHours", { count: hours });
    const days = Math.floor(hours / 24);
    return t("relativeDays", { count: days });
  };

  const tabLabel = (key: "all" | SubmissionStatus): string => {
    switch (key) {
      case "all":
        return t("tabAll");
      case "pending":
        return t("tabPending");
      case "reviewing":
        return t("tabReviewing");
      case "changes_requested":
        return t("tabChangesRequested");
      case "approved":
        return t("tabApproved");
      case "rejected":
        return t("tabRejected");
    }
  };

  const [items, setItems] = useState<UserSubmission[]>([]);
  const [activeTab, setActiveTab] =
    useState<(typeof TAB_KEYS)[number]>("all");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setItems(loadSubmissions());
    const interval = setInterval(() => {
      setItems(loadSubmissions());
      setNow(Date.now());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const key of TAB_KEYS.slice(1)) c[key] = 0;
    for (const it of items) c[it.status] = (c[it.status] ?? 0) + 1;
    return c;
  }, [items]);

  const filtered = useMemo(
    () =>
      activeTab === "all"
        ? items
        : items.filter((i) => i.status === activeTab),
    [items, activeTab],
  );

  const handleDelete = (id: string) => {
    deleteSubmission(id);
    setItems(loadSubmissions());
  };

  void now;

  return (
    <Section className="px-6 !py-16 sm:px-8">
      <div className="max-w-container mx-auto flex flex-col gap-6 sm:gap-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
            >
              <ArrowLeft className="size-3" />
              {t("backToMarketplace")}
            </Link>
            <h1 className="text-2xl leading-none font-semibold tracking-tight">
              {t("title")}
            </h1>
            <p className="text-muted-foreground text-sm">
              {t("subtitle")}
            </p>
          </div>
          <Link
            href="/"
            className="bg-foreground text-background hover:bg-foreground/90 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-medium"
          >
            {t("submitAnother")}
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {TAB_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={cn(
                "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors",
                activeTab === key
                  ? "border-foreground text-foreground"
                  : "border-input text-muted-foreground hover:border-foreground/40 hover:text-foreground",
              )}
            >
              {tabLabel(key)}
              <span className="text-muted-foreground/70 tabular-nums">
                ({counts[key] ?? 0})
              </span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="border-border bg-card flex flex-col items-center justify-center gap-3 rounded-xl border py-16 dark:border-white/[0.12]">
            <div className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-full">
              <Inbox className="size-5" />
            </div>
            <div className="text-center">
              <p className="text-foreground text-sm font-medium">
                {activeTab !== "all"
                  ? t("emptyTitleFiltered", { status: tabLabel(activeTab) })
                  : t("emptyTitle")}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {t("emptyDescription")}
              </p>
            </div>
            <Link
              href="/"
              className="text-foreground hover:text-foreground/80 mt-1 inline-flex items-center gap-1 text-xs font-medium"
            >
              {t("goToMarketplace")}
              <ArrowRight className="size-3" />
            </Link>
          </div>
        ) : (
          <div className="border-border bg-card overflow-hidden rounded-xl border dark:border-white/[0.12]">
            <ul className="divide-border/60 divide-y dark:divide-white/[0.08]">
              {filtered.map((sub) => {
                const progress = statusProgress(sub.status);
                const final =
                  sub.status === "approved" || sub.status === "rejected";
                return (
                  <li
                    key={sub.skill.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-4 px-5 py-4">
                      <Link
                        href={`/submissions/${sub.skill.id}`}
                        className="flex min-w-0 flex-1 items-center gap-4"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-foreground truncate text-sm font-semibold tracking-tight">
                              {pickLocale(sub.skill.name, locale)}
                            </h3>
                            <StatusBadge status={sub.status} />
                          </div>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="text-muted-foreground/60 text-xs">
                              {sub.skill.author}
                            </span>
                            <span className="text-muted-foreground/30">·</span>
                            <span className="text-muted-foreground/60 font-[Menlo,monospace] text-xs">
                              v{sub.skill.version}
                            </span>
                            <span className="text-muted-foreground/30">·</span>
                            <span className="text-muted-foreground/60 text-xs">
                              {sub.skill.domain}
                            </span>
                            <span className="text-muted-foreground/30">·</span>
                            <span className="text-muted-foreground/60 text-xs">
                              {t("submittedAt", {
                                time: relativeTime(sub.submittedAt),
                              })}
                            </span>
                          </div>

                          <div className="mt-2.5 flex items-center gap-2.5">
                            <div className="bg-muted h-1 max-w-xs flex-1 overflow-hidden rounded-full">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-500",
                                  sub.status === "rejected"
                                    ? "bg-rose-500"
                                    : sub.status === "changes_requested"
                                      ? "bg-orange-500"
                                      : sub.status === "approved"
                                        ? "bg-emerald-500"
                                        : "bg-foreground",
                                )}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-muted-foreground text-[10px] tabular-nums">
                              {progress}%
                            </span>
                          </div>
                        </div>
                      </Link>

                      <div className="flex items-center gap-1">
                        {sub.githubPrUrl && (
                          <a
                            href={sub.githubPrUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:bg-muted text-muted-foreground hover:text-foreground inline-flex size-8 items-center justify-center rounded-md cursor-pointer"
                            aria-label={t("viewGithubPr")}
                            title={t("viewGithubPr")}
                          >
                            <GitBranch className="size-4" />
                          </a>
                        )}
                        {final && (
                          <button
                            type="button"
                            onClick={() => handleDelete(sub.skill.id)}
                            className="hover:bg-muted text-muted-foreground hover:text-rose-600 inline-flex size-8 items-center justify-center rounded-md cursor-pointer"
                            aria-label={t("deleteSubmission")}
                            title={t("deleteSubmission")}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                        <Link
                          href={`/submissions/${sub.skill.id}`}
                          className="hover:bg-muted text-muted-foreground hover:text-foreground inline-flex size-8 items-center justify-center rounded-md"
                          aria-label={t("viewDetails")}
                        >
                          <ChevronRight className="size-4" />
                        </Link>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </Section>
  );
}
