"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { changeOwnPassword } from "@/lib/user-actions";

export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      try {
        await changeOwnPassword(fd);
        setSuccess(true);
        form.reset();
        setTimeout(() => {
          router.push(forced ? "/" : "/");
          router.refresh();
        }, 800);
      } catch (err) {
        setError((err as Error).message || "Błąd zmiany hasła.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="card p-5 space-y-4">
      {error && (
        <div className="border-2 border-rust bg-rust/10 text-rust px-3 py-2 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="border-2 border-lime bg-lime/20 text-ink px-3 py-2 text-sm">
          Hasło zmienione. Przekierowuję…
        </div>
      )}
      <label className="block">
        <div className="mono text-[11px] uppercase tracking-[0.25em] text-ink-soft mb-1.5">
          Obecne hasło
        </div>
        <input
          name="currentPassword"
          type="password"
          required
          className="field w-full"
          autoComplete="current-password"
        />
      </label>
      <label className="block">
        <div className="mono text-[11px] uppercase tracking-[0.25em] text-ink-soft mb-1.5">
          Nowe hasło
        </div>
        <input
          name="newPassword"
          type="password"
          required
          minLength={6}
          className="field w-full"
          autoComplete="new-password"
        />
      </label>
      <label className="block">
        <div className="mono text-[11px] uppercase tracking-[0.25em] text-ink-soft mb-1.5">
          Powtórz nowe hasło
        </div>
        <input
          name="confirmPassword"
          type="password"
          required
          minLength={6}
          className="field w-full"
          autoComplete="new-password"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="btn-primary w-full disabled:opacity-50"
      >
        {pending ? "Zapisywanie…" : "Zmień hasło"}
      </button>
    </form>
  );
}
