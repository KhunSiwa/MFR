import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "default" | "good" | "warning" | "elevated" | "critical" | "muted";

const tones: Record<BadgeTone, string> = {
  default: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200",
  good: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  warning: "bg-yellow-100 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-200",
  elevated: "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200",
  critical: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  muted: "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
};

export function Badge({
  className,
  tone = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-md px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
