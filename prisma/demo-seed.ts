import type { Skill } from "../src/components/skills/skills-data";

// 5 条内容托管样板。id 对应 prisma/demo-packages/<id>/ 目录。
// 仅供 `pnpm exec tsx prisma/seed.ts` 灌入,生产可不跑。
export const SKILLS: Skill[] = [
  {
    id: "pr-summary",
    name: "PR Summary",
    domain: "Developer Tools",
    author: "CherryIN",
    version: "1.0.0",
    description: "Summarize a pull request into a concise changelog entry.",
    longDescription:
      "Reads a PR diff and produces a tight summary: what changed, why, and any risk notes — ready to paste into release notes.",
    tags: ["git", "review", "changelog"],
    downloads: 0,
    rating: 4.8,
    docsUrl: "https://example.com/skills/pr-summary",
    releaseDate: "2026-05-01",
  },
  {
    id: "commit-helper",
    name: "Commit Helper",
    domain: "Developer Tools",
    author: "CherryIN",
    version: "0.9.0",
    description: "Write conventional commit messages from a staged diff.",
    longDescription:
      "Inspects staged changes and proposes a clear `type(scope): subject` commit message with an optional body.",
    tags: ["git", "commits"],
    downloads: 0,
    rating: 4.6,
    docsUrl: "https://example.com/skills/commit-helper",
    releaseDate: "2026-05-10",
  },
  {
    id: "meeting-notes",
    name: "Meeting Notes",
    domain: "Communication",
    author: "CherryIN",
    version: "1.2.0",
    description: "Turn a transcript into decisions, action items, and owners.",
    longDescription:
      "Converts a raw meeting transcript into structured notes grouped by decisions, TODOs (with owners), and open questions.",
    tags: ["meetings", "notes"],
    downloads: 0,
    rating: 4.7,
    docsUrl: "https://example.com/skills/meeting-notes",
    releaseDate: "2026-04-20",
  },
  {
    id: "palette-gen",
    name: "Palette Generator",
    domain: "Design",
    author: "CherryIN",
    version: "0.5.0",
    description: "Generate an accessible palette from one brand color.",
    longDescription:
      "From a single hex color, generates tints and shades annotated with WCAG contrast ratios for accessible UI.",
    tags: ["design", "color", "a11y"],
    downloads: 0,
    rating: 4.4,
    docsUrl: "https://example.com/skills/palette-gen",
    releaseDate: "2026-05-18",
  },
  {
    id: "csv-insights",
    name: "CSV Insights",
    domain: "Data & Analytics",
    author: "CherryIN",
    version: "0.3.0",
    description: "Profile a CSV and surface the top findings.",
    longDescription:
      "Points at a CSV, reports its schema, flags anomalies, and surfaces the three most interesting insights.",
    tags: ["data", "csv", "analysis"],
    downloads: 0,
    rating: 4.2,
    docsUrl: "https://example.com/skills/csv-insights",
    releaseDate: "2026-05-22",
  },
];
