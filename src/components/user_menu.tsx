"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, LogOut, Sparkles } from "lucide-react";
import { signOutAction } from "@/app/actions/auth";

export type SessionUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

type AiQuota = {
  month: string;
  limit: number;
  used: number;
  remaining: number;
};

export default function UserMenu({ user }: { user?: SessionUser | null }) {
  const [open, setOpen] = useState(false);
  const [quota, setQuota] = useState<AiQuota | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [quotaError, setQuotaError] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const quotaRequestRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function loadQuota() {
    const requestId = ++quotaRequestRef.current;
    setQuotaLoading(true);
    setQuotaError("");
    try {
      const response = await fetch("/api/ai/quota", { cache: "no-store" });
      const data = (await response.json()) as {
        quota?: AiQuota;
        error?: string;
      };
      if (!response.ok || !data.quota) {
        throw new Error(data.error || "Failed to load AI quota");
      }
      if (requestId === quotaRequestRef.current) setQuota(data.quota);
    } catch {
      if (requestId === quotaRequestRef.current) {
        setQuotaError("無法載入 AI 額度");
      }
    } finally {
      if (requestId === quotaRequestRef.current) setQuotaLoading(false);
    }
  }

  function toggleMenu() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) void loadQuota();
  }

  if (!user) return null;

  const label = user.name || user.email || "使用者";
  const initial = (user.name || user.email || "?").charAt(0).toUpperCase();

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={toggleMenu}
        className="flex items-center gap-2 rounded-full border border-[var(--border)] p-0.5 pr-2 transition-colors hover:bg-[var(--surface-hover)]"
        aria-label="使用者選單"
        aria-expanded={open}
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt=""
            className="h-7 w-7 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--accent)] text-xs font-semibold text-[var(--accent-fg)]">
            {initial}
          </span>
        )}
        <span className="hidden max-w-[8rem] truncate text-sm text-[var(--text)] sm:inline">
          {label}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-30 min-w-56 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium text-[var(--text)]">
              {user.name || "已登入"}
            </p>
            {user.email && (
              <p className="truncate text-xs text-[var(--text-muted)]">
                {user.email}
              </p>
            )}
          </div>
          <div className="my-1 h-px bg-[var(--border)]" />
          <div className="px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--text)]">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                本月 AI 額度
              </span>
              {quotaLoading ? (
                <LoaderCircle
                  className="h-3.5 w-3.5 animate-spin text-[var(--text-muted)]"
                  aria-label="載入額度中"
                />
              ) : quota ? (
                <span className="text-xs tabular-nums text-[var(--text-muted)]">
                  {quota.used} / {quota.limit}
                </span>
              ) : null}
            </div>

            {quota && !quotaLoading && (
              <>
                <div
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface-hover)]"
                  role="progressbar"
                  aria-label="本月 AI 額度使用量"
                  aria-valuemin={0}
                  aria-valuemax={quota.limit}
                  aria-valuenow={quota.used}
                >
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-[width]"
                    style={{
                      width: `${Math.min(100, (quota.used / quota.limit) * 100)}%`,
                    }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                  剩餘 {quota.remaining} 次 · {quota.month}
                </p>
              </>
            )}

            {quotaError && (
              <p className="mt-1.5 text-xs text-red-600">{quotaError}</p>
            )}
          </div>
          <div className="my-1 h-px bg-[var(--border)]" />
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-[var(--text)] transition-colors hover:bg-[var(--surface-hover)]"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              登出
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
