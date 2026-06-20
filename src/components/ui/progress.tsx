"use client";

import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <ProgressPrimitive.Root
      className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900", className)}
      value={value}
    >
      <ProgressPrimitive.Indicator
        className="h-full bg-cyan-500 transition-transform"
        style={{ transform: `translateX(-${100 - value}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}
