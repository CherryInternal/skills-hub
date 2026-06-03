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
  downloads: number;
  rating: number;
  docsUrl?: string;
  homepage?: string;
  githubRepoUrl?: string;
  sourceUrl?: string;
  packageName?: string;
  packageSize?: number;
  hasPackage?: boolean;
  uploadedFile?: string;
  releaseDate: string;
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
