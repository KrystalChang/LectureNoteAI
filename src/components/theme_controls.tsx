"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Monitor, Moon, Palette, Sun } from "lucide-react";
import {
  ACCENT_PRESETS,
  Appearance,
  useTheme,
} from "@/lib/theme";

const APPEARANCE_OPTIONS: Array<{
  value: Appearance;
  label: string;
  icon: typeof Sun;
}> = [
  { value: "light", label: "淺色", icon: Sun },
  { value: "dark", label: "深色", icon: Moon },
  { value: "system", label: "系統", icon: Monitor },
];

export default function ThemeControls() {
  const { appearance, accent, setAppearance, setAccent } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="btn btn-ghost"
        aria-label="外觀設定"
        title="外觀設定"
        aria-expanded={open}
      >
        <Palette className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">外觀</span>
      </button>

      {open && (
        <div
          className="card absolute right-0 top-11 z-50 w-64 p-4"
          style={{ boxShadow: "var(--shadow-lg)" }}
        >
          <p className="mb-2 text-xs font-semibold text-muted">主題模式</p>
          <div className="grid grid-cols-3 gap-2">
            {APPEARANCE_OPTIONS.map(({ value, label, icon: Icon }) => {
              const active = appearance === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAppearance(value)}
                  className="flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs transition-colors"
                  style={{
                    borderColor: active ? "var(--accent)" : "var(--border)",
                    background: active ? "var(--surface-2)" : "transparent",
                    color: active ? "var(--accent)" : "var(--text-muted)",
                  }}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </button>
              );
            })}
          </div>

          <p className="mb-2 mt-4 text-xs font-semibold text-muted">主題色</p>
          <div className="flex flex-wrap gap-2">
            {ACCENT_PRESETS.map((preset) => {
              const active =
                accent.toLowerCase() === preset.value.toLowerCase();
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setAccent(preset.value)}
                  title={preset.name}
                  aria-label={preset.name}
                  className="flex h-7 w-7 items-center justify-center rounded-full transition-transform hover:scale-110"
                  style={{
                    background: preset.value,
                    outline: active ? "2px solid var(--text)" : "none",
                    outlineOffset: "2px",
                  }}
                >
                  {active && (
                    <Check className="h-4 w-4 text-white" aria-hidden="true" />
                  )}
                </button>
              );
            })}
            <label
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border"
              style={{ borderColor: "var(--border-strong)" }}
              title="自訂顏色"
            >
              <input
                type="color"
                value={accent}
                onChange={(event) => setAccent(event.target.value)}
                className="h-0 w-0 opacity-0"
                aria-label="自訂主題色"
              />
              <Palette className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
