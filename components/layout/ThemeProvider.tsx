"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "theme";

function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

function applyResolvedTheme(resolved: "light" | "dark") {
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.style.colorScheme = resolved;
}

const ThemeContext = createContext<{
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
} | null>(null);

// Mirrors what the beforeInteractive script in app/layout.tsx already did
// synchronously before hydration (see that script for why) -- this just
// keeps React's state in sync with it and reacts to later changes (the
// toggle, or the OS preference changing while "system" is selected).
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const initial: Theme = stored === "light" || stored === "dark" ? stored : "system";
    // localStorage/matchMedia don't exist during SSR, so this can't be a
    // lazy useState initializer without the server and client's first
    // render disagreeing (a real hydration mismatch) -- the brief
    // default-state render before this effect runs is the deliberate
    // tradeoff (the beforeInteractive script in app/layout.tsx already
    // applied the real theme's class to <html> before paint; this is only
    // for React-rendered UI that reads theme/resolvedTheme, e.g. ThemeToggle's
    // icon).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(initial);
    setResolvedTheme(resolveTheme(initial));

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function onSystemChange() {
      setThemeState((current) => {
        if (current === "system") {
          const resolved = resolveTheme("system");
          setResolvedTheme(resolved);
          applyResolvedTheme(resolved);
        }
        return current;
      });
    }
    media.addEventListener("change", onSystemChange);
    return () => media.removeEventListener("change", onSystemChange);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      if (next === "system") {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, next);
      }
    } catch {
      // Storage unavailable (private browsing, quota) -- the choice just
      // won't persist across reloads.
    }
    const resolved = resolveTheme(next);
    setResolvedTheme(resolved);
    applyResolvedTheme(resolved);
  }, []);

  return <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
