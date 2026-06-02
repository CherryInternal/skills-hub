export type SkillSource = "curated" | "third_party";

export const SKILL_DOMAINS = [
  "AI & Agents",
  "Productivity",
  "Developer Tools",
  "Design",
  "Data & Analytics",
  "Communication",
  "Documentation",
  "Automation",
  "Other",
] as const;

export type SkillDomain = (typeof SKILL_DOMAINS)[number];

// ─── Localization ──────────────────────────────────────────────
// Skill content fields accept either a plain string (English only) OR a map
// of locale -> translation. `pickLocale()` resolves with English fallback.
export type LocalizedString = string | { en: string; zh?: string };

export function pickLocale(value: LocalizedString | undefined, locale: string): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (locale === "zh" && value.zh) return value.zh;
  return value.en;
}

export interface Skill {
  id: string;
  name: LocalizedString;
  domain: SkillDomain;
  author: string;
  version: string;
  description: LocalizedString;
  longDescription: LocalizedString;
  tags: string[];
  installs: number;
  rating: number;
  install: string;
  docsUrl: string;
  homepage?: string;
  githubRepoUrl?: string;
  sourceUrl?: string;
  uploadedFile?: string;
  releaseDate: string;
  source?: SkillSource;
  sourceFeed?: string;
  // Multi-source aggregation: when a skill is found in N third-party feeds,
  // we merge them and list all here. The first entry is `sourceFeed`.
  feeds?: string[];
  // Last time this skill was refreshed by the feed-sync job.
  lastSyncedAt?: string;
}

// ─── Domain labels (i18n) ──────────────────────────────────────
// Mapping used by UI to render localized domain names. Kept here so any
// new domain auto-shows up — translations can be added under each key.
export const DOMAIN_LABELS: Record<SkillDomain, { en: string; zh: string }> = {
  "AI & Agents": { en: "AI & Agents", zh: "AI 与智能体" },
  Productivity: { en: "Productivity", zh: "效率工具" },
  "Developer Tools": { en: "Developer Tools", zh: "开发者工具" },
  Design: { en: "Design", zh: "设计" },
  "Data & Analytics": { en: "Data & Analytics", zh: "数据与分析" },
  Communication: { en: "Communication", zh: "通讯协作" },
  Documentation: { en: "Documentation", zh: "文档" },
  Automation: { en: "Automation", zh: "自动化" },
  Other: { en: "Other", zh: "其他" },
};

export function pickDomainLabel(domain: SkillDomain, locale: string): string {
  const entry = DOMAIN_LABELS[domain];
  return locale === "zh" ? entry.zh : entry.en;
}

export const SKILLS: Skill[] = [
  {
    id: "loupe-annotator",
    name: "Loupe Annotator",
    domain: "Developer Tools",
    author: "SiinXu",
    version: "0.2.0",
    description: "Inspect, annotate and fix any web UI element with AI.",
    longDescription:
      "Loupe lets you click any DOM element in your dev app, attach a quick note, and copy a structured prompt to your clipboard for Claude/Codex to fix. Ships as a browser extension or a drop-in SDK for any web renderer.",
    tags: ["UI", "DevTools", "AI Prompt"],
    installs: 1284,
    rating: 4.9,
    install: "pnpm add -D @loupe/dev-annotator",
    docsUrl: "https://github.com/SiinXu/loupe",
    homepage: "https://github.com/SiinXu/loupe",
    releaseDate: "2026-05-10",
  },
  {
    id: "prd-creator",
    name: "PRD Creator",
    domain: "Productivity",
    author: "CherryIN",
    version: "1.4.2",
    description: "Bilingual PRD drafting workflow for product features.",
    longDescription:
      "Turns rough requirements into a bilingual (zh/en) PRD with Background / Goal / Spec / Verification sections, then opens a GitHub issue after explicit user approval.",
    tags: ["PM", "Workflow", "Bilingual"],
    installs: 3120,
    rating: 4.8,
    install: "claude skill install prd-creator",
    docsUrl: "https://docs.cherryin.ai/skills/prd-creator",
    releaseDate: "2026-04-22",
  },
  {
    id: "data-analyst",
    name: "Data Analyst",
    domain: "Data & Analytics",
    author: "CherryIN",
    version: "2.1.0",
    description: "Auto-analyze any tabular data into interactive HTML reports.",
    longDescription:
      "Reads any CSV, detects columns, generates Plotly charts and editorial-quality HTML reports with insights and recommendations. Multilingual.",
    tags: ["Data", "Analytics", "Plotly"],
    installs: 8741,
    rating: 4.7,
    install: "claude skill install data-analyst",
    docsUrl: "https://docs.cherryin.ai/skills/data-analyst",
    releaseDate: "2026-03-14",
  },
  {
    id: "web-designer",
    name: "Web Designer",
    domain: "Design",
    author: "CherryIN",
    version: "0.9.0",
    description:
      "Generate production-ready React pages with shadcn + Aceternity.",
    longDescription:
      "Landing pages, SaaS pages, portfolios — multi-library composition with shadcn/ui, Aceternity UI, Magic UI, Launch UI, 21st.dev. Includes i18n and responsive presets.",
    tags: ["UI", "React", "Landing Page"],
    installs: 5602,
    rating: 4.6,
    install: "claude skill install web-designer",
    docsUrl: "https://docs.cherryin.ai/skills/web-designer",
    releaseDate: "2026-05-02",
  },
  {
    id: "art-director",
    name: "Art Director",
    domain: "Design",
    author: "CherryIN",
    version: "1.1.0",
    description: "Craft high-quality AI image prompts for any generator.",
    longDescription:
      "Generates editorial-grade prompts for Midjourney, DALL-E, Flux, SD. Also analyzes a reference image to extract its visual DNA into a reusable prompt.",
    tags: ["AI Image", "Prompt", "Design"],
    installs: 2381,
    rating: 4.5,
    install: "claude skill install art-director",
    docsUrl: "https://docs.cherryin.ai/skills/art-director",
    releaseDate: "2026-02-18",
  },
  {
    id: "speed-reader",
    name: "Speed Reader",
    domain: "Productivity",
    author: "CherryIN",
    version: "0.7.0",
    description: "Deep book breakdowns, golden quotes, mind maps and more.",
    longDescription:
      "Speed-read a book or PDF: extract core ideas, golden quotes, knowledge cards, memory plans, dialectical synthesis, decision checklists and more.",
    tags: ["Reading", "Knowledge", "Memory"],
    installs: 1502,
    rating: 4.4,
    install: "claude skill install speed-reader",
    docsUrl: "https://docs.cherryin.ai/skills/speed-reader",
    releaseDate: "2026-01-09",
  },
  {
    id: "transcript-to-content",
    name: "Transcript to Content",
    domain: "Productivity",
    author: "CherryIN",
    version: "1.2.0",
    description:
      "Turn transcripts into multiple social posts or a long-form article.",
    longDescription:
      "Transform a recording/conversation/transcript into 2–15 ready-to-publish social posts, OR a long-form article. Learns style from your published content.",
    tags: ["Content", "Writing", "Social"],
    installs: 1932,
    rating: 4.5,
    install: "claude skill install transcript-to-content",
    docsUrl: "https://docs.cherryin.ai/skills/transcript-to-content",
    releaseDate: "2026-04-12",
  },
  {
    id: "enterprise-prd",
    name: "Enterprise PRD",
    domain: "Documentation",
    author: "CherryIN",
    version: "0.8.0",
    description: "AI-readable PRDs with backend, frontend and test sections.",
    longDescription:
      "Reads the codebase, then writes detailed enterprise-grade PRDs covering backend APIs, frontend UI and test cases. Outputs to Feishu doc with whiteboards.",
    tags: ["PRD", "Enterprise", "Spec"],
    installs: 870,
    rating: 4.3,
    install: "claude skill install enterprise-prd",
    docsUrl: "https://docs.cherryin.ai/skills/enterprise-prd",
    releaseDate: "2026-03-28",
  },
  {
    id: "claude-api",
    name: "Claude API Helper",
    domain: "AI & Agents",
    author: "Anthropic",
    version: "0.5.0",
    description: "Build, debug and optimize Anthropic SDK apps with caching.",
    longDescription:
      "Adds prompt caching, migrates Claude code between versions, optimizes cache hit rate, and applies best practices for agents, batch, files and citations.",
    tags: ["Claude", "SDK", "Caching"],
    installs: 4310,
    rating: 4.7,
    install: "claude skill install claude-api",
    docsUrl: "https://docs.anthropic.com/skills/claude-api",
    releaseDate: "2026-04-18",
  },
  {
    id: "magazine-web-ppt",
    name: "Magazine Web PPT",
    domain: "Design",
    author: "CherryIN",
    version: "0.6.0",
    description: "Editorial 'magazine × e-ink' horizontal-swipe HTML deck.",
    longDescription:
      "Generates a single-HTML web slide deck with WebGL fluid background, serif headings, chapter covers, data spreads and photo grids — perfect for product launches.",
    tags: ["Slides", "HTML", "Magazine"],
    installs: 612,
    rating: 4.6,
    install: "claude skill install magazine-web-ppt",
    docsUrl: "https://docs.cherryin.ai/skills/magazine-web-ppt",
    releaseDate: "2026-05-08",
  },
  {
    id: "repo-onboard",
    name: "Repo Onboard",
    domain: "Developer Tools",
    author: "CherryIN",
    version: "1.0.0",
    description: "Quickly internalize a new codebase in 16 phases.",
    longDescription:
      "Reads a repo (URL or local path), produces 16 onboarding phases: architecture, conventions, hot zones, mental model, features, scenarios, peer comparison, business angles.",
    tags: ["Onboarding", "Codebase", "Mental Model"],
    installs: 2204,
    rating: 4.5,
    install: "claude skill install repo-onboard",
    docsUrl: "https://docs.cherryin.ai/skills/repo-onboard",
    releaseDate: "2026-03-02",
  },
  {
    id: "cherry-ui-review",
    name: "Cherry UI Review",
    domain: "Design",
    author: "CherryIN",
    version: "0.4.0",
    description: "Page-to-page UI consistency & code quality audit.",
    longDescription:
      "Checks visual style consistency across pages (font / color / spacing / interactions), component reuse, Props interface alignment, type conventions and API contract consistency.",
    tags: ["UI Audit", "Consistency", "Review"],
    installs: 489,
    rating: 4.4,
    install: "claude skill install cherry-ui-review",
    docsUrl: "https://docs.cherryin.ai/skills/cherry-ui-review",
    releaseDate: "2026-05-12",
  },
  {
    id: "cherryin-cli",
    name: "CherryIN CLI",
    domain: "Developer Tools",
    author: "CherryIN",
    version: "0.5.3",
    description: "Official CLI to manage CherryIN API keys, usage and billing.",
    longDescription:
      "Manage API keys, top-up balance, monitor usage and stream logs from the terminal. Bash/Zsh/Fish completions included.",
    tags: ["CLI", "API", "DevOps"],
    installs: 6210,
    rating: 4.7,
    install: "brew install cherryin-cli",
    docsUrl: "https://docs.cherryin.ai/cli",
    releaseDate: "2026-05-15",
  },
  {
    id: "lark-cli",
    name: "Lark CLI",
    domain: "Communication",
    author: "CherryIN",
    version: "1.8.0",
    description: "Feishu / Lark CLI: messaging, docs, base, calendar, minutes.",
    longDescription:
      "End-to-end CLI wrapper around Lark OpenAPI: send messages, read docs, manage Base records, schedule events, fetch meeting minutes. Designed for AI agents.",
    tags: ["CLI", "Lark", "Automation"],
    installs: 4498,
    rating: 4.6,
    install: "npm i -g @cherryin/lark-cli",
    docsUrl: "https://docs.cherryin.ai/lark-cli",
    releaseDate: "2026-04-30",
  },
  {
    id: "claude-code-setup",
    name: "Claude Code Setup",
    domain: "AI & Agents",
    author: "Anthropic",
    version: "0.3.1",
    description: "Recommend hooks, subagents, skills and plugins for a project.",
    longDescription:
      "Scans your repo and recommends the Claude Code automation surface that fits — hooks, subagents, skills, MCP servers and plugins. Outputs a settings.json patch.",
    tags: ["CLI", "Claude Code", "Setup"],
    installs: 2117,
    rating: 4.5,
    install: "npx claude-code-setup",
    docsUrl: "https://docs.anthropic.com/claude-code/setup",
    releaseDate: "2026-04-05",
  },
  {
    id: "lark-base-cli",
    name: "Lark Base CLI",
    domain: "Data & Analytics",
    author: "CherryIN",
    version: "0.9.0",
    description: "Read, write and design Feishu Base from the terminal.",
    longDescription:
      "Search Bases, create tables, manage fields/records, design formula columns and cross-table calculations, share view links and run analytics queries.",
    tags: ["CLI", "Base", "Data"],
    installs: 1408,
    rating: 4.5,
    install: "npm i -g @cherryin/lark-base-cli",
    docsUrl: "https://docs.cherryin.ai/lark-base-cli",
    releaseDate: "2026-04-20",
  },
  {
    id: "schedule-runner",
    name: "Schedule Runner",
    domain: "Automation",
    author: "CherryIN",
    version: "0.2.0",
    description: "Cron-style scheduler for Claude Code routines.",
    longDescription:
      "Create, update, list and run scheduled remote Claude Code routines on a cron schedule or once at a specific time. Slack-friendly status reports.",
    tags: ["Cron", "Automation", "Scheduling"],
    installs: 743,
    rating: 4.3,
    install: "npm i -g @cherryin/schedule-runner",
    docsUrl: "https://docs.cherryin.ai/schedule-runner",
    releaseDate: "2026-04-09",
  },

  // ─── AI & Agents ──────────────────────────────────────────────
  {
    id: "agent-trace",
    name: "Agent Trace",
    domain: "AI & Agents",
    author: "linw_ai",
    version: "0.3.1",
    description: "Visualize and replay any agent's tool-call trace.",
    longDescription:
      "Drop into Claude Agent SDK or OpenAI Agents to capture every tool call, message and intermediate state. Outputs an interactive HTML timeline you can scrub.",
    tags: ["Agents", "Debugging", "Observability"],
    installs: 12_840,
    rating: 4.8,
    install: "npm i -g @linw/agent-trace",
    docsUrl: "https://agent-trace.dev/docs",
    githubRepoUrl: "https://github.com/linw-ai/agent-trace",
    releaseDate: "2026-05-04",
  },
  {
    id: "mcp-doctor",
    name: "MCP Doctor",
    domain: "AI & Agents",
    author: "kazuya.matsui",
    version: "1.0.0",
    description: "Diagnose broken MCP servers in 10 seconds.",
    longDescription:
      "Probes connection, schema, auth, transport latency and tool surface coverage. Generates a redacted bug report you can paste to the maintainer.",
    tags: ["MCP", "Debugging", "Diagnostics"],
    installs: 6_321,
    rating: 4.7,
    install: "npx mcp-doctor scan",
    docsUrl: "https://github.com/kazuya/mcp-doctor#readme",
    githubRepoUrl: "https://github.com/kazuya/mcp-doctor",
    releaseDate: "2026-04-26",
  },
  {
    id: "prompt-shield",
    name: "Prompt Shield",
    domain: "AI & Agents",
    author: "OpenRail",
    version: "0.7.4",
    description: "Detect prompt-injection in tool outputs before the agent sees them.",
    longDescription:
      "Wraps any agent SDK with a guard layer that scans incoming web/file contents for injection signatures. Configurable allow/block lists and a Claude-powered second-opinion mode.",
    tags: ["Security", "Guardrails", "RAG"],
    installs: 3_990,
    rating: 4.4,
    install: "pip install prompt-shield",
    docsUrl: "https://openrail.ai/docs/prompt-shield",
    githubRepoUrl: "https://github.com/openrail/prompt-shield",
    releaseDate: "2026-03-30",
  },
  {
    id: "context-trim",
    name: "Context Trim",
    domain: "AI & Agents",
    author: "rui.huang",
    version: "0.5.2",
    description: "Squeeze prompts to fit the cache window without losing signal.",
    longDescription:
      "Analyzes a multi-turn conversation, identifies cache-eligible segments and reorders content for maximum Claude prompt-cache hit rate. Reports estimated token savings.",
    tags: ["Caching", "Tokens", "Cost"],
    installs: 9_410,
    rating: 4.6,
    install: "claude skill install context-trim",
    docsUrl: "https://docs.cherryin.ai/skills/context-trim",
    githubRepoUrl: "https://github.com/cherryinternal/context-trim",
    releaseDate: "2026-05-18",
  },
  {
    id: "agentkit-templates",
    name: "AgentKit Templates",
    domain: "AI & Agents",
    author: "Anthropic",
    version: "2.0.0",
    description: "10 production agent patterns, scaffolded in one command.",
    longDescription:
      "Includes ReAct, Reflexion, plan-and-execute, multi-agent orchestrator, RAG-with-citations, and a customer-support template — each with eval harness and tracing baked in.",
    tags: ["Templates", "ReAct", "RAG"],
    installs: 27_104,
    rating: 4.9,
    install: "npx @anthropic/agentkit init",
    docsUrl: "https://docs.anthropic.com/agentkit",
    githubRepoUrl: "https://github.com/anthropics/agentkit",
    releaseDate: "2026-05-01",
  },

  // ─── Productivity ─────────────────────────────────────────────
  {
    id: "inbox-zero",
    name: "Inbox Zero",
    domain: "Productivity",
    author: "morgan.chen",
    version: "0.4.0",
    description: "Triage Gmail and Lark mail with one shortcut.",
    longDescription:
      "Sorts inbox by intent (FYI / action-required / waiting-on-others / archive-now), drafts polite responses, and queues follow-ups in your task manager.",
    tags: ["Email", "GTD", "Triage"],
    installs: 5_704,
    rating: 4.5,
    install: "claude skill install inbox-zero",
    docsUrl: "https://docs.cherryin.ai/skills/inbox-zero",
    releaseDate: "2026-04-19",
  },
  {
    id: "standup-bot",
    name: "Standup Bot",
    domain: "Productivity",
    author: "jamie.park",
    version: "1.2.0",
    description: "Generate honest daily standups from your git + calendar.",
    longDescription:
      "Reads git activity, Lark calendar, Linear tickets and posts a 3-line standup to your team channel. Knows the difference between 'pushed code' and 'made progress'.",
    tags: ["Standup", "Async", "Team"],
    installs: 18_223,
    rating: 4.8,
    install: "npm i -g standup-bot",
    docsUrl: "https://standupbot.dev",
    githubRepoUrl: "https://github.com/jpark/standup-bot",
    releaseDate: "2026-03-21",
  },
  {
    id: "weekly-review",
    name: "Weekly Review",
    domain: "Productivity",
    author: "ana.silva",
    version: "0.2.0",
    description: "Auto-compile a Friday weekly review from all your tools.",
    longDescription:
      "Pulls Linear closed tickets, GitHub merged PRs, Lark meeting notes, calendar focus blocks, and writes a single bilingual weekly review for self-reflection or manager.",
    tags: ["Review", "Reflection", "Manager"],
    installs: 2_410,
    rating: 4.4,
    install: "claude skill install weekly-review",
    docsUrl: "https://anasilva.dev/weekly-review",
    githubRepoUrl: "https://github.com/anasilva/weekly-review",
    releaseDate: "2026-04-02",
  },
  {
    id: "focus-timer",
    name: "Focus Timer",
    domain: "Productivity",
    author: "ricky_zhou",
    version: "0.9.0",
    description: "Pomodoro CLI with Slack DND + Lark Do-Not-Disturb sync.",
    longDescription:
      "Start a focus block from the terminal, auto-flips Slack and Lark to DND, mutes notifications, logs the session to your daily journal afterwards.",
    tags: ["Pomodoro", "Focus", "Do Not Disturb"],
    installs: 7_840,
    rating: 4.6,
    install: "brew install focus-timer",
    docsUrl: "https://github.com/ricky-zhou/focus-timer#readme",
    githubRepoUrl: "https://github.com/ricky-zhou/focus-timer",
    releaseDate: "2026-02-08",
  },

  // ─── Developer Tools ──────────────────────────────────────────
  {
    id: "diff-reviewer",
    name: { en: "Diff Reviewer", zh: "Diff 评审员" },
    domain: "Developer Tools",
    author: "CherryIN",
    version: "1.3.0",
    description: {
      en: "AI code review on the changed lines, before you push.",
      zh: "在 git push 之前，针对本次 diff 的改动行做 AI 代码评审。",
    },
    longDescription: {
      en: "Runs as a pre-push hook. Comments inline on changed lines with severity ratings and suggested patches. Skips boilerplate. Caches reviews per commit hash.",
      zh: "作为 pre-push hook 运行。直接在改动行打评论，给出严重程度评分和建议补丁。自动跳过样板代码。按 commit hash 缓存评审结果。",
    },
    tags: ["Code Review", "Hooks", "Pre-push"],
    installs: 42_310,
    rating: 4.9,
    install: "claude skill install diff-reviewer",
    docsUrl: "https://docs.cherryin.ai/skills/diff-reviewer",
    githubRepoUrl: "https://github.com/cherryinternal/diff-reviewer",
    releaseDate: "2026-05-16",
  },
  {
    id: "type-fix",
    name: "Type Fix",
    domain: "Developer Tools",
    author: "lin.f",
    version: "0.6.0",
    description: "Resolve every TS error in your repo, with explanations.",
    longDescription:
      "Iterates over tsc errors, classifies each (true bug / mis-typed import / library quirk), proposes the minimum fix, runs tsc again. Refuses to suppress errors with any/@ts-ignore.",
    tags: ["TypeScript", "Refactor", "Errors"],
    installs: 11_530,
    rating: 4.7,
    install: "npx type-fix",
    docsUrl: "https://github.com/lin-f/type-fix#readme",
    githubRepoUrl: "https://github.com/lin-f/type-fix",
    releaseDate: "2026-04-11",
  },
  {
    id: "gh-pr-skim",
    name: "GH PR Skim",
    domain: "Developer Tools",
    author: "tarek_b",
    version: "0.3.0",
    description: "Hide the noise from large PRs and surface what matters.",
    longDescription:
      "Collapses lockfiles, snapshots, generated code and untouched comments; highlights novel control flow and type changes. 30-second skim instead of 30-minute scroll.",
    tags: ["PR", "Code Review", "GitHub"],
    installs: 4_122,
    rating: 4.5,
    install: "brew install gh-pr-skim",
    docsUrl: "https://github.com/tarek-b/gh-pr-skim",
    githubRepoUrl: "https://github.com/tarek-b/gh-pr-skim",
    releaseDate: "2026-03-04",
  },
  {
    id: "test-coverage-coach",
    name: "Test Coverage Coach",
    domain: "Developer Tools",
    author: "elena.kov",
    version: "0.5.0",
    description: "Suggest tests for the riskiest uncovered branches.",
    longDescription:
      "Reads coverage report and source, ranks uncovered branches by risk (complexity * blame age * change frequency), drafts test cases you can accept or amend.",
    tags: ["Testing", "Coverage", "Risk"],
    installs: 2_870,
    rating: 4.5,
    install: "pip install test-coverage-coach",
    docsUrl: "https://github.com/elenakov/coverage-coach",
    githubRepoUrl: "https://github.com/elenakov/coverage-coach",
    releaseDate: "2026-02-22",
  },
  {
    id: "env-diff",
    name: "Env Diff",
    domain: "Developer Tools",
    author: "huang.q",
    version: "0.4.1",
    description: "Diff .env files across dev/staging/prod safely.",
    longDescription:
      "Shows which keys are present where, redacts values by default, flags potentially sensitive keys, generates a Lark-friendly summary for SRE handoff.",
    tags: ["Env", "Config", "SRE"],
    installs: 6_980,
    rating: 4.4,
    install: "go install github.com/huangq/env-diff@latest",
    docsUrl: "https://github.com/huangq/env-diff",
    githubRepoUrl: "https://github.com/huangq/env-diff",
    releaseDate: "2026-01-31",
  },
  {
    id: "perf-budget",
    name: "Perf Budget",
    domain: "Developer Tools",
    author: "Anthropic",
    version: "0.8.0",
    description: "Track web-vitals budgets per route and block regressions.",
    longDescription:
      "Defines per-route LCP/INP/CLS targets, runs Lighthouse in CI, comments on PRs that worsen any metric. Plays nicely with Next.js standalone builds.",
    tags: ["Performance", "Web Vitals", "CI"],
    installs: 8_204,
    rating: 4.6,
    install: "npm i -D perf-budget",
    docsUrl: "https://docs.anthropic.com/perf-budget",
    githubRepoUrl: "https://github.com/anthropics/perf-budget",
    releaseDate: "2026-04-28",
  },

  // ─── Design ───────────────────────────────────────────────────
  {
    id: "frontend-design",
    name: { en: "Frontend Design", zh: "前端设计" },
    domain: "Design",
    author: "Anthropic",
    version: "1.6.0",
    description: {
      en: "Anti-AI-slop UI guidance for production components.",
      zh: "反 AI 流水线审美的生产级 UI 设计指南。",
    },
    longDescription: {
      en: "Forces a clear design direction with distinctive typography, creative layouts, and contextual visual effects. Outputs working React or HTML/CSS rather than mood boards.",
      zh: "强制选定一个明确的设计方向，包含独特字体、创意排版与上下文视觉效果。直接输出可运行的 React 或 HTML/CSS，而不是只给灵感板。",
    },
    tags: ["UI", "Anti-Slop", "Design System"],
    installs: 277_410,
    rating: 4.9,
    install: "claude skill install frontend-design",
    docsUrl: "https://docs.anthropic.com/skills/frontend-design",
    githubRepoUrl: "https://github.com/anthropics/skills",
    releaseDate: "2026-04-17",
  },
  {
    id: "icon-finder",
    name: "Icon Finder",
    domain: "Design",
    author: "sora.kim",
    version: "0.3.0",
    description: "Search 50k+ icons by intent and paste the JSX.",
    longDescription:
      "Describe what you want ('warning sign for delete action, outlined, 16px') and get a curated list across Lucide, Phosphor, Tabler, Iconify — copies JSX with correct strokeWidth and size.",
    tags: ["Icons", "Lucide", "Phosphor"],
    installs: 14_220,
    rating: 4.7,
    install: "npx icon-finder",
    docsUrl: "https://iconfinder.app",
    githubRepoUrl: "https://github.com/sora-kim/icon-finder",
    releaseDate: "2026-03-09",
  },
  {
    id: "color-palette-extractor",
    name: "Color Palette Extractor",
    domain: "Design",
    author: "studio_fern",
    version: "0.2.0",
    description: "Pull a usable palette from any reference image.",
    longDescription:
      "Extracts dominant + accent colors, generates Tailwind tokens, computes accessible text pairings (WCAG AA/AAA), exports to Figma styles or CSS variables.",
    tags: ["Color", "Palette", "Tailwind"],
    installs: 3_910,
    rating: 4.5,
    install: "claude skill install color-palette-extractor",
    docsUrl: "https://studiofern.com/palette",
    releaseDate: "2026-01-12",
  },
  {
    id: "shadcn-composer",
    name: "shadcn Composer",
    domain: "Design",
    author: "vince_tao",
    version: "1.0.0",
    description: "Compose shadcn/ui blocks into screens, with live preview.",
    longDescription:
      "Drag-friendly block composer for shadcn/ui. Supports dark mode, RTL, and exports a single Next.js page with proper Server/Client component split.",
    tags: ["shadcn", "Blocks", "Next.js"],
    installs: 16_780,
    rating: 4.8,
    install: "npm i -g shadcn-composer",
    docsUrl: "https://shadcn-composer.dev",
    githubRepoUrl: "https://github.com/vince-tao/shadcn-composer",
    releaseDate: "2026-05-09",
  },

  // ─── Data & Analytics ─────────────────────────────────────────
  {
    id: "sql-explain",
    name: "SQL Explain",
    domain: "Data & Analytics",
    author: "alex.lin",
    version: "0.6.0",
    description: "Explain any SQL query plain-English, with cost hints.",
    longDescription:
      "Pastes a query, returns a step-by-step English explanation. Optionally hooks into your DB to read EXPLAIN ANALYZE and flag the worst nodes.",
    tags: ["SQL", "Postgres", "Explain"],
    installs: 9_550,
    rating: 4.6,
    install: "claude skill install sql-explain",
    docsUrl: "https://docs.cherryin.ai/skills/sql-explain",
    releaseDate: "2026-03-17",
  },
  {
    id: "kpi-dashboard",
    name: "KPI Dashboard",
    domain: "Data & Analytics",
    author: "CherryIN",
    version: "1.1.0",
    description: "Auto-build a KPI dashboard from one CSV.",
    longDescription:
      "Detects time series, segments, and ratios; produces a single-file HTML dashboard with Plotly charts, period-over-period deltas and a narrative summary.",
    tags: ["Dashboard", "KPI", "Plotly"],
    installs: 12_310,
    rating: 4.7,
    install: "claude skill install kpi-dashboard",
    docsUrl: "https://docs.cherryin.ai/skills/kpi-dashboard",
    githubRepoUrl: "https://github.com/cherryinternal/kpi-dashboard",
    releaseDate: "2026-05-06",
  },
  {
    id: "cohort-builder",
    name: "Cohort Builder",
    domain: "Data & Analytics",
    author: "lena.r",
    version: "0.4.0",
    description: "Build user cohorts without writing SQL.",
    longDescription:
      "Visual cohort definition (events, properties, time windows), retention curves, churn analysis, A/B impact estimation — exports cohorts to your CRM.",
    tags: ["Cohort", "Retention", "Growth"],
    installs: 3_220,
    rating: 4.4,
    install: "npm i -g cohort-builder",
    docsUrl: "https://lena.dev/cohort-builder",
    githubRepoUrl: "https://github.com/lenar/cohort-builder",
    releaseDate: "2026-02-15",
  },
  {
    id: "csv-clean",
    name: "CSV Clean",
    domain: "Data & Analytics",
    author: "saito.h",
    version: "0.5.2",
    description: "Lint and auto-fix common CSV issues.",
    longDescription:
      "Detects encoding, mixed delimiters, inconsistent quoting, type drift across rows, and unicode normalization. Outputs a tidy file plus a one-page report.",
    tags: ["CSV", "Lint", "ETL"],
    installs: 5_410,
    rating: 4.5,
    install: "pip install csv-clean",
    docsUrl: "https://github.com/saito-h/csv-clean",
    githubRepoUrl: "https://github.com/saito-h/csv-clean",
    releaseDate: "2026-01-28",
  },

  // ─── Communication ────────────────────────────────────────────
  {
    id: "lark-whiteboard-mcp",
    name: "Lark Whiteboard MCP",
    domain: "Communication",
    author: "CherryIN",
    version: "0.8.0",
    description: "Author Lark whiteboards via PlantUML / Mermaid.",
    longDescription:
      "Convert PlantUML, Mermaid or DSL into native Lark whiteboard nodes. Exposes an MCP server so any agent can update whiteboards in real time.",
    tags: ["Lark", "Whiteboard", "MCP"],
    installs: 2_290,
    rating: 4.4,
    install: "npm i -g @cherryin/lark-whiteboard-mcp",
    docsUrl: "https://docs.cherryin.ai/lark-whiteboard-mcp",
    githubRepoUrl: "https://github.com/cherryinternal/lark-whiteboard-mcp",
    releaseDate: "2026-05-03",
  },
  {
    id: "slack-cleanup",
    name: "Slack Cleanup",
    domain: "Communication",
    author: "minh.tran",
    version: "0.3.0",
    description: "Archive dead channels and merge duplicates.",
    longDescription:
      "Detects channels with < 5 messages in 30 days, finds duplicate topics by embedding similarity, drafts polite migration notices for members.",
    tags: ["Slack", "Hygiene", "Workspace"],
    installs: 1_410,
    rating: 4.3,
    install: "npm i -g slack-cleanup",
    docsUrl: "https://github.com/minht/slack-cleanup",
    githubRepoUrl: "https://github.com/minht/slack-cleanup",
    releaseDate: "2026-02-26",
  },
  {
    id: "meeting-notes",
    name: { en: "Meeting Notes", zh: "会议纪要" },
    domain: "Communication",
    author: "CherryIN",
    version: "1.5.0",
    description: {
      en: "Turn Lark / Zoom recordings into shippable notes + actions.",
      zh: "把飞书 / Zoom 录音整理成可分享的纪要 + 待办。",
    },
    longDescription: {
      en: "Diarized transcript, decisions list, action items with owner + due date, follow-up Lark task creation. Bilingual zh/en summaries.",
      zh: "按发言人切分的逐字稿、决策清单、含负责人和截止日的待办事项，自动在飞书任务里创建跟进项。中英双语摘要。",
    },
    tags: ["Meetings", "Notes", "Actions"],
    installs: 33_140,
    rating: 4.8,
    install: "claude skill install meeting-notes",
    docsUrl: "https://docs.cherryin.ai/skills/meeting-notes",
    githubRepoUrl: "https://github.com/cherryinternal/meeting-notes",
    releaseDate: "2026-04-29",
  },

  // ─── Documentation ────────────────────────────────────────────
  {
    id: "changelog-from-prs",
    name: "Changelog from PRs",
    domain: "Documentation",
    author: "yusuke.h",
    version: "0.6.0",
    description: "Generate a human changelog from merged PRs.",
    longDescription:
      "Groups merged PRs by Conventional Commits scope, hides chores, links to PR pages, supports semver-bump suggestion. Multi-language output.",
    tags: ["Changelog", "Release", "Conventional Commits"],
    installs: 8_900,
    rating: 4.6,
    install: "npx changelog-from-prs",
    docsUrl: "https://github.com/yusuke-h/changelog-from-prs",
    githubRepoUrl: "https://github.com/yusuke-h/changelog-from-prs",
    releaseDate: "2026-03-22",
  },
  {
    id: "api-doc-from-types",
    name: "API Doc from Types",
    domain: "Documentation",
    author: "kira.li",
    version: "0.4.0",
    description: "Generate API reference docs from your TS types + JSDoc.",
    longDescription:
      "Reads your handlers, infers request/response schemas, renders an interactive OpenAPI-style doc site. Includes runnable Try-It-Now panels.",
    tags: ["API", "Docs", "TypeScript"],
    installs: 4_660,
    rating: 4.5,
    install: "npm i -D api-doc-from-types",
    docsUrl: "https://kira.dev/api-doc",
    githubRepoUrl: "https://github.com/kirali/api-doc-from-types",
    releaseDate: "2026-02-04",
  },
  {
    id: "readme-grader",
    name: "README Grader",
    domain: "Documentation",
    author: "ozge_kara",
    version: "0.2.0",
    description: "Grade your README and suggest specific improvements.",
    longDescription:
      "Scores Quickstart, Examples, Install instructions, Demo media, Contribution guide; recommends concrete additions tailored to the project type.",
    tags: ["README", "OSS", "Onboarding"],
    installs: 1_840,
    rating: 4.3,
    install: "npx readme-grader",
    docsUrl: "https://github.com/ozge/readme-grader",
    githubRepoUrl: "https://github.com/ozge/readme-grader",
    releaseDate: "2026-01-19",
  },

  // ─── Automation ───────────────────────────────────────────────
  {
    id: "browser-runner",
    name: "Browser Runner",
    domain: "Automation",
    author: "tom.allen",
    version: "0.7.0",
    description: "Hand the agent a real Chrome to drive.",
    longDescription:
      "Headed/headless Chrome controller for agents: navigate, click, fill forms, take screenshots, watch network requests. Built on CDP, robust to SPAs.",
    tags: ["Browser", "Automation", "CDP"],
    installs: 23_440,
    rating: 4.7,
    install: "npm i -g browser-runner",
    docsUrl: "https://browserrunner.dev",
    githubRepoUrl: "https://github.com/tomallen/browser-runner",
    releaseDate: "2026-05-11",
  },
  {
    id: "github-action-claude",
    name: { en: "GitHub Action: Claude", zh: "GitHub Action：Claude" },
    domain: "Automation",
    author: "Anthropic",
    version: "1.2.0",
    description: {
      en: "Run Claude on every PR for review, summarization or labels.",
      zh: "在每个 PR 上自动跑 Claude 做评审、摘要或贴标签。",
    },
    longDescription: {
      en: "Official GitHub Action. Triggers on PR open / synchronize / labeled. Provides review comments, label suggestions, summarization in PR description.",
      zh: "官方 GitHub Action。监听 PR 打开 / 推送更新 / 加标签事件，自动在 PR 描述中补摘要、给标签建议、在代码行上留 review 评论。",
    },
    tags: ["GitHub Actions", "CI", "PR"],
    installs: 51_220,
    rating: 4.8,
    install: "uses: anthropics/claude-action@v1",
    docsUrl: "https://github.com/anthropics/claude-action",
    githubRepoUrl: "https://github.com/anthropics/claude-action",
    releaseDate: "2026-04-14",
  },
  {
    id: "n8n-claude",
    name: "n8n × Claude Nodes",
    domain: "Automation",
    author: "ricardo_v",
    version: "0.4.0",
    description: "Drop-in Claude nodes for n8n workflows.",
    longDescription:
      "Chat, tool-use, structured-output, image-analysis nodes. Streams tokens. Built-in prompt-cache. Pairs with the Lark and Notion community nodes.",
    tags: ["n8n", "Workflow", "Low-code"],
    installs: 3_580,
    rating: 4.4,
    install: "npm i -g n8n-nodes-claude",
    docsUrl: "https://community.n8n.io/t/claude-nodes",
    githubRepoUrl: "https://github.com/ricardo-v/n8n-nodes-claude",
    releaseDate: "2026-03-11",
  },
  {
    id: "feishu-bot-kit",
    name: "Feishu Bot Kit",
    domain: "Automation",
    author: "wang.haoran",
    version: "0.9.0",
    description: "Scaffold a production Feishu bot in 60 seconds.",
    longDescription:
      "Typed event handlers, retries, request signing, deduplication, Lark Card builder, multi-tenant config — everything you need to ship a real bot to production.",
    tags: ["Feishu", "Bot", "Scaffold"],
    installs: 6_780,
    rating: 4.6,
    install: "npx create-feishu-bot",
    docsUrl: "https://feishu-bot-kit.dev",
    githubRepoUrl: "https://github.com/wang-haoran/feishu-bot-kit",
    releaseDate: "2026-02-28",
  },

  // ─── Other / Niche ────────────────────────────────────────────
  {
    id: "license-checker",
    name: "License Checker",
    domain: "Other",
    author: "nadia.k",
    version: "0.3.0",
    description: "Audit your deps for restrictive or unknown licenses.",
    longDescription:
      "Recursively scans node_modules, classifies each license as permissive / copyleft / unknown / proprietary, reports policy violations against a configurable allowlist.",
    tags: ["Licenses", "Compliance", "Audit"],
    installs: 4_330,
    rating: 4.5,
    install: "npx license-checker",
    docsUrl: "https://github.com/nadia-k/license-checker",
    githubRepoUrl: "https://github.com/nadia-k/license-checker",
    releaseDate: "2026-01-08",
  },
  {
    id: "i18n-extractor",
    name: "i18n Extractor",
    domain: "Other",
    author: "CherryIN",
    version: "0.7.0",
    description: "Find hard-coded strings and convert them to t() calls.",
    longDescription:
      "Walks your codebase, identifies UI strings, suggests i18n keys following your naming convention, drafts translations for your active locales.",
    tags: ["i18n", "Locales", "Refactor"],
    installs: 7_950,
    rating: 4.6,
    install: "claude skill install i18n-extractor",
    docsUrl: "https://docs.cherryin.ai/skills/i18n-extractor",
    githubRepoUrl: "https://github.com/cherryinternal/i18n-extractor",
    releaseDate: "2026-04-07",
  },
  {
    id: "screenshot-redactor",
    name: "Screenshot Redactor",
    domain: "Other",
    author: "deepa_v",
    version: "0.2.0",
    description: "Auto-blur PII in screenshots before you share them.",
    longDescription:
      "Detects faces, emails, phone numbers, API keys, common ID patterns. Adds intentional rather than full-page redaction so the screenshot stays readable.",
    tags: ["Privacy", "PII", "Screenshots"],
    installs: 2_660,
    rating: 4.4,
    install: "brew install screenshot-redactor",
    docsUrl: "https://github.com/deepa-v/screenshot-redactor",
    githubRepoUrl: "https://github.com/deepa-v/screenshot-redactor",
    releaseDate: "2026-03-18",
  },
  {
    id: "wandb-runs",
    name: "wandb Runs",
    domain: "Other",
    author: "alex.l",
    version: "0.3.0",
    description: "Compare W&B runs and write a release post.",
    longDescription:
      "Pulls metrics from multiple runs, computes stat-significant deltas, drafts an experiment-results post complete with charts and ablation tables.",
    tags: ["W&B", "ML", "Experiments"],
    installs: 1_990,
    rating: 4.3,
    install: "pip install wandb-runs",
    docsUrl: "https://github.com/alex-l/wandb-runs",
    githubRepoUrl: "https://github.com/alex-l/wandb-runs",
    releaseDate: "2026-02-12",
  },
];

// ─── Third-party skills (community sources, not curated) ──────────
// These come from external feeds / subscriptions. Users are warned to
// verify them themselves. CherryIN does NOT vouch for safety or quality.

const THIRD_PARTY_FEEDS = [
  "github.com/awesome-claude-skills",
  "claudemarketplaces.com/skills",
  "claudeskills.info",
  "huggingface.co/datasets/community-skills",
  "lobehub.com/skills",
  "openrouter.ai/apps",
  "gitee.com/cherry-community/skills",
] as const;

export const THIRD_PARTY_SKILLS: Skill[] = [
  { id: "tp-resume-builder", name: "tailored-resume-generator", domain: "Productivity", author: "composiohq", version: "1.0.2", description: "Analyze JDs and tailor a polished, ATS-friendly resume.", longDescription: "Extracts required skills, qualifications, and keywords from job descriptions; reprioritizes your experience and produces ATS-friendly, role-specific resumes.", tags: ["resume", "ATS", "career"], installs: 42_900, rating: 4.0, install: "npx -y @lobehub/market-cli skills install composiohq-awesome-claude-skills-tailored-resume-generator --agent claude-code", docsUrl: "https://lobehub.com/skills/composiohq-awesome-claude-skills-tailored-resume-generator", sourceUrl: "https://lobehub.com/skills/composiohq-awesome-claude-skills-tailored-resume-generator", releaseDate: "2026-03-11", source: "third_party", sourceFeed: "lobehub.com/skills" },
  { id: "tp-canvas-design", name: "canvas-design", domain: "Design", author: "composiohq", version: "0.4.0", description: "Generate a design philosophy then a PDF/PNG expressing it.", longDescription: "Two-phase design generation: first defines an aesthetic direction (e.g. 'Brutalist Joy'), then produces production-ready PDFs or PNGs.", tags: ["design", "brand", "PDF"], installs: 18_300, rating: 4.2, install: "npx -y @lobehub/market-cli skills install composiohq-awesome-claude-skills-canvas-design", docsUrl: "https://lobehub.com/skills/composiohq-awesome-claude-skills-canvas-design", sourceUrl: "https://lobehub.com/skills/composiohq-awesome-claude-skills-canvas-design", releaseDate: "2026-04-02", source: "third_party", sourceFeed: "lobehub.com/skills" },
  { id: "tp-landing-page-design", name: "landing-page-design", domain: "Design", author: "inferen-sh", version: "0.7.1", description: "Multi-library landing page generator with shadcn + Aceternity.", longDescription: "Composes landing pages from shadcn/ui, Aceternity UI, Magic UI, and 21st.dev components. Includes Next.js routing skeleton, i18n hooks, and responsive presets.", tags: ["landing", "shadcn", "marketing"], installs: 9_870, rating: 4.4, install: "npx -y @lobehub/market-cli skills install inferen-sh-skills-landing-page-design", docsUrl: "https://lobehub.com/skills/inferen-sh-skills-landing-page-design", sourceUrl: "https://lobehub.com/skills/inferen-sh-skills-landing-page-design", releaseDate: "2026-04-25", source: "third_party", sourceFeed: "lobehub.com/skills" },
  { id: "tp-email-design", name: "email-design", domain: "Design", author: "inferen-sh", version: "0.3.0", description: "Designer-grade transactional and marketing email templates.", longDescription: "Generates MJML / HTML email templates with mobile-first design, dark-mode aware tokens, and bulletproof rendering checks across Outlook, Apple Mail, Gmail.", tags: ["email", "MJML", "marketing"], installs: 5_410, rating: 4.3, install: "npx -y @lobehub/market-cli skills install inferen-sh-skills-email-design", docsUrl: "https://lobehub.com/skills/inferen-sh-skills-email-design", sourceUrl: "https://lobehub.com/skills/inferen-sh-skills-email-design", releaseDate: "2026-03-17", source: "third_party", sourceFeed: "lobehub.com/skills" },
  { id: "tp-impeccable-layout", name: "impeccable-layout", domain: "Design", author: "pbakaus", version: "0.2.0", description: "Diagnose and fix subtle spacing/hierarchy issues in UIs.", longDescription: "Runs the squint test, detects monotonous card grids and arbitrary spacing values, then applies consistent spacing systems and proper layout tools.", tags: ["UI", "spacing", "hierarchy"], installs: 3_220, rating: 4.5, install: "npx -y @lobehub/market-cli skills install pbakaus-impeccable-layout", docsUrl: "https://lobehub.com/skills/pbakaus-impeccable-layout", sourceUrl: "https://lobehub.com/skills/pbakaus-impeccable-layout", releaseDate: "2026-04-12", source: "third_party", sourceFeed: "lobehub.com/skills" },
  { id: "tp-frontend-design-anthropic", name: "frontend-design (anthropic mirror)", domain: "Design", author: "anthropics", version: "1.6.0", description: "Anti-AI-slop frontend design guidance (community mirror).", longDescription: "Community mirror of Anthropic's frontend-design skill. Forces specific design direction with distinctive typography and contextual visual effects.", tags: ["frontend", "design system"], installs: 277_410, rating: 4.9, install: "claude skill install anthropics/frontend-design", docsUrl: "https://github.com/anthropics/skills/tree/main/frontend-design", sourceUrl: "https://github.com/anthropics/skills/tree/main/frontend-design", githubRepoUrl: "https://github.com/anthropics/skills", releaseDate: "2026-04-17", source: "third_party", sourceFeed: "github.com/awesome-claude-skills" },
  { id: "tp-git-pr-skill", name: "claude-git-pr-skill", domain: "Developer Tools", author: "aidankinzett", version: "0.6.0", description: "Professional GitHub PR review with pending-review workflow.", longDescription: "Streamlines PR reviews via gh CLI: pending reviews, code suggestions, user approval workflow, inline comments, ticket tracking.", tags: ["PR", "GitHub", "code review"], installs: 12_640, rating: 4.6, install: "git clone https://github.com/aidankinzett/claude-git-pr-skill", docsUrl: "https://github.com/aidankinzett/claude-git-pr-skill", sourceUrl: "https://github.com/aidankinzett/claude-git-pr-skill", githubRepoUrl: "https://github.com/aidankinzett/claude-git-pr-skill", releaseDate: "2026-02-26", source: "third_party", sourceFeed: "github.com/awesome-claude-skills" },
  { id: "tp-pr-reviewer-skill", name: "pr-reviewer-skill", domain: "Developer Tools", author: "SpillwaveSolutions", version: "0.4.0", description: "Multi-criteria PR reviewer (security/testing/maintainability).", longDescription: "Automates gh CLI data collection, analyzes against industry-standard criteria (security, testing, maintainability), generates structured review files, posts feedback with approval workflow.", tags: ["PR", "security", "review"], installs: 4_310, rating: 4.4, install: "git clone https://github.com/SpillwaveSolutions/pr-reviewer-skill", docsUrl: "https://github.com/SpillwaveSolutions/pr-reviewer-skill", sourceUrl: "https://github.com/SpillwaveSolutions/pr-reviewer-skill", githubRepoUrl: "https://github.com/SpillwaveSolutions/pr-reviewer-skill", releaseDate: "2026-03-08", source: "third_party", sourceFeed: "github.com/awesome-claude-skills" },
  { id: "tp-caveman", name: "caveman", domain: "Other", author: "anonymous", version: "0.0.1", description: "Talk to Claude like a caveman. For fun.", longDescription: "Forces Claude to communicate exclusively in caveman-speak. Surprisingly popular for stress-testing prompt sensitivity.", tags: ["fun", "novelty"], installs: 145_600, rating: 4.7, install: "npx claudeskills install caveman", docsUrl: "https://claudeskills.info/skills/caveman", sourceUrl: "https://claudeskills.info/skills/caveman", releaseDate: "2026-01-30", source: "third_party", sourceFeed: "claudeskills.info" },
  { id: "tp-ceo-advisor", name: "ceo-advisor", domain: "Productivity", author: "AlirezaRezvani", version: "0.3.0", description: "Executive leadership guidance for strategic decisions.", longDescription: "Strategic decision-making coach: organizational development, stakeholder management, capital allocation, hiring frameworks.", tags: ["leadership", "strategy"], installs: 2_180, rating: 4.1, install: "npx -y @lobehub/market-cli skills install alirezarezvani-claude-skills-ceo-advisor", docsUrl: "https://lobehub.com/skills/alirezarezvani-claude-skills-ceo-advisor", sourceUrl: "https://lobehub.com/skills/alirezarezvani-claude-skills-ceo-advisor", releaseDate: "2026-05-17", source: "third_party", sourceFeed: "lobehub.com/skills" },
  { id: "tp-dev-growth", name: "developer-growth-advisor", domain: "Productivity", author: "AlirezaRezvani", version: "0.2.1", description: "Career growth coaching for software engineers.", longDescription: "Personalized career growth plans with skill-tree gaps, deliberate practice routines, and quarterly OKR drafts.", tags: ["career", "growth"], installs: 1_604, rating: 4.0, install: "npx -y @lobehub/market-cli skills install alirezarezvani-claude-skills-developer-growth-advisor", docsUrl: "https://lobehub.com/skills/alirezarezvani-claude-skills-developer-growth-advisor", sourceUrl: "https://lobehub.com/skills/alirezarezvani-claude-skills-developer-growth-advisor", releaseDate: "2026-05-16", source: "third_party", sourceFeed: "lobehub.com/skills" },
  { id: "tp-surprise-me", name: "surprise-me", domain: "Other", author: "lijiamou", version: "0.1.0", description: "Random Claude chat history → unexpected 'wow' experience.", longDescription: "Reads a chat history, picks an unexpected angle, and produces a 'wow' moment by dynamically discovering creative connections.", tags: ["novelty", "creativity"], installs: 1_312, rating: 4.0, install: "npx -y @lobehub/market-cli skills install lijiamou-skills-surprise-me", docsUrl: "https://lobehub.com/skills/lijiamou-skills-surprise-me", sourceUrl: "https://lobehub.com/skills/lijiamou-skills-surprise-me", releaseDate: "2026-05-17", source: "third_party", sourceFeed: "lobehub.com/skills" },
  { id: "tp-ai-pr-reviewer", name: "ai-pr-reviewer", domain: "Developer Tools", author: "mcpmarket", version: "1.1.0", description: "Automated AI code reviews integrated via GitHub CLI.", longDescription: "Multi-agent PR review: deploys five sub-agents (code quality, performance, test coverage, documentation, security) to analyze PRs simultaneously.", tags: ["PR", "AI agent", "review"], installs: 8_904, rating: 4.5, install: "npx -y mcpmarket skill add ai-pr-reviewer", docsUrl: "https://mcpmarket.com/tools/skills/ai-pr-reviewer", sourceUrl: "https://mcpmarket.com/tools/skills/ai-pr-reviewer", releaseDate: "2026-04-18", source: "third_party", sourceFeed: "openrouter.ai/apps" },
  { id: "tp-github-pr-reviewer-5", name: "github-pr-reviewer-5", domain: "Developer Tools", author: "mcpmarket", version: "0.5.0", description: "Claude Code skill for GitHub PR code reviews.", longDescription: "Lightweight PR review skill — pulls diff via gh CLI, asks Claude for issues, posts inline comments. No extra dependencies.", tags: ["PR", "lightweight"], installs: 3_750, rating: 4.2, install: "npx -y mcpmarket skill add github-pr-reviewer-5", docsUrl: "https://mcpmarket.com/tools/skills/github-pr-reviewer-5", sourceUrl: "https://mcpmarket.com/tools/skills/github-pr-reviewer-5", releaseDate: "2026-03-29", source: "third_party", sourceFeed: "openrouter.ai/apps" },
  { id: "tp-claude-skills-mp", name: "claude-skills-marketplace", domain: "Developer Tools", author: "mhattingpete", version: "0.9.0", description: "Curated bundle: git automation + testing + code review.", longDescription: "Engineering workflow bundle for Claude Code: git automation, test scaffolding, code review templates, and PR description generation.", tags: ["bundle", "engineering"], installs: 6_201, rating: 4.4, install: "git clone https://github.com/mhattingpete/claude-skills-marketplace", docsUrl: "https://github.com/mhattingpete/claude-skills-marketplace", sourceUrl: "https://github.com/mhattingpete/claude-skills-marketplace", githubRepoUrl: "https://github.com/mhattingpete/claude-skills-marketplace", releaseDate: "2026-04-04", source: "third_party", sourceFeed: "github.com/awesome-claude-skills" },
  { id: "tp-hf-data-eda", name: "huggingface-data-eda", domain: "Data & Analytics", author: "community-skills", version: "0.5.0", description: "Quick EDA on any Hugging Face dataset.", longDescription: "Pulls a HF dataset, infers schema, produces summary stats, missing-value report, and visualizations in a single HTML report.", tags: ["EDA", "huggingface", "dataset"], installs: 2_188, rating: 4.1, install: "pip install hf-data-eda", docsUrl: "https://huggingface.co/datasets/community-skills/data-eda", sourceUrl: "https://huggingface.co/datasets/community-skills/data-eda", releaseDate: "2026-02-05", source: "third_party", sourceFeed: "huggingface.co/datasets/community-skills" },
  { id: "tp-gitee-zh-prompts", name: "中文 prompt 工具箱", domain: "Productivity", author: "cherry-community", version: "0.4.0", description: "中文场景常用 prompt 模板集合（招聘/PR/会议纪要）。", longDescription: "面向中文办公场景的 prompt 模板：招聘 JD 撰写、PR 评审、会议纪要、邮件回复、技术方案模板。", tags: ["中文", "prompt", "办公"], installs: 4_310, rating: 4.3, install: "git clone https://gitee.com/cherry-community/skills-zh-prompts", docsUrl: "https://gitee.com/cherry-community/skills-zh-prompts", sourceUrl: "https://gitee.com/cherry-community/skills-zh-prompts", releaseDate: "2026-04-22", source: "third_party", sourceFeed: "gitee.com/cherry-community/skills" },
  { id: "tp-gitee-base-helper", name: "飞书多维表格助手", domain: "Data & Analytics", author: "cherry-community", version: "0.6.0", description: "飞书 Base 字段设计 / 公式 / 跨表引用助手。", longDescription: "针对飞书 Base 的字段设计、公式表达、跨表查找引用、视图配置自动化的中文 skill。包含常见场景模板。", tags: ["飞书", "Base", "中文"], installs: 1_870, rating: 4.2, install: "git clone https://gitee.com/cherry-community/skills-lark-base", docsUrl: "https://gitee.com/cherry-community/skills-lark-base", sourceUrl: "https://gitee.com/cherry-community/skills-lark-base", releaseDate: "2026-03-19", source: "third_party", sourceFeed: "gitee.com/cherry-community/skills" },
  { id: "tp-or-app-summarize", name: "openrouter-summarize", domain: "Productivity", author: "openrouter", version: "0.3.0", description: "Cross-model summarization with provider fallback.", longDescription: "Routes summarization across OpenRouter providers based on cost / quality / latency. Falls back automatically if a provider rate-limits.", tags: ["summarize", "openrouter"], installs: 9_550, rating: 4.3, install: "npx openrouter-skill install summarize", docsUrl: "https://openrouter.ai/apps/summarize", sourceUrl: "https://openrouter.ai/apps/summarize", releaseDate: "2026-04-09", source: "third_party", sourceFeed: "openrouter.ai/apps" },
  { id: "tp-or-app-translate", name: "openrouter-translate", domain: "Productivity", author: "openrouter", version: "0.2.0", description: "Cross-model translation with terminology pinning.", longDescription: "Stable translation across providers with project-level glossary pinning and tone control (formal/casual/marketing).", tags: ["translate", "openrouter"], installs: 7_402, rating: 4.2, install: "npx openrouter-skill install translate", docsUrl: "https://openrouter.ai/apps/translate", sourceUrl: "https://openrouter.ai/apps/translate", releaseDate: "2026-03-22", source: "third_party", sourceFeed: "openrouter.ai/apps" },
  { id: "tp-or-app-ocr", name: "openrouter-ocr", domain: "Data & Analytics", author: "openrouter", version: "0.1.0", description: "Multimodal OCR + structured extraction.", longDescription: "Sends images to a vision-capable provider, extracts structured fields (invoices, receipts, ID cards) into JSON schema.", tags: ["OCR", "vision", "extraction"], installs: 5_120, rating: 4.1, install: "npx openrouter-skill install ocr", docsUrl: "https://openrouter.ai/apps/ocr", sourceUrl: "https://openrouter.ai/apps/ocr", releaseDate: "2026-02-28", source: "third_party", sourceFeed: "openrouter.ai/apps" },
  { id: "tp-hf-skill-eval", name: "skill-eval-harness", domain: "Developer Tools", author: "community-skills", version: "0.2.0", description: "Eval harness for any Claude skill: regression + scoring.", longDescription: "Define eval cases in YAML, run your skill across them, score outputs against a judge model. Catches regressions when refining prompts.", tags: ["eval", "regression", "judge"], installs: 1_408, rating: 4.0, install: "pip install skill-eval-harness", docsUrl: "https://huggingface.co/datasets/community-skills/skill-eval", sourceUrl: "https://huggingface.co/datasets/community-skills/skill-eval", releaseDate: "2026-02-12", source: "third_party", sourceFeed: "huggingface.co/datasets/community-skills" },
  { id: "tp-lobehub-podcast", name: "podcast-script-writer", domain: "Productivity", author: "lobehub", version: "0.3.0", description: "Long-form podcast script generator with dialogue and beats.", longDescription: "Generates structured podcast scripts with host/guest dialogue, segment beats, cold opens, sponsor read placeholders, and outro CTAs.", tags: ["podcast", "writing"], installs: 2_330, rating: 4.2, install: "npx -y @lobehub/market-cli skills install lobehub-skills-podcast", docsUrl: "https://lobehub.com/skills/lobehub-skills-podcast", sourceUrl: "https://lobehub.com/skills/lobehub-skills-podcast", releaseDate: "2026-03-04", source: "third_party", sourceFeed: "lobehub.com/skills" },
  { id: "tp-lobehub-rfc", name: "rfc-drafter", domain: "Documentation", author: "lobehub", version: "0.5.0", description: "Technical RFC drafting with reviewer-ready structure.", longDescription: "RFC scaffolds with motivation / context / proposed design / alternatives / risks / migration sections. Pulls inline diagrams from PlantUML.", tags: ["RFC", "spec", "design"], installs: 1_975, rating: 4.3, install: "npx -y @lobehub/market-cli skills install lobehub-skills-rfc", docsUrl: "https://lobehub.com/skills/lobehub-skills-rfc", sourceUrl: "https://lobehub.com/skills/lobehub-skills-rfc", releaseDate: "2026-04-01", source: "third_party", sourceFeed: "lobehub.com/skills" },
  { id: "tp-claudemarket-canvas-skill", name: "canvas-skill", domain: "Design", author: "composiohq", version: "0.2.0", description: "Generate brand-cohesive canvas assets.", longDescription: "Canvas asset generator: social cards, banners, OG images, slide cover art with consistent visual identity.", tags: ["canvas", "brand"], installs: 1_810, rating: 4.1, install: "npx -y @lobehub/market-cli skills install composiohq-awesome-claude-skills-canvas-skill", docsUrl: "https://claudemarketplaces.com/skills/composiohq/awesome-claude-skills/canvas-skill", sourceUrl: "https://claudemarketplaces.com/skills/composiohq/awesome-claude-skills/canvas-skill", releaseDate: "2026-03-12", source: "third_party", sourceFeed: "claudemarketplaces.com/skills" },
  { id: "tp-claudemarket-vibe-check", name: "vibe-check", domain: "Design", author: "composiohq", version: "0.1.0", description: "Score a design's aesthetic alignment with a target vibe.", longDescription: "Rubric-driven aesthetic scoring against a target reference. Outputs deltas (typography / spacing / color tension / hierarchy clarity).", tags: ["aesthetic", "scoring"], installs: 950, rating: 4.0, install: "npx -y @lobehub/market-cli skills install composiohq-awesome-claude-skills-vibe-check", docsUrl: "https://claudemarketplaces.com/skills/composiohq/awesome-claude-skills/vibe-check", sourceUrl: "https://claudemarketplaces.com/skills/composiohq/awesome-claude-skills/vibe-check", releaseDate: "2026-04-26", source: "third_party", sourceFeed: "claudemarketplaces.com/skills" },
  { id: "tp-or-app-judge", name: "model-judge", domain: "AI & Agents", author: "openrouter", version: "0.1.0", description: "LLM-as-judge with calibration on golden answers.", longDescription: "Acts as a judge model with calibration set, computes inter-rater agreement against a held-out set, supports rubric-based or pairwise scoring.", tags: ["judge", "eval"], installs: 3_410, rating: 4.2, install: "npx openrouter-skill install judge", docsUrl: "https://openrouter.ai/apps/judge", sourceUrl: "https://openrouter.ai/apps/judge", releaseDate: "2026-03-26", source: "third_party", sourceFeed: "openrouter.ai/apps" },
  { id: "tp-hf-rag-builder", name: "rag-builder", domain: "AI & Agents", author: "community-skills", version: "0.4.0", description: "End-to-end RAG pipeline from a folder of PDFs.", longDescription: "Drop a folder of PDFs, get a Chroma index, a chat endpoint, and a citation-tracking UI. Single command, sane defaults, replaceable parts.", tags: ["RAG", "PDF"], installs: 5_640, rating: 4.4, install: "pip install rag-builder", docsUrl: "https://huggingface.co/datasets/community-skills/rag-builder", sourceUrl: "https://huggingface.co/datasets/community-skills/rag-builder", releaseDate: "2026-04-21", source: "third_party", sourceFeed: "huggingface.co/datasets/community-skills" },
  { id: "tp-claudeskills-meme", name: "meme-generator", domain: "Other", author: "anonymous", version: "0.1.0", description: "Topical, on-brand meme generator. NSFW filter optional.", longDescription: "Generates topical memes with brand-aware text overlay. Refuses to generate slurs / harassment imagery. Optional NSFW filter for SFW contexts.", tags: ["fun", "meme"], installs: 22_800, rating: 4.1, install: "npx claudeskills install meme-generator", docsUrl: "https://claudeskills.info/skills/meme-generator", sourceUrl: "https://claudeskills.info/skills/meme-generator", releaseDate: "2026-04-15", source: "third_party", sourceFeed: "claudeskills.info" },
  { id: "tp-gitee-resume-zh", name: "中文简历生成器", domain: "Productivity", author: "cherry-community", version: "0.3.0", description: "面向国内招聘的中文简历生成 + 关键词优化。", longDescription: "针对国内招聘场景的中文简历模板：投递不同岗位时自动调整关键词、量化成就、压缩到 1-2 页。", tags: ["中文", "招聘", "简历"], installs: 6_840, rating: 4.4, install: "git clone https://gitee.com/cherry-community/skills-resume-zh", docsUrl: "https://gitee.com/cherry-community/skills-resume-zh", sourceUrl: "https://gitee.com/cherry-community/skills-resume-zh", releaseDate: "2026-05-02", source: "third_party", sourceFeed: "gitee.com/cherry-community/skills" },
];

export const THIRD_PARTY_FEED_NAMES = THIRD_PARTY_FEEDS;

// ─── Generated third-party skills ─────────────────────────────────
// Synthesizes a large pool of plausible community skills so the third-party
// tab demonstrates real volume. Names / authors / domains rotate so the grid
// looks like an actual aggregator feed (lobehub / claudeskills / etc.).

const GEN_DOMAINS = [
  "AI & Agents",
  "Productivity",
  "Developer Tools",
  "Design",
  "Data & Analytics",
  "Communication",
  "Documentation",
  "Automation",
  "Other",
] as const;

const GEN_AUTHORS = [
  "composiohq", "inferen-sh", "pbakaus", "anthropics", "aidankinzett",
  "SpillwaveSolutions", "mhattingpete", "mcpmarket", "community-skills",
  "lobehub", "openrouter", "cherry-community", "kazuya.matsui", "linw_ai",
  "rui.huang", "morgan.chen", "jamie.park", "tarek_b", "elena.kov",
  "yusuke.h", "kira.li", "ozge_kara", "tom.allen", "ricardo_v", "wang.haoran",
  "nadia.k", "deepa_v", "alex.l", "saito.h", "sora.kim", "studio_fern",
  "vince_tao", "ricky_zhou", "minh.tran", "AlirezaRezvani", "lijiamou",
  "anonymous", "huang.q", "lin.f", "ana.silva",
];

const SKILL_NOUNS = [
  "summarizer", "translator", "linter", "formatter", "scaffold", "auditor",
  "explainer", "refactor", "generator", "extractor", "labeler", "scorer",
  "diffsmith", "outliner", "rephraser", "splitter", "merger", "validator",
  "patcher", "pruner", "indexer", "cataloger", "spotter", "harvester",
  "watcher", "router", "dispatcher", "scheduler", "rotator", "mover",
  "uploader", "downloader", "snapshotter", "replayer", "narrator", "muse",
  "coach", "concierge", "navigator", "compass", "atlas", "lighthouse",
  "binder", "weaver", "stitcher", "spinner", "polisher", "buffer",
];

const SKILL_PREFIXES = [
  "auto", "smart", "quick", "deep", "fast", "lean", "calm", "neat", "tidy",
  "clear", "swift", "open", "pure", "raw", "vivid", "bold", "warm", "cool",
  "spec", "team", "solo", "city", "river", "ember", "north", "south", "east",
  "west", "novel", "fresh", "first", "next", "core", "edge", "primal",
];

const VERSION_TEMPLATES = [
  "0.1.0", "0.2.0", "0.2.1", "0.3.0", "0.3.4", "0.4.0", "0.5.0", "0.6.2",
  "0.7.0", "0.8.0", "0.9.0", "1.0.0", "1.0.3", "1.1.0", "1.2.0", "1.2.4",
  "1.3.0", "1.4.1", "1.5.0", "1.6.0", "2.0.0", "2.1.0", "2.3.0", "3.0.0",
];

const INSTALL_TEMPLATES: Array<(id: string) => string> = [
  (id) => `npx -y @lobehub/market-cli skills install ${id}`,
  (id) => `npm i -g ${id}`,
  (id) => `pip install ${id}`,
  (id) => `claude skill install ${id}`,
  (id) => `brew install ${id}`,
  (id) => `git clone https://github.com/${id}/${id.split("-").pop() ?? id}`,
  (id) => `npx ${id}`,
  (id) => `go install github.com/community/${id}@latest`,
];

const TAG_POOL = [
  "Productivity", "Workflow", "PM", "Spec", "Docs", "AI", "Agent", "Prompt",
  "MCP", "RAG", "Vision", "OCR", "Translate", "Summarize", "Lint", "Format",
  "Refactor", "Test", "Coverage", "Security", "Audit", "Performance",
  "Caching", "Streaming", "GitHub", "GitLab", "Lark", "Slack", "Notion",
  "Cron", "Schedule", "Trigger", "Diff", "Patch", "Build", "Release",
  "Changelog", "Onboarding", "Mentor", "Coach", "中文", "英文", "PDF",
  "CSV", "Excel", "Markdown", "MJML",
];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)] as T;
}

function genThirdPartySkills(count: number, seed: number): Skill[] {
  const rng = mulberry32(seed);
  const out: Skill[] = [];
  const used = new Set<string>();
  const baseDate = new Date("2026-05-20").getTime();
  const day = 24 * 60 * 60 * 1000;

  let attempts = 0;
  while (out.length < count && attempts < count * 4) {
    attempts += 1;
    const prefix = pick(rng, SKILL_PREFIXES);
    const noun = pick(rng, SKILL_NOUNS);
    const author = pick(rng, GEN_AUTHORS);
    const domain = pick(rng, GEN_DOMAINS);
    const id = `gen-${prefix}-${noun}-${out.length}`;
    if (used.has(id)) continue;
    used.add(id);

    const name = `${prefix}-${noun}`;
    const installs = Math.floor(rng() * 50_000) + 50;
    const rating = Math.round((3.5 + rng() * 1.5) * 10) / 10;
    const ageDays = Math.floor(rng() * 540);
    const releaseDate = new Date(baseDate - ageDays * day)
      .toISOString()
      .slice(0, 10);
    const version = pick(rng, VERSION_TEMPLATES);
    const feed = pick(rng, THIRD_PARTY_FEEDS);
    const installCmd = pick(rng, INSTALL_TEMPLATES)(id);

    const tagCount = 2 + Math.floor(rng() * 2);
    const tags: string[] = [];
    while (tags.length < tagCount) {
      const t = pick(rng, TAG_POOL);
      if (!tags.includes(t)) tags.push(t);
    }

    const sourceUrl = `https://${feed.replace(/\/$/, "")}/${id}`;
    const description = `A ${domain.toLowerCase()} skill that helps with ${noun}-style tasks.`;
    const longDescription = `${name} is a Claude skill contributed by ${author} via ${feed}. It targets ${domain.toLowerCase()} workflows and pairs well with other ${prefix}-* community skills.`;

    out.push({
      id,
      name,
      domain,
      author,
      version,
      description,
      longDescription,
      tags,
      installs,
      rating,
      install: installCmd,
      docsUrl: sourceUrl,
      sourceUrl,
      releaseDate,
      source: "third_party",
      sourceFeed: feed,
    });
  }
  return out;
}

// 500 generated entries on top of the ~30 curated mock — gives the tab a
// realistic "thousands of entries" feel without bloating the bundle absurdly.
export const GENERATED_THIRD_PARTY_SKILLS: Skill[] = genThirdPartySkills(500, 42);

// Final exposed array merges hand-crafted + generated.
export const ALL_THIRD_PARTY_SKILLS: Skill[] = [
  ...THIRD_PARTY_SKILLS,
  ...GENERATED_THIRD_PARTY_SKILLS,
];
