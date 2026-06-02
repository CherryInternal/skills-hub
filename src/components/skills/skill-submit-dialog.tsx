"use client";

import { useState } from "react";
import Link from "next/link";
import {
  GitBranch,
  Send,
  ArrowRight,
  Check,
  ExternalLink,
  Rss,
  Upload,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  SKILL_DOMAINS,
  type Skill,
  type SkillCategory,
  type SkillDomain,
} from "./skills-data";
import { getGithubNewPrUrl, getGithubRepoUrl } from "./skills-storage";

interface SkillSubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    skill: Skill,
    options?: {
      githubPrUrl?: string;
      submissionType?: "self" | "subscription" | "upload";
    },
  ) => void;
}

type Mode = "chooser" | "github" | "form" | "subscribe";

const EMPTY_FORM = {
  name: "",
  category: "skill" as SkillCategory,
  domain: SKILL_DOMAINS[0] as SkillDomain,
  author: "",
  description: "",
  longDescription: "",
  install: "",
  docsUrl: "",
  githubRepoUrl: "",
};

const EMPTY_SUBSCRIBE = {
  sourceUrl: "",
  note: "",
};

const STEPS: Array<{ key: 1 | 2 | 3; label: string }> = [
  { key: 1, label: "Basics" },
  { key: 2, label: "Details" },
  { key: 3, label: "Install" },
];

function Req() {
  return <span className="text-rose-500">*</span>;
}

export function SkillSubmitDialog({
  open,
  onOpenChange,
  onSubmit,
}: SkillSubmitDialogProps) {
  const [mode, setMode] = useState<Mode>("chooser");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [subscribe, setSubscribe] = useState(EMPTY_SUBSCRIBE);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const set = <K extends keyof typeof EMPTY_FORM>(
    key: K,
    value: (typeof EMPTY_FORM)[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  const reset = () => {
    setForm(EMPTY_FORM);
    setSubscribe(EMPTY_SUBSCRIBE);
    setUploadedFile(null);
    setStep(1);
    setMode("chooser");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const canStep1 =
    form.name.trim().length > 0 && form.author.trim().length > 0;
  const canStep2 = form.description.trim().length > 0;
  const canStep3 =
    form.install.trim().length > 0 && form.docsUrl.trim().length > 0;

  const finalize = () => {
    const slug = form.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const skill: Skill = {
      id: `${slug || "untitled"}-${Date.now().toString(36)}`,
      name: form.name.trim(),
      category: form.category,
      domain: form.domain,
      author: form.author.trim(),
      version: "0.1.0",
      description: form.description.trim(),
      longDescription:
        form.longDescription.trim() || form.description.trim(),
      tags: [],
      installs: 0,
      rating: 0,
      install: form.install.trim(),
      docsUrl: form.docsUrl.trim(),
      githubRepoUrl: form.githubRepoUrl.trim() || undefined,
      uploadedFile: uploadedFile?.name,
      releaseDate: new Date().toISOString().slice(0, 10),
    };
    onSubmit(skill, {
      submissionType: uploadedFile ? "upload" : "self",
    });
    reset();
    onOpenChange(false);
  };

  const canSubscribe = (() => {
    const url = subscribe.sourceUrl.trim();
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  })();

  const finalizeSubscribe = () => {
    let parsedName = "subscription";
    try {
      const u = new URL(subscribe.sourceUrl.trim());
      parsedName = `${u.hostname}${u.pathname}`.replace(/\/$/, "");
    } catch {
      /* shouldn't reach here, canSubscribe ensures URL is valid */
    }
    const skill: Skill = {
      id: `sub-${Date.now().toString(36)}`,
      name: parsedName,
      category: "skill",
      domain: "Other",
      author: "subscription",
      version: "—",
      description:
        subscribe.note.trim() || `Subscription to ${subscribe.sourceUrl.trim()}`,
      longDescription:
        subscribe.note.trim() ||
        `Subscribes to all skills published at ${subscribe.sourceUrl.trim()}. Skills are auto-synced when the source updates.`,
      tags: ["subscription"],
      installs: 0,
      rating: 0,
      install: subscribe.sourceUrl.trim(),
      docsUrl: subscribe.sourceUrl.trim(),
      sourceUrl: subscribe.sourceUrl.trim(),
      releaseDate: new Date().toISOString().slice(0, 10),
    };
    onSubmit(skill, { submissionType: "subscription" });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        {mode === "chooser" && (
          <>
            <DialogHeader>
              <DialogTitle>Submit a skill</DialogTitle>
              <DialogDescription>
                Pick how you want to contribute. Both paths land in the same
                review queue.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => setMode("subscribe")}
                className="group border-border bg-card hover:border-foreground/40 flex items-start gap-3 rounded-xl border p-4 text-left transition-colors dark:border-white/[0.12]"
              >
                <div className="bg-muted text-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <Rss className="size-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <h3 className="text-foreground text-sm font-semibold tracking-tight">
                    Subscribe to a source
                  </h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Paste a GitHub / repo URL — all skills inside will be synced
                    into the marketplace automatically.
                  </p>
                </div>
                <ArrowRight className="text-muted-foreground/50 group-hover:text-foreground mt-1 size-4 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => setMode("form")}
                className="group border-border bg-card hover:border-foreground/40 flex items-start gap-3 rounded-xl border p-4 text-left transition-colors dark:border-white/[0.12]"
              >
                <div className="bg-muted text-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <Send className="size-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <h3 className="text-foreground text-sm font-semibold tracking-tight">
                    Submit your own skill
                  </h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Fill a short form, or upload a SKILL.md / archive. No
                    GitHub account required.
                  </p>
                </div>
                <ArrowRight className="text-muted-foreground/50 group-hover:text-foreground mt-1 size-4 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => setMode("github")}
                className="group border-border bg-card hover:border-foreground/40 flex items-start gap-3 rounded-xl border p-4 text-left transition-colors dark:border-white/[0.12]"
              >
                <div className="bg-muted text-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <GitBranch className="size-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <h3 className="text-foreground text-sm font-semibold tracking-tight">
                    Submit via GitHub PR
                  </h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Fork the marketplace repo and open a PR. For polished
                    open-source contributions.
                  </p>
                </div>
                <ArrowRight className="text-muted-foreground/50 group-hover:text-foreground mt-1 size-4 shrink-0" />
              </button>
            </div>
          </>
        )}

        {mode === "subscribe" && (
          <>
            <DialogHeader>
              <DialogTitle>Subscribe to a source</DialogTitle>
              <DialogDescription>
                Paste a GitHub / Gitee / Lark Wiki URL. Every skill inside will
                be synced and reviewed.
              </DialogDescription>
            </DialogHeader>

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (canSubscribe) finalizeSubscribe();
              }}
            >
              <div className="space-y-1.5">
                <Label
                  htmlFor="sub-url"
                  className="inline-flex items-center gap-1.5"
                >
                  <Rss className="size-3.5" />
                  Source URL <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="sub-url"
                  type="url"
                  value={subscribe.sourceUrl}
                  onChange={(e) =>
                    setSubscribe((s) => ({ ...s, sourceUrl: e.target.value }))
                  }
                  placeholder="https://github.com/owner/skills-repo"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sub-note">Note</Label>
                <Textarea
                  id="sub-note"
                  rows={3}
                  value={subscribe.note}
                  onChange={(e) =>
                    setSubscribe((s) => ({ ...s, note: e.target.value }))
                  }
                  placeholder="Why this source is worth syncing (visible to admin)."
                />
              </div>

              <div className="border-border bg-muted/30 text-muted-foreground rounded-md border p-3 text-xs dark:border-white/[0.10]">
                We poll the source every 6 hours. New skills enter the review
                queue automatically.
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setMode("chooser")}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={!canSubscribe}
                  className="bg-foreground text-background hover:bg-foreground/90"
                >
                  Subscribe
                </Button>
              </DialogFooter>
            </form>
          </>
        )}

        {mode === "github" && (
          <>
            <DialogHeader>
              <DialogTitle>Submit via GitHub</DialogTitle>
              <DialogDescription>
                Three steps. The PR is the single source of truth for your
                submission — everything happens in there.
              </DialogDescription>
            </DialogHeader>

            <ol className="space-y-3 text-sm">
              {[
                {
                  n: 1,
                  title: "Fork the marketplace repo",
                  body: (
                    <a
                      href={getGithubRepoUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground hover:text-foreground/80 inline-flex items-center gap-1 underline-offset-4 hover:underline"
                    >
                      {getGithubRepoUrl().replace("https://", "")}
                      <ExternalLink className="size-3.5" />
                    </a>
                  ),
                },
                {
                  n: 2,
                  title: "Add your skill files",
                  body: (
                    <span className="text-muted-foreground">
                      Copy{" "}
                      <code className="font-[Menlo,monospace] text-xs">
                        skills/_template/
                      </code>{" "}
                      to{" "}
                      <code className="font-[Menlo,monospace] text-xs">
                        skills/&lt;your-skill&gt;/
                      </code>{" "}
                      and fill in the manifest + README.
                    </span>
                  ),
                },
                {
                  n: 3,
                  title: "Open a PR",
                  body: (
                    <span className="text-muted-foreground">
                      Stale after 14 days without activity, closed after 21
                      days. Once merged, your skill is auto-published to the
                      marketplace.
                    </span>
                  ),
                },
              ].map(({ n, title, body }) => (
                <li key={n} className="flex gap-3">
                  <span className="bg-muted text-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                    {n}
                  </span>
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-foreground font-medium">{title}</p>
                    <div className="text-sm">{body}</div>
                  </div>
                </li>
              ))}
            </ol>

            <p className="text-muted-foreground border-border bg-muted/30 rounded-md border p-3 text-xs dark:border-white/[0.10]">
              Want us to track your PR here? Paste the PR URL after you open it
              under <strong>Quick submit → step 3</strong> and we'll keep it in
              your submissions dashboard.
            </p>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMode("chooser")}
              >
                Back
              </Button>
              <a
                href={getGithubNewPrUrl(form.name || "new-skill")}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-foreground text-background hover:bg-foreground/90 inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium"
              >
                <GitBranch className="size-4" />
                Open GitHub
              </a>
            </DialogFooter>
          </>
        )}

        {mode === "form" && (
          <>
            <DialogHeader>
              <DialogTitle>
                Quick submit · {STEPS[step - 1]!.label}
              </DialogTitle>
            </DialogHeader>

            <div className="flex items-center gap-2">
              {STEPS.map(({ key, label }) => (
                <div key={key} className="flex flex-1 items-center gap-2">
                  <div
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      step > key
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : step === key
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {step > key ? <Check className="size-3.5" /> : key}
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      step >= key ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {label}
                  </span>
                  {key < 3 && (
                    <div className="bg-border/60 h-px flex-1 dark:bg-white/[0.10]" />
                  )}
                </div>
              ))}
            </div>

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (step === 1 && canStep1) setStep(2);
                else if (step === 2 && canStep2) setStep(3);
                else if (step === 3 && canStep3) finalize();
              }}
            >
              {step === 1 && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="skill-name">
                      Name <Req />
                    </Label>
                    <Input
                      id="skill-name"
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder="Diff Reviewer"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="skill-author">
                      Author <Req />
                    </Label>
                    <Input
                      id="skill-author"
                      value={form.author}
                      onChange={(e) => set("author", e.target.value)}
                      placeholder="Your name or organization"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>
                        Type <Req />
                      </Label>
                      <Select
                        value={form.category}
                        onValueChange={(v) =>
                          set("category", v as SkillCategory)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="skill">Skill</SelectItem>
                          <SelectItem value="cli">CLI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>
                        Domain <Req />
                      </Label>
                      <Select
                        value={form.domain}
                        onValueChange={(v) => set("domain", v as SkillDomain)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SKILL_DOMAINS.map((d) => (
                            <SelectItem key={d} value={d}>
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="skill-desc">
                      Short description <Req />
                    </Label>
                    <Input
                      id="skill-desc"
                      value={form.description}
                      onChange={(e) => set("description", e.target.value)}
                      placeholder="One-line pitch shown on the card"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="skill-long">Long description</Label>
                    <Textarea
                      id="skill-long"
                      value={form.longDescription}
                      onChange={(e) =>
                        set("longDescription", e.target.value)
                      }
                      placeholder="What it does, when to use it, what makes it stand out."
                      rows={5}
                    />
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="skill-install">
                      Install command <Req />
                    </Label>
                    <Input
                      id="skill-install"
                      value={form.install}
                      onChange={(e) => set("install", e.target.value)}
                      placeholder="npm i -g your-tool"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="skill-docs">
                      Docs URL <Req />
                    </Label>
                    <Input
                      id="skill-docs"
                      type="url"
                      value={form.docsUrl}
                      onChange={(e) => set("docsUrl", e.target.value)}
                      placeholder="https://docs..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="skill-gh"
                      className="inline-flex items-center gap-1.5"
                    >
                      <GitBranch className="size-3.5" />
                      GitHub repo
                    </Label>
                    <Input
                      id="skill-gh"
                      type="url"
                      value={form.githubRepoUrl}
                      onChange={(e) => set("githubRepoUrl", e.target.value)}
                      placeholder="https://github.com/owner/repo"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="skill-file"
                      className="inline-flex items-center gap-1.5"
                    >
                      <Upload className="size-3.5" />
                      Upload skill files
                    </Label>
                    {uploadedFile ? (
                      <div className="border-border bg-muted/30 flex items-center gap-2 rounded-md border px-3 py-2 dark:border-white/[0.10]">
                        <Upload className="text-muted-foreground size-3.5 shrink-0" />
                        <span className="text-foreground truncate text-xs font-[Menlo,monospace]">
                          {uploadedFile.name}
                        </span>
                        <span className="text-muted-foreground/60 ml-auto shrink-0 text-[10px] tabular-nums">
                          {Math.round(uploadedFile.size / 1024)} KB
                        </span>
                        <button
                          type="button"
                          onClick={() => setUploadedFile(null)}
                          className="hover:bg-accent text-muted-foreground hover:text-foreground rounded p-1"
                          aria-label="Remove file"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label
                        htmlFor="skill-file"
                        className="border-border bg-muted/20 hover:bg-muted/40 text-muted-foreground flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed px-3 py-4 text-xs dark:border-white/[0.15]"
                      >
                        <Upload className="size-3.5" />
                        Drop a .md / .zip / .tar.gz file, or click to choose
                        <input
                          id="skill-file"
                          type="file"
                          accept=".md,.zip,.tar,.tgz,.tar.gz,application/zip,application/x-tar,application/gzip,text/markdown"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) setUploadedFile(f);
                          }}
                        />
                      </label>
                    )}
                  </div>
                </>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    step === 1 ? setMode("chooser") : setStep(((step - 1) as 1 | 2))
                  }
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="bg-foreground text-background hover:bg-foreground/90"
                  disabled={
                    (step === 1 && !canStep1) ||
                    (step === 2 && !canStep2) ||
                    (step === 3 && !canStep3)
                  }
                >
                  {step < 3 ? "Continue" : "Submit for review"}
                </Button>
              </DialogFooter>
            </form>

            <div className="border-border/60 mt-1 border-t pt-3 text-center text-xs dark:border-white/[0.10]">
              <Link
                href="/submissions"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => onOpenChange(false)}
              >
                See your submissions →
              </Link>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
