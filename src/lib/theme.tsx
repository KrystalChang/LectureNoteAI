"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Appearance = "light" | "dark" | "system";

export const APPEARANCE_KEY = "lna.appearance";
export const ACCENT_KEY = "lna.accent";
export const DEFAULT_ACCENT = "#4f46e5";

export const ACCENT_PRESETS: Array<{ name: string; value: string }> = [
  { name: "Indigo", value: "#4f46e5" },
  { name: "Blue", value: "#2563eb" },
  { name: "Violet", value: "#7c3aed" },
  { name: "Emerald", value: "#059669" },
  { name: "Teal", value: "#0d9488" },
  { name: "Rose", value: "#e11d48" },
  { name: "Amber", value: "#d97706" },
  { name: "Slate", value: "#475569" },
];

type ThemeContextValue = {
  appearance: Appearance;
  accent: string;
  resolved: "light" | "dark";
  setAppearance: (value: Appearance) => void;
  setAccent: (value: string) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemPrefersDark() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readAppearance(): Appearance {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(APPEARANCE_KEY);
  return stored === "light" || stored === "dark" || stored === "system"
    ? stored
    : "system";
}

function readAccent(): string {
  if (typeof window === "undefined") return DEFAULT_ACCENT;
  return window.localStorage.getItem(ACCENT_KEY) || DEFAULT_ACCENT;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setAppearanceState] = useState<Appearance>(readAppearance);
  const [accent, setAccentState] = useState<string>(readAccent);
  const [systemDark, setSystemDark] = useState<boolean>(systemPrefersDark);

  const resolved: "light" | "dark" =
    appearance === "dark" || (appearance === "system" && systemDark)
      ? "dark"
      : "light";

  // Apply the resolved theme to <html>. The DOM is an external system, so this
  // is the correct place for the side effect.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.style.setProperty("--accent", accent);
  }, [resolved, accent]);

  // Track OS theme changes while in "system" mode.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setSystemDark(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const setAppearance = useCallback((value: Appearance) => {
    setAppearanceState(value);
    window.localStorage.setItem(APPEARANCE_KEY, value);
  }, []);

  const setAccent = useCallback((value: string) => {
    setAccentState(value);
    window.localStorage.setItem(ACCENT_KEY, value);
  }, []);

  const value = useMemo(
    () => ({ appearance, accent, resolved, setAppearance, setAccent }),
    [appearance, accent, resolved, setAppearance, setAccent],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

/** Inline script that applies the saved theme before first paint (no flash). */
export const THEME_PREINIT_SCRIPT = `(function(){try{var a=localStorage.getItem('${APPEARANCE_KEY}')||'system';var c=localStorage.getItem('${ACCENT_KEY}')||'${DEFAULT_ACCENT}';var d=a==='dark'||(a==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.setProperty('--accent',c);}catch(e){}})();`;
