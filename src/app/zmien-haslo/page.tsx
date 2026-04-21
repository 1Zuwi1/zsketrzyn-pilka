import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getMustChangePassword,
  getSession,
} from "@/lib/auth-helpers";
import { ChangePasswordForm } from "./form";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ forced?: string }>;
}) {
  const [session, sp] = await Promise.all([getSession(), searchParams]);
  if (!session?.user) redirect("/login");
  const forced =
    sp.forced === "1" || (await getMustChangePassword(session.user.id));

  return (
    <div className="max-w-md mx-auto rise space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="mono text-[11px] uppercase tracking-[0.3em] text-ink-soft">
          Bezpieczeństwo
        </div>
        {!forced && (
          <Link
            href="/"
            className="mono text-[11px] uppercase tracking-[0.3em] text-ink-soft hover:text-pitch"
          >
            ← powrót
          </Link>
        )}
      </div>
      <header className="card p-5">
        <h1 className="display text-3xl">Zmień hasło</h1>
        {forced ? (
          <p className="mt-2 text-sm text-ink-soft">
            Twoje konto zostało założone przez administratora. Zanim
            kontynuujesz, ustaw własne hasło.
          </p>
        ) : (
          <p className="mt-2 text-sm text-ink-soft">
            Ustaw nowe hasło do swojego konta.
          </p>
        )}
      </header>
      <ChangePasswordForm forced={forced} />
    </div>
  );
}
