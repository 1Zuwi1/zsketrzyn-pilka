import Link from "next/link";
import { requireAdmin } from "@/lib/auth-helpers";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <div className="space-y-8 rise">
      <div className="card bg-pitch text-cream p-6 sm:p-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="mono text-[11px] uppercase tracking-[0.3em] opacity-80">
            ★ Panel administratora
          </div>
          <div className="display text-4xl sm:text-5xl leading-none mt-1 text-cream">
            Strefa<span className="text-lime">.</span>Szatnia
          </div>
        </div>
        <nav className="flex gap-2 flex-wrap">
          <AdminLink href="/admin">Start</AdminLink>
          <AdminLink href="/admin/druzyny">Drużyny</AdminLink>
          <AdminLink href="/admin/mecze">Mecze</AdminLink>
          <AdminLink href="/admin/uzytkownicy">Użytkownicy</AdminLink>
          <AdminLink href="/admin/backup">Backup</AdminLink>
        </nav>
      </div>
      {children}
    </div>
  );
}

function AdminLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="display text-sm tracking-[0.08em] px-3 py-2 border-2 border-lime text-lime hover:bg-lime hover:text-ink transition-colors"
    >
      {children}
    </Link>
  );
}
