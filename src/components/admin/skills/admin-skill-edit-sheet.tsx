"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
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

const EMPTY_FORM: FormState = {
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
  const locale = useLocale();
  const [form, setForm] = useState<FormState | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  // Field-level validation / submit errors, keyed by field name.
  const [errors, setErrors] = useState<Record<string, string>>({});
  // The language tab currently being edited in the localized section.
  const [lang, setLang] = useState<LocaleCode>("en");
  const isCreate = skill === null;

  const update = api.skill.update.useMutation();

  useEffect(() => {
    // Reset every time the sheet opens, not only when `skill` changes: a
    // "new skill" open keeps skill === null, so depending on `skill` alone
    // would let a canceled draft (and its File) survive into the next create.
    if (!open) return;
    setForm(skill ? toForm(skill) : { ...EMPTY_FORM, locales: { en: { ...EMPTY_LOCALE }, zh: { ...EMPTY_LOCALE } } });
    setFile(null);
    setLang("en");
    setErrors({});
  }, [skill, open]);

  if (!form) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl" />
      </Sheet>
    );
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  // Clears one field's error (called on edit, so a fixed field stops showing red).
  const clearErr = (key: string) =>
    setErrors((e) => {
      if (!(key in e)) return e;
      const rest = { ...e };
      delete rest[key];
      return rest;
    });

  // Updates one field of one language's content.
  const setLoc = (code: LocaleCode, key: keyof LocaleContent, value: string) =>
    setForm((f) =>
      f
        ? { ...f, locales: { ...f.locales, [code]: { ...f.locales[code], [key]: value } } }
        : f,
    );

  const onNameChange = (code: LocaleCode, value: string) => {
    setLoc(code, "name", value);
    if (code === "en") clearErr("name");
  };

  const buildFormData = (): FormData => {
    const fd = new FormData();
    if (file) fd.set("package", file);
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
    // Client-side field validation (mirrors backend requirements + what the
    // storefront renders): English name, author, version, and a zip on create.
    // Errors render inline under each field rather than as a toast/banner.
    const errs: Record<string, string> = {};
    if (!form.locales.en.name.trim()) errs.name = "英文名称为必填(主语言)";
    if (!form.author.trim()) errs.author = "作者必填";
    if (!form.version.trim()) errs.version = "版本号必填";
    if (isCreate && !file) errs.package = "新建 skill 必须上传 zip 包";
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      if (errs.name) setLang("en"); // jump to the English tab so its error shows
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      if (isCreate) {
        const res = await fetch("/api/admin/skills", {
          method: "POST",
          body: buildFormData(),
        });
        if (!res.ok) {
          const msg =
            ((await res.json()) as { error?: string }).error ?? "上传失败";
          setErrors({ package: msg });
          return;
        }
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
          if (!res.ok) {
            const msg =
              ((await res.json()) as { error?: string }).error ?? "换包失败";
            setErrors({ package: msg });
            return;
          }
        }
      }
      setFile(null);
      onSaved();
      onOpenChange(false);
      toast.success(isCreate ? "已创建 skill" : "已保存修改");
    } catch (e) {
      setErrors({ form: e instanceof Error ? e.message : "保存失败" });
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
                正在编辑「{pickLocale(skill.name, locale)}」{t("descSuffix")}
              </>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-4 pb-4">
          {errors.form && (
            <p className="text-destructive text-sm">{errors.form}</p>
          )}
          {/* 通用信息：与语言无关的字段 */}
          <section className="space-y-3">
            <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              {t("sectionGeneral")}
            </h3>
            <div className="space-y-1.5">
              <Label htmlFor="edit-pkg">
                {isCreate ? "Skill 包" : "替换包"}
                {isCreate && <span className="text-destructive ml-0.5">*</span>}
              </Label>
              <Input
                id="edit-pkg"
                type="file"
                accept=".zip,application/zip"
                aria-invalid={!!errors.package || undefined}
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  clearErr("package");
                }}
              />
              {errors.package && (
                <p className="text-destructive text-xs">{errors.package}</p>
              )}
            </div>
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
                <Label htmlFor="edit-author">
                  {t("labelAuthor")}
                  <span className="text-destructive ml-0.5">*</span>
                </Label>
                <Input
                  id="edit-author"
                  value={form.author}
                  aria-invalid={!!errors.author || undefined}
                  onChange={(e) => {
                    set("author", e.target.value);
                    clearErr("author");
                  }}
                />
                {errors.author && (
                  <p className="text-destructive text-xs">{errors.author}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-version">
                  {t("labelVersion")}
                  <span className="text-destructive ml-0.5">*</span>
                </Label>
                <Input
                  id="edit-version"
                  value={form.version}
                  aria-invalid={!!errors.version || undefined}
                  onChange={(e) => {
                    set("version", e.target.value);
                    clearErr("version");
                  }}
                  placeholder="0.1.0"
                />
                {errors.version && (
                  <p className="text-destructive text-xs">{errors.version}</p>
                )}
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
                aria-invalid={(lang === "en" && !!errors.name) || undefined}
                onChange={(e) => onNameChange(lang, e.target.value)}
              />
              {lang === "en" && errors.name && (
                <p className="text-destructive text-xs">{errors.name}</p>
              )}
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
