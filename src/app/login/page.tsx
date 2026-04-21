"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { signIn } from "@/lib/auth-client";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(
    params.get("error") === "brak-uprawnien"
      ? "To konto nie ma uprawnień administratora."
      : null,
  );
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await signIn.email({ email, password });
      if (res.error) {
        setErr(res.error.message ?? "Nieprawidłowe dane logowania");
        return;
      }
      // Sprawdź czy user musi zmienić hasło (konto założone przez admina).
      try {
        const res = await fetch("/api/me/must-change-password", {
          cache: "no-store",
        });
        if (res.ok) {
          const data = (await res.json()) as {
            mustChangePassword?: boolean;
            role?: string;
            teamId?: string | null;
          };
          if (data.mustChangePassword) {
            router.push("/zmien-haslo?forced=1");
            router.refresh();
            return;
          }
          if (data.role === "captain" && data.teamId) {
            router.push(`/druzyny/${data.teamId}`);
            router.refresh();
            return;
          }
        }
      } catch {
        /* ignoruj i spadaj do default */
      }
      router.push("/admin");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-[1.1fr_1fr] gap-0 border-2 border-ink rise max-w-5xl mx-auto">
      <aside className="pitch-stripes text-chalk p-8 sm:p-12 relative min-h-[420px] flex flex-col justify-between">
        <div>
          <div className="mono text-[11px] uppercase tracking-[0.3em] text-lime">
            ★ Dostęp
          </div>
          <h1 className="display text-[clamp(3rem,7vw,6rem)] leading-[0.85] mt-2">
            Szatnia
            <br />
            <span className="text-lime">trenera</span>
            <span className="text-rust">.</span>
          </h1>
          <p className="mt-5 max-w-sm opacity-85">
            Zaloguj się, aby zarządzać drużynami, meczami i strzelcami. Konto
            z adresem admina dostaje pełne uprawnienia.
          </p>
        </div>
        <div className="mono text-[10px] uppercase tracking-[0.25em] opacity-70">
          Liga Szkolna · ZS Kętrzyn
        </div>
      </aside>

      <div className="bg-chalk p-8 sm:p-12">
        <div className="mb-6 display text-sm px-3 py-2 border-2 border-ink bg-ink text-lime inline-block">
          Logowanie
        </div>

        {err && (
          <div className="mb-5 border-2 border-rust bg-rust/10 text-rust px-3 py-2 text-sm">
            {err}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="E-mail">
            <input
              type="email"
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </Field>
          <Field label="Hasło">
            <input
              type="password"
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="current-password"
            />
          </Field>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? "..." : "Wejdź na boisko"}
          </button>
        </form>

        <div className="mt-8 pt-4 border-t-2 border-ink/10 text-center">
          <Link
            href="/"
            className="mono text-[11px] uppercase tracking-[0.3em] text-ink-soft hover:text-pitch"
          >
            ← powrót do ligi
          </Link>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mono text-[11px] uppercase tracking-[0.25em] text-ink-soft mb-1.5">
        {label}
      </div>
      {children}
    </div>
  );
}
