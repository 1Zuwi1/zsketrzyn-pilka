"use client";
import { useState, useTransition } from "react";
import { resetUserPassword } from "@/lib/user-actions";

export function ResetPasswordButton({
  userId,
  userEmail,
  variant = "link",
}: {
  userId: string;
  userEmail: string;
  variant?: "link" | "button";
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    password: string;
    email: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    if (
      !window.confirm(
        `Zresetować hasło konta ${userEmail}? Wszystkie aktywne sesje zostaną zakończone, a użytkownik będzie musiał ustawić nowe hasło przy pierwszym logowaniu.`,
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("userId", userId);
        const res = await resetUserPassword(fd);
        setResult({ password: res.password, email: res.email });
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  const cls =
    variant === "button"
      ? "btn-ghost text-xs"
      : "mono text-[11px] uppercase tracking-[0.2em] text-amber hover:underline";

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className={`${cls} disabled:opacity-50`}
      >
        {pending ? "…" : "reset hasła"}
      </button>
      {error && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="card p-5 max-w-md w-full space-y-3">
            <div className="display text-xl text-rust">Błąd</div>
            <div className="text-sm">{error}</div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="btn-ghost text-sm"
            >
              Zamknij
            </button>
          </div>
        </div>
      )}
      {result && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="card p-5 max-w-md w-full space-y-4">
            <div className="mono text-[11px] uppercase tracking-[0.3em] text-ink-soft">
              Hasło zresetowane
            </div>
            <div className="display text-2xl">Przekaż kapitanowi</div>
            <div className="text-sm">
              Konto <span className="mono">{result.email}</span> ma nowe
              tymczasowe hasło. Przy pierwszym logowaniu użytkownik zostanie
              poproszony o jego zmianę.
            </div>
            <div className="border-2 border-ink bg-cream-soft p-4">
              <div className="mono text-[11px] uppercase tracking-[0.25em] text-ink-soft">
                Tymczasowe hasło
              </div>
              <div className="display text-3xl tracking-[0.1em] select-all break-all">
                {result.password}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(result.password);
                }}
                className="btn-ghost text-sm"
              >
                Kopiuj hasło
              </button>
              <button
                type="button"
                onClick={() => setResult(null)}
                className="btn-primary text-sm"
              >
                OK, zamykam
              </button>
            </div>
            <p className="mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
              ⚠ Hasło nie będzie już nigdzie widoczne — skopiuj je teraz.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
