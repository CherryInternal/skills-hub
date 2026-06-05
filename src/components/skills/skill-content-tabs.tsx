"use client";

import { useTranslations } from "next-intl";
import { ScrollText, FolderTree } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SkillMarkdown } from "./skill-markdown";
import { PackageFileBrowser } from "./package-file-browser";

// Full-page main content: SKILL.md / Files as GitHub-style tabs (instead of
// stacking them, which is both tall and redundant).
export function SkillContentTabs({
  skillMd,
  skillId,
  hasPackage,
}: {
  skillMd: string | null;
  skillId: string;
  hasPackage: boolean;
}) {
  const t = useTranslations("detail");

  return (
    <Tabs defaultValue={skillMd ? "readme" : "files"} className="gap-3">
      <TabsList>
        {skillMd && (
          <TabsTrigger value="readme" className="gap-1.5">
            <ScrollText className="size-3.5" />
            SKILL.md
          </TabsTrigger>
        )}
        {hasPackage && (
          <TabsTrigger value="files" className="gap-1.5">
            <FolderTree className="size-3.5" />
            {t("packageContents")}
          </TabsTrigger>
        )}
      </TabsList>

      {skillMd && (
        <TabsContent value="readme">
          <div className="border-border bg-card rounded-xl border p-5 dark:border-white/[0.12]">
            <SkillMarkdown>{skillMd}</SkillMarkdown>
          </div>
        </TabsContent>
      )}

      {hasPackage && (
        <TabsContent value="files">
          <PackageFileBrowser skillId={skillId} hasPackage={hasPackage} />
        </TabsContent>
      )}
    </Tabs>
  );
}
