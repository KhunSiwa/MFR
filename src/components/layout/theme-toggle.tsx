"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const isDark = resolvedTheme === "dark";
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";

  return (
    <Button
      variant="secondary"
      size="icon"
      className="h-12 w-12 rounded-[1.35rem] border-slate-300/70 bg-white/80 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_10px_30px_rgba(15,23,42,0.10)] backdrop-blur hover:-translate-y-0.5 hover:bg-white dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_30px_rgba(0,0,0,0.35)] dark:hover:bg-slate-800"
      aria-label={isDark ? "สลับเป็นโหมดสว่าง" : "สลับเป็นโหมดมืด"}
      aria-pressed={isDark}
      title={isDark ? "สลับเป็นโหมดสว่าง" : "สลับเป็นโหมดมืด"}
      onClick={() => setTheme(nextTheme)}
    >
      {mounted && isDark ? (
        <Moon className="h-5 w-5 text-white transition-transform duration-300" />
      ) : (
        <Sun className="h-5 w-5 text-amber-500 transition-transform duration-300" />
      )}
    </Button>
  );
}
