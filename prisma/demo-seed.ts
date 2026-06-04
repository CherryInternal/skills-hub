import type { Skill } from "../src/components/skills/skills-data";

// 5 条内容托管样板(中英双语)。id 对应 prisma/demo-packages/<id>/ 目录。
// 仅供 `pnpm exec tsx prisma/seed.ts` 灌入,生产可不跑。
export const SKILLS: Skill[] = [
  {
    id: "pr-summary",
    name: { en: "PR Summary", zh: "PR 摘要" },
    domain: "Developer Tools",
    author: "CherryIN",
    version: "1.0.0",
    description: {
      en: "Summarize a pull request into a concise changelog entry.",
      zh: "把一个 Pull Request 总结成简洁的更新日志条目。",
    },
    longDescription: {
      en: "Reads a PR diff and produces a tight summary: what changed, why, and any risk notes — ready to paste into release notes.",
      zh: "读取 PR 的 diff,产出精炼总结:改了什么、为什么、有哪些风险点 —— 可直接粘进发布说明。",
    },
    tags: ["git", "review", "changelog"],
    downloads: 0,
    rating: 4.8,
    docsUrl: "https://example.com/skills/pr-summary",
    releaseDate: "2026-05-01",
  },
  {
    id: "commit-helper",
    name: { en: "Commit Helper", zh: "Commit 助手" },
    domain: "Developer Tools",
    author: "CherryIN",
    version: "0.9.0",
    description: {
      en: "Write conventional commit messages from a staged diff.",
      zh: "根据暂存的 diff 写出规范的 commit message。",
    },
    longDescription: {
      en: "Inspects staged changes and proposes a clear `type(scope): subject` commit message with an optional body.",
      zh: "检查暂存的改动,提议清晰的 `type(scope): subject` 提交信息,可附带正文。",
    },
    tags: ["git", "commits"],
    downloads: 0,
    rating: 4.6,
    docsUrl: "https://example.com/skills/commit-helper",
    releaseDate: "2026-05-10",
  },
  {
    id: "meeting-notes",
    name: { en: "Meeting Notes", zh: "会议纪要" },
    domain: "Communication",
    author: "CherryIN",
    version: "1.2.0",
    description: {
      en: "Turn a transcript into decisions, action items, and owners.",
      zh: "把会议记录整理成决策、待办和负责人。",
    },
    longDescription: {
      en: "Converts a raw meeting transcript into structured notes grouped by decisions, TODOs (with owners), and open questions.",
      zh: "把原始会议记录转成结构化纪要,按决策、待办(含负责人)、待解决问题分组。",
    },
    tags: ["meetings", "notes"],
    downloads: 0,
    rating: 4.7,
    docsUrl: "https://example.com/skills/meeting-notes",
    releaseDate: "2026-04-20",
  },
  {
    id: "palette-gen",
    name: { en: "Palette Generator", zh: "配色生成器" },
    domain: "Design",
    author: "CherryIN",
    version: "0.5.0",
    description: {
      en: "Generate an accessible palette from one brand color.",
      zh: "从单个品牌色生成无障碍配色方案。",
    },
    longDescription: {
      en: "From a single hex color, generates tints and shades annotated with WCAG contrast ratios for accessible UI.",
      zh: "从一个十六进制颜色出发,生成带 WCAG 对比度标注的明暗色阶,适合做无障碍 UI。",
    },
    tags: ["design", "color", "a11y"],
    downloads: 0,
    rating: 4.4,
    docsUrl: "https://example.com/skills/palette-gen",
    releaseDate: "2026-05-18",
  },
  {
    id: "csv-insights",
    name: { en: "CSV Insights", zh: "CSV 洞察" },
    domain: "Data & Analytics",
    author: "CherryIN",
    version: "0.3.0",
    description: {
      en: "Profile a CSV and surface the top findings.",
      zh: "分析 CSV 并给出最值得关注的发现。",
    },
    longDescription: {
      en: "Points at a CSV, reports its schema, flags anomalies, and surfaces the three most interesting insights.",
      zh: "指向一个 CSV,报告它的字段结构、标记异常,并给出最有价值的三条洞察。",
    },
    tags: ["data", "csv", "analysis"],
    downloads: 0,
    rating: 4.2,
    docsUrl: "https://example.com/skills/csv-insights",
    releaseDate: "2026-05-22",
  },
];
