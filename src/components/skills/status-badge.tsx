import { Clock, Eye, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { statusLabel, type SubmissionStatus } from "./skills-storage";

const STATUS_STYLES: Record<
  SubmissionStatus,
  { Icon: typeof Clock; className: string }
> = {
  pending: {
    Icon: Clock,
    className:
      "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300",
  },
  reviewing: {
    Icon: Eye,
    className:
      "bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300",
  },
  changes_requested: {
    Icon: AlertCircle,
    className:
      "bg-orange-500/10 text-orange-700 ring-orange-500/20 dark:text-orange-300",
  },
  approved: {
    Icon: CheckCircle2,
    className:
      "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
  },
  rejected: {
    Icon: XCircle,
    className:
      "bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-300",
  },
};

interface StatusBadgeProps {
  status: SubmissionStatus;
  size?: "xs" | "sm";
  className?: string;
}

export function StatusBadge({
  status,
  size = "xs",
  className,
}: StatusBadgeProps) {
  const { Icon, className: variantClassName } = STATUS_STYLES[status];
  const sizing =
    size === "xs"
      ? "h-5 px-1.5 text-[10px] gap-1"
      : "h-6 px-2 text-xs gap-1.5";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium ring-1 ring-inset",
        sizing,
        variantClassName,
        className,
      )}
    >
      <Icon className={size === "xs" ? "size-3" : "size-3.5"} strokeWidth={2} />
      {statusLabel(status)}
    </span>
  );
}
