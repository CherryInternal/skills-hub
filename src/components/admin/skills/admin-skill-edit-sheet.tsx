"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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

interface FormState {
  id: string;
  name: string;
  nameZh: string;
  domain: string;
  author: string;
  version: string;
  description: string;
  descriptionZh: string;
  longDescription: string;
  longDescriptionZh: string;
  tagsCsv: string;
  githubRepoUrl: string;
  sourceUrl: string;
}

// Extracts the Chinese translation directly (no English fallback). The skill
// content fields are `string | { en; zh? }`; only the object form carries `zh`.
function pickZh(value: LocalizedString | undefined): string {
  if (value && typeof value === "object") return value.zh ?? "";
  return "";
}

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
  name: "",
  nameZh: "",
  domain: SKILL_DOMAINS[0],
  author: "",
  version: "0.1.0",
  description: "",
  descriptionZh: "",
  longDescription: "",
  longDescriptionZh: "",
  tagsCsv: "",
  githubRepoUrl: "",
  sourceUrl: "",
};

function toForm(s: AdminSkill): FormState {
  return {
    id: s.id,
    name: pickLocale(s.name, "en"),
    nameZh: pickZh(s.name),
    domain: s.domain,
    author: s.author,
    version: s.version,
    description: pickLocale(s.description, "en"),
    descriptionZh: pickZh(s.description),
    longDescription: pickLocale(s.longDescription, "en"),
    longDescriptionZh: pickZh(s.longDescription),
    tagsCsv: s.tags.join(", "),
    githubRepoUrl: s.githubRepoUrl ?? "",
    sourceUrl: s.sourceUrl ?? "",
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
  // Tracks whether the user manually edited the id; once true, the id stops
  // auto-following the (English) name.
  const [idTouched, setIdTouched] = useState(false);
  const isCreate = skill === null;

  const update = api.skill.update.useMutation();

  useEffect(() => {
    setForm(skill ? toForm(skill) : { ...EMPTY_FORM });
    setFile(null);
    setIdTouched(false);
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

  // Updates the English name and, while creating a new skill and the user
  // hasn't manually touched the id, keeps the id in sync as a slug.
  const onNameChange = (value: string) => {
    set("name", value);
    if (isCreate && !idTouched) set("id", slugify(value));
  };

  const buildFormData = (): FormData => {
    const fd = new FormData();
    if (file) fd.set("package", file);
    fd.set("id", skill?.id ?? form.id);
    fd.set("nameEn", form.name.trim());
    fd.set("nameZh", form.nameZh.trim());
    fd.set("descriptionEn", form.description.trim());
    fd.set("descriptionZh", form.descriptionZh.trim());
    fd.set("longDescEn", form.longDescription.trim());
    fd.set("longDescZh", form.longDescriptionZh.trim());
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
    setBusy(true);
    try {
      if (isCreate) {
        if (!file) {
          alert("新建 skill 必须上传 zip 包");
          return;
        }
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
          nameEn: form.name.trim(),
          nameZh: form.nameZh.trim() || null,
          domain: form.domain,
          author: form.author.trim(),
          version: form.version.trim(),
          descriptionEn: form.description.trim(),
          descriptionZh: form.descriptionZh.trim() || null,
          longDescEn: form.longDescription.trim(),
          longDescZh: form.longDescriptionZh.trim() || null,
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
    } catch (e) {
      alert(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  };

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
          <section className="space-y-3">
            <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              {t("sectionBasic")}
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
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">{t("labelName")} / Name (EN)</Label>
              <Input
                id="edit-name"
                value={form.name}
                onChange={(e) => onNameChange(e.target.value)}
              />
            </div>
            {isCreate && (
              <div className="space-y-1.5">
                <Label htmlFor="edit-id">id(自动从名称生成,可改)</Label>
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
              <Label htmlFor="edit-name-zh">名称(中文)</Label>
              <Input
                id="edit-name-zh"
                value={form.nameZh}
                onChange={(e) => set("nameZh", e.target.value)}
              />
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
          </section>

          <section className="space-y-3">
            <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              {t("sectionContent")}
            </h3>
            <div className="space-y-1.5">
              <Label htmlFor="edit-desc">{t("labelShortDesc")}</Label>
              <Input
                id="edit-desc"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-desc-zh">简短描述(中文)</Label>
              <Input
                id="edit-desc-zh"
                value={form.descriptionZh}
                onChange={(e) => set("descriptionZh", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-long">{t("labelLongDesc")}</Label>
              <Textarea
                id="edit-long"
                rows={5}
                value={form.longDescription}
                onChange={(e) => set("longDescription", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-long-zh">完整描述(中文)</Label>
              <Textarea
                id="edit-long-zh"
                rows={5}
                value={form.longDescriptionZh}
                onChange={(e) => set("longDescriptionZh", e.target.value)}
              />
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

          <section className="space-y-3">
            <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              {t("sectionInstall")}
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
