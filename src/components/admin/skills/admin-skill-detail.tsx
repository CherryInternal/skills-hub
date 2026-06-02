"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import {
  ArrowLeft,
  GitBranch,
  ExternalLink,
  FileText,
  Send,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Eye,
  Clock,
  MessageSquare,
  Wand2,
  EyeOff,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/skills/status-badge";
import { pickLocale } from "@/components/skills/skills-data";
import {
  loadSubmissions,
  statusProgress,
  updateSubmissionStatus,
  addComment,
  setPublished,
  type TimelineEvent,
  type UserSubmission,
} from "@/components/skills/skills-storage";

const TIMELINE_ICONS: Record<TimelineEvent["type"], typeof Clock> = {
  submitted: Send,
  assigned: Eye,
  comment: MessageSquare,
  changes_requested: AlertCircle,
  approved: CheckCircle2,
  rejected: XCircle,
  ai_review: Wand2,
  published: Eye,
  unpublished: EyeOff,
};

const TIMELINE_COLORS: Record<TimelineEvent["type"], string> = {
  submitted: "bg-foreground/10 text-foreground",
  assigned: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  comment: "bg-muted text-muted-foreground",
  changes_requested:
    "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  rejected: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  ai_review: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  published: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  unpublished: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminSkillDetail({
  submissionId,
}: {
  submissionId: string;
}) {
  const locale = useLocale();
  const t = useTranslations("admin.detail");
  const [submission, setSubmission] = useState<UserSubmission | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [comment, setComment] = useState("");

  const refresh = () => {
    const all = loadSubmissions();
    const found = all.find((s) => s.skill.id === submissionId);
    if (!found) {
      setNotFound(true);
      setSubmission(null);
    } else {
      setNotFound(false);
      setSubmission(found);
    }
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [submissionId]);

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <h1 className="text-xl font-semibold">{t("notFoundTitle")}</h1>
        <Link
          href="/admin"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-3.5" />
          {t("backToList")}
        </Link>
      </div>
    );
  }
  if (!submission) return <div className="py-20" />;

  const progress = statusProgress(submission.status);
  const isOpen =
    submission.status === "pending" ||
    submission.status === "reviewing" ||
    submission.status === "changes_requested";

  const act = (
    next: Parameters<typeof updateSubmissionStatus>[1],
    msg: string,
  ) => {
    updateSubmissionStatus(submissionId, next, "admin", msg);
    refresh();
  };

  const submitComment = () => {
    if (!comment.trim()) return;
    addComment(submissionId, "admin", comment.trim());
    setComment("");
    refresh();
  };

  const togglePublished = () => {
    setPublished(submissionId, !submission.published, "admin");
    refresh();
  };

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/admin"
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-xs"
      >
        <ArrowLeft className="size-3" />
        {t("backToReviewList")}
      </Link>

      <div className="border-border bg-card flex flex-col gap-5 rounded-xl border p-6 dark:border-white/[0.12]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-foreground text-xl font-semibold tracking-tight">
                {pickLocale(submission.skill.name, locale)}
              </h1>
              <StatusBadge status={submission.status} size="sm" />
              {submission.published && (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  {t("publishedBadge")}
                </span>
              )}
              {submission.aiReview && (
                <span className="bg-violet-500/10 text-violet-700 dark:text-violet-300 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
                  <Wand2 className="size-3" />
                  AI {submission.aiReview.verdict} · {submission.aiReview.confidence}%
                </span>
              )}
            </div>
            <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
              <span>{submission.skill.author}</span>
              <span className="text-muted-foreground/30">·</span>
              <span className="font-[Menlo,monospace]">
                v{submission.skill.version}
              </span>
              <span className="text-muted-foreground/30">·</span>
              <span>{submission.skill.domain}</span>
              <span className="text-muted-foreground/30">·</span>
              <span>
                {submission.skill.category === "skill" ? "Skill" : "CLI"}
              </span>
              <span className="text-muted-foreground/30">·</span>
              <span>{t("submittedAt", { date: fmtDateTime(submission.submittedAt) })}</span>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            {submission.githubPrUrl && (
              <a
                href={submission.githubPrUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="border-input hover:bg-muted/60 inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium"
              >
                <GitBranch className="size-4" />
                PR
              </a>
            )}
            <a
              href={submission.skill.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="border-input hover:bg-muted/60 inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium"
            >
              <FileText className="size-4" />
              {t("docs")}
              <ExternalLink className="size-3" />
            </a>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">{t("reviewProgress")}</span>
            <span className="text-foreground text-xs font-medium tabular-nums">
              {progress}%
            </span>
          </div>
          <div className="bg-muted h-1.5 overflow-hidden rounded-full">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                submission.status === "rejected"
                  ? "bg-rose-500"
                  : submission.status === "changes_requested"
                    ? "bg-orange-500"
                    : submission.status === "approved"
                      ? "bg-emerald-500"
                      : "bg-foreground",
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isOpen && (
            <>
              <Button
                onClick={() => act("approved", t("approveMessage"))}
                className="h-9 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Check className="size-4" />
                {t("approve")}
              </Button>
              <Button
                onClick={() =>
                  act("changes_requested", t("requestChangesMessage"))
                }
                variant="outline"
                className="h-9 gap-1.5 border-orange-500/40 text-orange-700 hover:bg-orange-500/10 dark:text-orange-300"
              >
                <AlertCircle className="size-4" />
                {t("requestChanges")}
              </Button>
              <Button
                onClick={() => act("rejected", t("rejectMessage"))}
                variant="outline"
                className="h-9 gap-1.5 border-rose-500/40 text-rose-700 hover:bg-rose-500/10 dark:text-rose-300"
              >
                <X className="size-4" />
                {t("reject")}
              </Button>
            </>
          )}
          {submission.status === "approved" && (
            <Button
              onClick={togglePublished}
              variant={submission.published ? "outline" : "default"}
              className={cn(
                "h-9 gap-1.5",
                submission.published
                  ? "border-amber-500/40 text-amber-700 hover:bg-amber-500/10 dark:text-amber-300"
                  : "bg-emerald-600 text-white hover:bg-emerald-700",
              )}
            >
              {submission.published ? (
                <>
                  <EyeOff className="size-4" />
                  {t("unpublish")}
                </>
              ) : (
                <>
                  <Eye className="size-4" />
                  {t("publish")}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="border-border bg-card lg:col-span-2 rounded-xl border p-6 dark:border-white/[0.12]">
          <div className="flex items-center justify-between">
            <h2 className="text-foreground text-xs font-semibold tracking-wide uppercase">
              {t("reviewLog")}
            </h2>
          </div>
          <ol className="mt-4 space-y-5">
            {submission.timeline.map((event, idx) => {
              const Icon = TIMELINE_ICONS[event.type];
              return (
                <li key={idx} className="relative flex gap-3 pb-1">
                  {idx < submission.timeline.length - 1 && (
                    <span
                      className="bg-border/60 absolute top-8 -bottom-2 left-[15px] w-px dark:bg-white/[0.10]"
                      aria-hidden
                    />
                  )}
                  <div
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full",
                      TIMELINE_COLORS[event.type],
                    )}
                  >
                    <Icon className="size-3.5" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1 pt-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-foreground text-sm font-medium">
                        {event.actor ?? "system"}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {fmtDateTime(event.at)}
                      </span>
                    </div>
                    {event.message && (
                      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                        {event.message}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="border-border/60 mt-6 space-y-3 border-t pt-5 dark:border-white/[0.08]">
            <Label htmlFor="admin-comment" className="text-xs">
              {t("addNote")}
            </Label>
            <Textarea
              id="admin-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("notePlaceholder")}
              rows={3}
            />
            <div className="flex justify-end">
              <Button
                onClick={submitComment}
                disabled={!comment.trim()}
                className="bg-foreground text-background hover:bg-foreground/90 h-9"
              >
                {t("submitNote")}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {submission.aiReview && (
            <div className="border-border bg-card rounded-xl border p-6 dark:border-white/[0.12]">
              <div className="flex items-center justify-between">
                <h2 className="text-foreground inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
                  <Wand2 className="size-3.5" />
                  {t("aiReviewResult")}
                </h2>
                <span className="text-muted-foreground text-[10px]">
                  {submission.aiReview.model}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold",
                      submission.aiReview.verdict === "approve"
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : submission.aiReview.verdict === "reject"
                          ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                          : submission.aiReview.verdict === "changes_requested"
                            ? "bg-orange-500/10 text-orange-700 dark:text-orange-300"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-300",
                    )}
                  >
                    {submission.aiReview.verdict.toUpperCase()}
                  </span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {t("confidence", { value: submission.aiReview.confidence })}
                  </span>
                  {submission.aiReview.applied && (
                    <span className="rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300">
                      {t("autoApplied")}
                    </span>
                  )}
                </div>
                <p className="text-foreground text-sm leading-relaxed">
                  {submission.aiReview.reasoning}
                </p>
              </div>
            </div>
          )}

          <div className="border-border bg-card rounded-xl border p-6 dark:border-white/[0.12]">
            <h2 className="text-foreground text-xs font-semibold tracking-wide uppercase">
              {t("description")}
            </h2>
            <p className="text-foreground mt-3 text-sm leading-relaxed">
              {pickLocale(submission.skill.longDescription, locale)}
            </p>
            {submission.skill.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {submission.skill.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-muted-foreground ring-foreground/10 rounded-sm px-2 py-0.5 text-xs ring-1 dark:ring-white/[0.12]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="border-border bg-card rounded-xl border p-6 dark:border-white/[0.12]">
            <h2 className="text-foreground text-xs font-semibold tracking-wide uppercase">
              {t("installCommand")}
            </h2>
            <div className="border-border bg-muted/40 mt-3 rounded-lg border px-3 py-2 dark:border-white/[0.12]">
              <code className="text-foreground font-[Menlo,monospace] text-xs">
                {submission.skill.install}
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
