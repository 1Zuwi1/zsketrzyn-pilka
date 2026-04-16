import Link from "next/link";
import { getTopScorers } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function ScorersPage() {
  const scorers = await getTopScorers();
  const totalGoals = scorers.reduce((n, s) => n + s.goals, 0);
  const top = scorers[0];

  let prevGoals: number | null = null;
  let lastRank = 0;
  const ranked = scorers.map((s, i) => {
    const rank = prevGoals === s.goals ? lastRank : i + 1;
    prevGoals = s.goals;
    lastRank = rank;
    return { ...s, rank };
  });

  return (
    <div className="space-y-10 rise">
      <section className="grid lg:grid-cols-[1.2fr_1fr] gap-0 border-2 border-ink">
        <div className="bg-cream p-8 sm:p-10 border-b-2 lg:border-b-0 lg:border-r-2 border-ink relative stripe">
          <div className="mono text-[11px] uppercase tracking-[0.3em] mb-4 text-ink-soft">
            Klasyfikacja · Sezon 2025/26
          </div>
          <h1 className="display text-[clamp(3rem,9vw,8rem)] leading-[0.82] tracking-tight">
            Król
            <br />
            <span className="text-pitch">strzel</span>
            <span className="text-rust">ców.</span>
          </h1>
          <p className="mt-6 max-w-md text-ink-soft leading-relaxed">
            Najskuteczniejsi zawodnicy ligi.
          </p>
        </div>
        <div className="pitch-stripes text-chalk p-8 sm:p-10 relative">
          <div className="grid grid-cols-2 gap-4">
            <Stat value={scorers.length} label="Strzelców" />
            <Stat value={totalGoals} label="Bramek" />
          </div>
          {top && (
            <div className="mt-8 border-t border-lime/40 pt-6">
              <div className="mono text-[11px] uppercase tracking-[0.3em] text-lime mb-2">
                ★ Lider strzelców
              </div>
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 border-2 border-lime flex items-center justify-center display text-xl shrink-0"
                  style={{ backgroundColor: top.teamColor }}
                >
                  {top.teamShortName.slice(0, 3).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="display text-2xl truncate">
                    {top.playerName}
                  </div>
                  <div className="mono text-xs opacity-80">
                    {top.goals} {pluralGoals(top.goals)} · {top.teamName}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {scorers.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="display text-5xl text-ink-soft">Brak bramek</div>
          <p className="mt-3 text-ink-soft">
            Gdy tylko ktoś trafi do siatki, pojawi się tutaj.
          </p>
        </div>
      ) : (
        <section>
          <div className="flex items-end justify-between mb-4">
            <h2 className="display text-3xl sm:text-4xl">Tabela strzelców</h2>
            <div className="mono text-[11px] uppercase tracking-[0.25em] text-ink-soft hidden sm:block">
              Miejsce · Zawodnik · Drużyna · Bramki
            </div>
          </div>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-ink text-lime">
                  <tr className="display text-xs tracking-[0.15em]">
                    <th className="px-3 py-3 text-left w-12">#</th>
                    <th className="px-3 py-3 text-left">Zawodnik</th>
                    <th className="px-3 py-3 text-left hidden sm:table-cell">
                      Drużyna
                    </th>
                    <th className="px-4 py-3 text-center bg-lime text-ink w-20">
                      Gole
                    </th>
                  </tr>
                </thead>
                <tbody className="mono text-sm">
                  {ranked.map((s) => {
                    const isLead = s.rank === 1;
                    return (
                      <tr
                        key={s.playerId}
                        className={`border-t-2 border-ink/10 transition-colors ${
                          isLead ? "bg-lime/20" : "hover:bg-cream-soft"
                        }`}
                      >
                        <td className="px-3 py-3">
                          <span
                            className={`display text-lg inline-flex items-center justify-center w-8 h-8 ${
                              isLead
                                ? "bg-ink text-lime"
                                : s.rank <= 3
                                  ? "bg-pitch text-cream"
                                  : "text-ink"
                            }`}
                          >
                            {s.rank}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="font-sans font-semibold text-base">
                            {s.playerName}
                          </span>
                        </td>
                        <td className="px-3 py-3 hidden sm:table-cell">
                          <Link
                            href={`/druzyny/${s.teamId}`}
                            className="flex items-center gap-2 hover:text-pitch group"
                          >
                            <span
                              className="inline-block w-4 h-4 border-2 border-ink shrink-0"
                              style={{ backgroundColor: s.teamColor }}
                            />
                            <span className="group-hover:underline">
                              {s.teamName}
                            </span>
                            <span className="tag bg-cream hidden md:inline-flex">
                              {s.teamShortName}
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-center display text-2xl">
                          {s.goals}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div>
      <div className="display text-5xl sm:text-6xl leading-none text-lime">
        {value}
      </div>
      <div className="mono text-[10px] uppercase tracking-[0.25em] opacity-80 mt-1">
        {label}
      </div>
    </div>
  );
}

function pluralGoals(n: number): string {
  if (n === 1) return "bramka";
  const last = n % 10;
  const tens = n % 100;
  if (last >= 2 && last <= 4 && !(tens >= 12 && tens <= 14)) return "bramki";
  return "bramek";
}
