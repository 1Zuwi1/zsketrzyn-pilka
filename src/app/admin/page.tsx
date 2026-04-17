import Link from "next/link";
import { getMatches, getTeams } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const [teams, matches] = await Promise.all([getTeams(), getMatches()]);
  const played = matches.filter((m) => m.played).length;
  const upcoming = matches.length - played;

  return (
    <div className="space-y-8">
      <div className="grid sm:grid-cols-3 gap-5">
        <Card
          title="Drużyny"
          value={teams.length}
          href="/admin/druzyny"
          cta="Zarządzaj"
          tone="cream"
        />
        <Card
          title="Zaplanowane"
          value={upcoming}
          href="/admin/mecze"
          cta="Dodaj mecz"
          tone="lime"
        />
        <Card
          title="Rozegrane"
          value={played}
          href="/admin/mecze"
          cta="Wpisz wynik"
          tone="ink"
        />
      </div>
      <div className="card p-6 sm:p-8">
        <div className="mono text-[11px] uppercase tracking-[0.3em] text-ink-soft">
          Jak zacząć
        </div>
        <h2 className="display text-3xl mt-1 mb-4">Trzy kroki do startu ligi</h2>
        <ol className="space-y-3 text-base">
          <Step n={1}>
            Dodaj drużyny w{" "}
            <Link href="/admin/druzyny" className="underline text-pitch">
              zakładce Drużyny
            </Link>{" "}
            i wpisz składy.
          </Step>
          <Step n={2}>
            Zaplanuj mecze w{" "}
            <Link href="/admin/mecze" className="underline text-pitch">
              zakładce Mecze
            </Link>
            .
          </Step>
          <Step n={3}>
            Po gwizdku wpisz wynik i strzelców — tabela sama się zaktualizuje.
          </Step>
        </ol>
      </div>
    </div>
  );
}

function Step({
  n,
  children,
}: {
  n: number;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-4 items-start">
      <span className="display text-2xl text-pitch leading-none shrink-0">
        {String(n).padStart(2, "0")}
      </span>
      <span>{children}</span>
    </li>
  );
}

function Card({
  title,
  value,
  href,
  cta,
  tone,
}: {
  title: string;
  value: number;
  href: string;
  cta: string;
  tone: "cream" | "lime" | "ink";
}) {
  const cls =
    tone === "lime"
      ? "bg-lime text-ink border-ink"
      : tone === "ink"
        ? "bg-pitch text-cream border-ink"
        : "bg-chalk text-ink border-ink";
  return (
    <Link
      href={href}
      className={`card ${cls} p-6 block group hover:-translate-x-1 hover:-translate-y-1 transition-transform`}
    >
      <div className="mono text-[11px] uppercase tracking-[0.3em] opacity-80">
        {title}
      </div>
      <div className="display text-7xl leading-none mt-1">{value}</div>
      <div className="mono text-xs uppercase tracking-[0.2em] mt-4 flex items-center gap-1">
        {cta} <span className="group-hover:translate-x-1 transition-transform">→</span>
      </div>
    </Link>
  );
}
