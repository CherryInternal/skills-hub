import Link from "next/link";

import { LocaleSwitcher } from "@/components/locale-switcher";

export function Header() {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 border-border/40 sticky top-0 z-50 w-full border-b backdrop-blur-lg">
      <nav className="flex h-16 w-full items-center justify-between px-5">
        <Link
          href="/skills_marketplace"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/cherryin-logo.svg"
            alt="CherryIN"
            width={26}
            height={26}
            className="dark:brightness-0 dark:invert"
          />
          <span className="text-foreground text-base font-bold tracking-tight">
            CherryIN
          </span>
        </Link>
        <LocaleSwitcher />
      </nav>
    </header>
  );
}
