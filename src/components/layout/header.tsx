import Link from "next/link";

import { LocaleSwitcher } from "@/components/locale-switcher";

export function Header() {
  return (
    <header className="bg-background/80 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/skills_marketplace" className="font-semibold">
          CherryIN
        </Link>
        <nav className="text-muted-foreground flex items-center gap-4 text-sm">
          <Link href="/skills_marketplace" className="hover:text-foreground">
            Marketplace
          </Link>
          <Link href="/admin/skills" className="hover:text-foreground">
            Admin
          </Link>
          <LocaleSwitcher />
        </nav>
      </div>
    </header>
  );
}
