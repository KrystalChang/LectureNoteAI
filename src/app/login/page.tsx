import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <main className="min-h-[100dvh] grid place-items-center bg-[var(--bg)] px-4">
      <div
        className="w-full max-w-sm rounded-[calc(var(--radius)*1.6)] border border-[var(--border)] bg-[var(--surface)] px-8 py-10 text-center"
        style={{ boxShadow: "var(--shadow-lg)" }}
      >
        {/* Logo mark */}
        <div
          className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl text-2xl font-bold text-[var(--accent-fg)]"
          style={{ backgroundColor: "var(--accent)" }}
          aria-hidden
        >
          L
        </div>

        <h1 className="text-xl font-semibold text-[var(--text)]">
          LectureNoteAI
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
          登入後即可上傳講義、逐頁摘要與問答
        </p>

        <form
          className="mt-8"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <GoogleIcon />
            使用 Google 登入
          </button>
        </form>

        <p className="mt-6 text-xs leading-relaxed text-[var(--text-faint)]">
          登入即表示你同意我們處理你上傳的文件內容以生成摘要與問答。
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
