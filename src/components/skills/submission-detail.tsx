"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { Section } from "@/components/ui/section";
import { cn } from "@/lib/utils";
import {
  loadSubmissions,
  statusProgress,
  type TimelineEvent,
  type UserSubmission,
} from "./skills-storage";
import { StatusBadge } from "./status-badge";
import { pickLocale } from "./skills-data";
import { useLocale } from "next-intl";

const TIMELINE_ICONS: Record<TimelineEvent["type"], typeof Clock> = {
  submitted: Send,
  assigned: Eye,
  comment: MessageSquare,
  changes_requested: AlertCircle,
  approved: CheckCircle2,
  rejected: XCircle,
  ai_review: FileText,
  published: CheckCircle2,
  unpublished: XCircle,
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
  unpublished: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
};

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SubmissionDetail({
  submissionId,
}: {
  submissionId: string;
}) {
  const locale = useLocale();
  const [submission, setSubmission] = useState<UserSubmission | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = () => {
      const all = loadSubmissions();
      const found = all.find((s) => s.skill.id === submissionId);
      if (!found) {
        setNotFound(true);
        setSubmission(null);
        return;
      }
      setNotFound(false);
      setSubmission(found);
    };
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [submissionId]);

  if (notFound) {
    return (
      <Section className="px-6 !py-16 sm:px-8">
        <div className="max-w-container mx-auto flex flex-col items-center gap-4 py-20 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Submission not found
          </h1>
          <p className="text-muted-foreground text-sm">
            This submission may have been deleted, or it lives on another
            device.
          </p>
          <Link
            href="/my-submissions"
            className="text-foreground hover:text-foreground/80 mt-2 inline-flex items-center gap-1 text-sm font-medium"
          >
            <ArrowLeft className="size-3.5" />
            Back to submissions
          </Link>
        </div>
      </Section>
    );
  }

  if (!submission) {
    return (
      <Section className="px-6 !py-16 sm:px-8">
        <div className="max-w-container mx-auto py-20" />
      </Section>
    );
  }

  const progress = statusProgress(submission.status);

  return (
    <Section className="px-6 !py-16 sm:px-8">
      <div className="max-w-container mx-auto flex flex-col gap-6 sm:gap-8">
        <Link
          href="/my-submissions"
          className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-xs"
        >
          <ArrowLeft className="size-3" />
          Back to submissions
        </Link>

        <div className="border-border bg-card flex flex-col gap-5 rounded-xl border p-6 dark:border-white/[0.12]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2">
                <h1 className="text-foreground truncate text-xl font-semibold tracking-tight">
                  {pickLocale(submission.skill.name, locale)}
                </h1>
                <StatusBadge status={submission.status} size="sm" />
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
                  Submitted {fmtDateTime(submission.submittedAt)}
                </span>
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
                  <ExternalLink className="size-3" />
                </a>
              )}
              <a
                href={submission.skill.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="border-input hover:bg-muted/60 inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium"
              >
                <FileText className="size-4" />
                Docs
                <ExternalLink className="size-3" />
              </a>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">
                Review progress
              </span>
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
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="border-border bg-card lg:col-span-2 rounded-xl border p-6 dark:border-white/[0.12]">
            <h2 className="text-foreground text-xs font-semibold tracking-wide uppercase">
              Timeline
            </h2>
            <ol className="mt-4 space-y-5">
              {submission.timeline.map((event, idx) => {
                const Icon = TIMELINE_ICONS[event.type];
                return (
                  <li key={idx} className="relative flex gap-3 pb-1">
                    {idx < submission.timeline.length - 1 && (
                      <span
                        className="bg-border/60 absolute left-[15px] top-8 -bottom-2 w-px dark:bg-white/[0.10]"
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
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
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
          </div>

          <div className="space-y-4">
            <div className="border-border bg-card rounded-xl border p-6 dark:border-white/[0.12]">
              <h2 className="text-foreground text-xs font-semibold tracking-wide uppercase">
                About
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
                Install
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
    </Section>
  );
}
