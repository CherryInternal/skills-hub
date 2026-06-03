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
import { SKILL_DOMAINS, pickLocale } from "@/components/skills/skills-data";
import { api, type RouterOutputs } from "~/trpc/react";

export type AdminSkill = RouterOutputs["skill"]["adminList"][number];

interface FormState {
  name: string;
  domain: string;
  author: string;
  version: string;
  description: string;
  longDescription: string;
  tagsCsv: string;
  install: string;
  docsUrl: string;
  homepage: string;
  githubRepoUrl: string;
  sourceUrl: string;
}

function toForm(s: AdminSkill): FormState {
  return {
    name: pickLocale(s.name, "en"),
    domain: s.domain,
    author: s.author,
    version: s.version,
    description: pickLocale(s.description, "en"),
    longDescription: pickLocale(s.longDescription, "en"),
    tagsCsv: s.tags.join(", "),
    install: s.install,
    docsUrl: s.docsUrl,
    homepage: s.homepage ?? "",
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

  const update = api.skill.update.useMutation({
    onSuccess: () => {
      onSaved();
      onOpenChange(false);
    },
  });

  useEffect(() => {
    setForm(skill ? toForm(skill) : null);
  }, [skill]);

  if (!skill || !form) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl" />
      </Sheet>
    );
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const handleSave = () => {
    update.mutate({
      id: skill.id,
      nameEn: form.name.trim(),
      domain: form.domain,
      author: form.author.trim(),
      version: form.version.trim(),
      descriptionEn: form.description.trim(),
      longDescEn: form.longDescription.trim(),
      tags: form.tagsCsv
        .split(",")
        .map((tg) => tg.trim())
        .filter(Boolean),
      install: form.install.trim(),
      docsUrl: form.docsUrl.trim(),
      homepage: form.homepage.trim() || null,
      githubRepoUrl: form.githubRepoUrl.trim() || null,
      sourceUrl: form.sourceUrl.trim() || null,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetDescription>
            id <span className="font-[Menlo,monospace]">{skill.id}</span>
            {t("descSuffix")}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-4 pb-4">
          <section className="space-y-3">
            <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              {t("sectionBasic")}
            </h3>
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">{t("labelName")}</Label>
              <Input
                id="edit-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
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
              <Label htmlFor="edit-long">{t("labelLongDesc")}</Label>
              <Textarea
                id="edit-long"
                rows={5}
                value={form.longDescription}
                onChange={(e) => set("longDescription", e.target.value)}
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
            <div className="space-y-1.5">
              <Label htmlFor="edit-install">{t("labelInstall")}</Label>
              <Input
                id="edit-install"
                value={form.install}
                onChange={(e) => set("install", e.target.value)}
                className="font-[Menlo,monospace] text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-docs">Docs URL</Label>
                <Input
                  id="edit-docs"
                  value={form.docsUrl}
                  onChange={(e) => set("docsUrl", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-homepage">Homepage</Label>
                <Input
                  id="edit-homepage"
                  value={form.homepage}
                  onChange={(e) => set("homepage", e.target.value)}
                />
              </div>
            </div>
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
            disabled={update.isPending}
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            {update.isPending ? `${t("save")}…` : t("save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
