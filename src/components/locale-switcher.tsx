"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { locales, localeLabels, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchLocale(newLocale: Locale) {
    document.cookie = `locale=${newLocale};path=/;max-age=31536000`;
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    // modal={false}: 不锁页面滚动 / 不加滚动条补偿,避免与 scrollbar-gutter 叠加导致的抖动
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-9 w-9", isPending && "opacity-50", className)}
          disabled={isPending}
        >
          <Globe className="h-4 w-4" />
          <span className="sr-only">Switch language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((l) => (
          <DropdownMenuItem
            key={l}
            onClick={() => switchLocale(l)}
            className={cn(
              "cursor-pointer",
              locale === l && "font-semibold bg-accent",
            )}
          >
            {localeLabels[l]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
