import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getLocale } from "next-intl/server";

import { api } from "~/trpc/server";
import { pickLocale } from "@/components/skills/skills-data";
import { PackageFileBrowser } from "@/components/skills/package-file-browser";

// Full-page skill view (SSR) — the roomy counterpart to the preview Sheet,
// where the whole package can be browsed.
export default async function SkillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const skill = await api.skill.getById({ id });
  if (!skill) notFound();

  const locale = await getLocale();
  const name = pickLocale(skill.name, locale);

  return (
    <main className="bg-muted/20 min-h-screen">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <nav className="text-muted-foreground/70 mb-4 flex items-center gap-1 text-xs">
          <Link href="/" className="hover:text-foreground">
            Skills
          </Link>
          <ChevronRight className="size-3" />
          <span>{skill.domain}</span>
          <ChevronRight className="size-3" />
          <span className="text-foreground">{name}</span>
        </nav>

        <h1 className="text-foreground text-2xl font-bold tracking-tight">
          {name}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {skill.author}
          <span className="text-muted-foreground/40"> · </span>
          <span className="font-[Menlo,monospace]">v{skill.version}</span>
        </p>
        <p className="text-foreground/80 mt-3 max-w-prose text-sm leading-relaxed">
          {pickLocale(skill.description, locale)}
        </p>

        <div className="mt-6">
          <PackageFileBrowser
            skillId={skill.id}
            hasPackage={!!skill.hasPackage}
          />
        </div>
      </div>
    </main>
  );
}
