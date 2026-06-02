import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { SkillsMarketplace } from "@/components/skills/skills-marketplace";

export const metadata = {
  title: "Skills Marketplace - CherryIN",
  description:
    "Browse Skills and CLI extensions, ready-to-install productivity packs.",
};

export default function SkillsMarketplacePage() {
  return (
    <div className="bg-muted/30 text-foreground selection:bg-primary/30 relative min-h-screen w-full overflow-x-clip font-sans">
      <Header />
      <main className="relative z-10 flex w-full flex-col items-center">
        <Suspense fallback={null}>
          <SkillsMarketplace />
        </Suspense>
      </main>
    </div>
  );
}
