"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  SKILL_DOMAINS,
  pickLocale,
  type LocalizedString,
} from "@/components/skills/skills-data";
import { api, type RouterOutputs } from "~/trpc/react";

export type AdminSkill = RouterOutputs["skill"]["adminList"][number];

// Languages offered in the localized editor. `en` is the primary, required
// language — it is what the public site falls back to (pickLocale) and what the
// backend enforces (nameEn .min(1)). Adding a language is just one entry here.
const LOCALES = [
  { code: "en", label: "English", primary: true },
  { code: "zh", label: "中文", primary: false },
] as const;
type LocaleCode = (typeof LOCALES)[number]["code"];

// The per-language content. Everything else on a skill is language-agnostic.
interface LocaleContent {
  name: string;
  description: string;
  longDescription: string;
}

interface FormState {
  id: string;
  domain: string;
  author: string;
  version: string;
  tagsCsv: string;
  githubRepoUrl: string;
  sourceUrl: string;
  locales: Record<LocaleCode, LocaleContent>;
}

// Extracts the Chinese translation directly (no English fallback). The skill
// content fields are `string | { en; zh? }`; only the object form carries `zh`.
function pickZh(value: LocalizedString | undefined): string {
  if (value && typeof value === "object") return value.zh ?? "";
  return "";
}

// Reads one language's content off a skill. English uses pickLocale (which is
// the canonical/fallback value); other languages read their own arm only.
function readLocale(s: AdminSkill, code: LocaleCode): LocaleContent {
  if (code === "en") {
    return {
      name: pickLocale(s.name, "en"),
      description: pickLocale(s.description, "en"),
      longDescription: pickLocale(s.longDescription, "en"),
    };
  }
  return {
    name: pickZh(s.name),
    description: pickZh(s.description),
    longDescription: pickZh(s.longDescription),
  };
}

const EMPTY_LOCALE: LocaleContent = { name: "", description: "", longDescription: "" };

// Generates a kebab-case slug from an arbitrary (English) name.
function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const EMPTY_FORM: FormState = {
  id: "",
  domain: SKILL_DOMAINS[0],
  author: "",
  version: "0.1.0",
  tagsCsv: "",
  githubRepoUrl: "",
  sourceUrl: "",
  locales: { en: { ...EMPTY_LOCALE }, zh: { ...EMPTY_LOCALE } },
};

function toForm(s: AdminSkill): FormState {
  return {
    id: s.id,
    domain: s.domain,
    author: s.author,
    version: s.version,
    tagsCsv: s.tags.join(", "),
    githubRepoUrl: s.githubRepoUrl ?? "",
    sourceUrl: s.sourceUrl ?? "",
    locales: { en: readLocale(s, "en"), zh: readLocale(s, "zh") },
  };
}

interface AdminSkillEditSheetProps {
  skill: AdminSkill | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function AdminSkillEditSheet({
  skill,
  open,
  onOpenChange,
  onSaved,
}: AdminSkillEditSheetProps) {
  const t = useTranslations("admin.edit");
  const [form, setForm] = useState<FormState | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  // Inline submit/validation error shown above the footer (replaces alert()).
  const [error, setError] = useState<string | null>(null);
  // The language tab currently being edited in the localized section.
  const [lang, setLang] = useState<LocaleCode>("en");
  // Tracks whether the user manually edited the id; once true, the id stops
  // auto-following the (English) name.
  const [idTouched, setIdTouched] = useState(false);
  const isCreate = skill === null;

  const update = api.skill.update.useMutation();

  useEffect(() => {
    setForm(skill ? toForm(skill) : { ...EMPTY_FORM, locales: { en: { ...EMPTY_LOCALE }, zh: { ...EMPTY_LOCALE } } });
    setFile(null);
    setIdTouched(false);
    setLang("en");
    setError(null);
  }, [skill]);

  if (!form) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl" />
      </Sheet>
    );
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  // Updates one field of one language's content.
  const setLoc = (code: LocaleCode, key: keyof LocaleContent, value: string) =>
    setForm((f) =>
      f
        ? { ...f, locales: { ...f.locales, [code]: { ...f.locales[code], [key]: value } } }
        : f,
    );

  // Editing the English name also seeds the id slug (while creating and the
  // user hasn't taken over the id manually).
  const onNameChange = (code: LocaleCode, value: string) => {
    setLoc(code, "name", value);
    if (code === "en" && isCreate && !idTouched) set("id", slugify(value));
  };

  const buildFormData = (): FormData => {
    const fd = new FormData();
    if (file) fd.set("package", file);
    fd.set("id", skill?.id ?? form.id);
    fd.set("nameEn", form.locales.en.name.trim());
    fd.set("nameZh", form.locales.zh.name.trim());
    fd.set("descriptionEn", form.locales.en.description.trim());
    fd.set("descriptionZh", form.locales.zh.description.trim());
    fd.set("longDescEn", form.locales.en.longDescription.trim());
    fd.set("longDescZh", form.locales.zh.longDescription.trim());
    fd.set("domain", form.domain);
    fd.set("author", form.author.trim());
    fd.set("version", form.version.trim());
    fd.set("tags", form.tagsCsv);
    fd.set("githubRepoUrl", form.githubRepoUrl.trim());
    fd.set("sourceUrl", form.sourceUrl.trim());
    fd.set("releaseDate", new Date().toISOString().slice(0, 10));
    return fd;
  };

  const handleSave = async () => {
    setError(null);
    // English is the primary, required language (matches the backend + the
    // public-site fallback). Block save and jump to the English tab if missing.
    if (!form.locales.en.name.trim()) {
      setLang("en");
      setError("英文名称为必填(主语言,前台缺其他语言时回退到它)");
      return;
    }
    if (isCreate && !file) {
      setError("新建 skill 必须上传 zip 包");
      return;
    }
    setBusy(true);
    try {
      if (isCreate) {
        const res = await fetch("/api/admin/skills", {
          method: "POST",
          body: buildFormData(),
        });
        if (!res.ok)
          throw new Error(
            ((await res.json()) as { error?: string }).error ?? "上传失败",
          );
      } else {
        // 元数据走 tRPC update
        await update.mutateAsync({
          id: skill.id,
          nameEn: form.locales.en.name.trim(),
          nameZh: form.locales.zh.name.trim() || null,
          domain: form.domain,
          author: form.author.trim(),
          version: form.version.trim(),
          descriptionEn: form.locales.en.description.trim(),
          descriptionZh: form.locales.zh.description.trim() || null,
          longDescEn: form.locales.en.longDescription.trim(),
          longDescZh: form.locales.zh.longDescription.trim() || null,
          tags: form.tagsCsv
            .split(",")
            .map((tg) => tg.trim())
            .filter(Boolean),
          githubRepoUrl: form.githubRepoUrl.trim() || null,
          sourceUrl: form.sourceUrl.trim() || null,
        });
        // 若另选了新 zip,换包
        if (file) {
          const fd = new FormData();
          fd.set("package", file);
          const res = await fetch(`/api/admin/skills/${skill.id}/package`, {
            method: "POST",
            body: fd,
          });
          if (!res.ok)
            throw new Error(
              ((await res.json()) as { error?: string }).error ?? "换包失败",
            );
        }
      }
      setFile(null);
      onSaved();
      onOpenChange(false);
      toast.success(isCreate ? "已创建 skill" : "已保存修改");
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  };

  const active = form.locales[lang];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{isCreate ? "新建 skill" : t("title")}</SheetTitle>
          <SheetDescription>
            {isCreate ? (
              "上传 skill 包(zip)并填写元数据"
            ) : (
              <>
                id <span className="font-[Menlo,monospace]">{skill.id}</span>
                {t("descSuffix")}
              </>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-4 pb-4">
          {/* 通用信息：与语言无关的字段 */}
          <section className="space-y-3">
            <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              {t("sectionGeneral")}
            </h3>
            <div className="space-y-1.5">
              <Label htmlFor="edit-pkg">
                {isCreate ? "Skill 包(zip,必填)" : "替换包(zip,可选)"}
              </Label>
              <Input
                id="edit-pkg"
                type="file"
                accept=".zip,application/zip"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            {isCreate && (
              <div className="space-y-1.5">
                <Label htmlFor="edit-id">id(自动从英文名生成,可改)</Label>
                <Input
                  id="edit-id"
                  value={form.id}
                  onChange={(e) => {
                    set("id", e.target.value);
                    setIdTouched(true);
                  }}
                  placeholder="my-skill"
                  className="font-[Menlo,monospace] text-xs"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{t("labelDomain")}</Label>
              <Select
                value={form.domain}
                onValueChange={(v) => set("domain", v)}
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-author">{t("labelAuthor")}</Label>
                <Input
                  id="edit-author"
                  value={form.author}
                  onChange={(e) => set("author", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-version">{t("labelVersion")}</Label>
                <Input
                  id="edit-version"
                  value={form.version}
                  onChange={(e) => set("version", e.target.value)}
                  placeholder="0.1.0"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-tags">{t("labelTags")}</Label>
              <Input
                id="edit-tags"
                value={form.tagsCsv}
                onChange={(e) => set("tagsCsv", e.target.value)}
                placeholder="design, prompt, automation"
              />
            </div>
          </section>

          {/* 多语言内容：按语言切换编辑 */}
          <section className="space-y-3">
            <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              {t("sectionLocalized")}
            </h3>

            {/* 语言切换 */}
            <div className="bg-muted/50 flex items-center gap-1 rounded-lg p-1">
              {LOCALES.map((l) => {
                const filled = form.locales[l.code].name.trim().length > 0;
                const isActive = lang === l.code;
                return (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setLang(l.code)}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {l.label}
                    {l.primary && (
                      <span className="bg-foreground/10 text-foreground/70 rounded px-1 py-0.5 text-[9px] font-medium tracking-wide uppercase">
                        {t("langPrimary")}
                      </span>
                    )}
                    {filled && (
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              {t("langHint")}
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="edit-name">
                {t("labelName")}
                {lang === "en" && (
                  <span className="text-destructive ml-0.5">*</span>
                )}
              </Label>
              <Input
                id="edit-name"
                value={active.name}
                onChange={(e) => onNameChange(lang, e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-desc">{t("labelShortDesc")}</Label>
              <Input
                id="edit-desc"
                value={active.description}
                onChange={(e) => setLoc(lang, "description", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-long">{t("labelLongDesc")}</Label>
              <Textarea
                id="edit-long"
                rows={5}
                value={active.longDescription}
                onChange={(e) => setLoc(lang, "longDescription", e.target.value)}
              />
            </div>
          </section>

          {/* 链接：与语言无关 */}
          <section className="space-y-3">
            <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              {t("sectionLinks")}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-gh">GitHub repo URL</Label>
                <Input
                  id="edit-gh"
                  value={form.githubRepoUrl}
                  onChange={(e) => set("githubRepoUrl", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-source">{t("labelSourceUrl")}</Label>
                <Input
                  id="edit-source"
                  value={form.sourceUrl}
                  onChange={(e) => set("sourceUrl", e.target.value)}
                />
              </div>
            </div>
          </section>
        </div>

        {error && (
          <div
            role="alert"
            className="border-destructive/30 bg-destructive/10 text-destructive mx-4 flex items-start gap-2 rounded-md border px-3 py-2 text-sm"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0 break-words">{error}</span>
          </div>
        )}

        <SheetFooter className="flex-row justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={busy}
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            {busy ? "保存中…" : t("save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
