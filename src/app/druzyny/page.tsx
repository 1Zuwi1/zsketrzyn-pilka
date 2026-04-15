import Link from "next/link";
import { getPlayers, getTeams } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const [teams, players] = await Promise.all([getTeams(), getPlayers()]);
  const counts = new Map<string, number>();
  for (const p of players) counts.set(p.teamId, (counts.get(p.teamId) ?? 0) + 1);

  return (
    <div className="space-y-10 rise">
      <header className="border-b-2 border-ink pb-6">
        <div className="mono text-[11px] uppercase tracking-[0.3em] text-ink-soft">
          Zespoły ligi
        </div>
        <h1 className="display text-[clamp(3rem,8vw,7rem)] leading-[0.85]">
          Dru<span className="text-pitch">żyny</span>
          <span className="text-rust">.</span>
        </h1>
      </header>

      {teams.length === 0 ? (
        <div className="card p-10 text-center text-ink-soft italic">
          Brak drużyn.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {teams.map((t, i) => (
            <Link
              key={t.id}
              href={`/druzyny/${t.id}`}
              className="card group relative overflow-hidden p-0 transition-transform hover:-translate-x-1 hover:-translate-y-1"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div
                className="h-28 border-b-2 border-ink flex items-end p-4 relative"
                style={{ backgroundColor: t.color }}
              >
                <div className="absolute inset-0 opacity-10 [background:repeating-linear-gradient(45deg,transparent_0_8px,rgba(0,0,0,0.3)_8px_10px)]" />
                <span className="display text-5xl text-chalk mix-blend-difference relative">
                  {t.shortName.slice(0, 3).toUpperCase()}
                </span>
              </div>
              <div className="p-4 flex items-center justify-between bg-chalk">
                <div>
                  <div className="display text-xl group-hover:text-pitch transition-colors">
                    {t.name}
                  </div>
                  <div className="mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
                    {counts.get(t.id) ?? 0} zawodników
                  </div>
                </div>
                <span className="display text-pitch text-2xl group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
