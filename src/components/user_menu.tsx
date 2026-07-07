"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { signOutAction } from "@/app/actions/auth";

export type SessionUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export default function UserMenu({ user }: { user?: SessionUser | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!user) return null;

  const label = user.name || user.email || "使用者";
  const initial = (user.name || user.email || "?").charAt(0).toUpperCase();

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
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
