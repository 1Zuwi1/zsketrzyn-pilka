import Link from "next/link";
import { getMatches, getTeams } from "@/lib/repo";
import { computeStandings } from "@/lib/standings";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [teams, matches] = await Promise.all([getTeams(), getMatches()]);
  const standings = computeStandings(teams, matches);
  const leader = standings[0];
  const played = matches.filter((m) => m.played).length;
  const goals = matches.reduce(
    (n, m) =>
      n + (m.played ? (m.homeScore ?? 0) + (m.awayScore ?? 0) : 0),
    0,
  );

  return (
    <div className="space-y-12 rise">
      <section className="grid lg:grid-cols-[1.2fr_1fr] gap-0 border-2 border-ink">
        <div className="bg-cream p-8 sm:p-10 border-b-2 lg:border-b-0 lg:border-r-2 border-ink relative stripe">
          <div className="mono text-[11px] uppercase tracking-[0.3em] mb-4 text-ink-soft">
            Sezon 2025/26 · Klasyfikacja
          </div>
          <h1 className="display text-[clamp(3rem,9vw,8rem)] leading-[0.82] tracking-tight">
            Tabela
            <br />
            <span className="text-pitch">ligi</span>
            <span className="text-rust">.</span>
          </h1>
          <p className="mt-6 max-w-md text-ink-soft leading-relaxed">
            Punkty, bramki, miejsca. Wszystko, co się liczy — aktualizowane po
            każdym gwizdku końcowym.
          </p>
          <div className="mt-8 flex gap-3 flex-wrap">
            <Link href="/mecze" className="btn-primary inline-block">
              Terminarz →
            </Link>
            <Link href="/druzyny" className="btn-ghost inline-block">
              Drużyny
            </Link>
          </div>
        </div>
        <div className="pitch-stripes text-chalk p-8 sm:p-10 relative">
          <div className="grid grid-cols-3 gap-4">
            <Stat hero value={teams.length} label="Drużyn" />
            <Stat hero value={played} label="Meczów" />
            <Stat hero value={goals} label="Bramek" />
          </div>
          {leader && (
            <div className="mt-8 border-t border-lime/40 pt-6">
              <div className="mono text-[11px] uppercase tracking-[0.3em] text-lime mb-2">
                ★ Lider tabeli
              </div>
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 border-2 border-lime flex items-center justify-center display text-xl shrink-0"
                  style={{ backgroundColor: leader.team.color }}
                >
                  {leader.team.shortName.slice(0, 3).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="display text-2xl truncate">
                    {leader.team.name}
                  </div>
                  <div className="mono text-xs opacity-80">
                    {leader.points} pkt · {leader.wins}W {leader.draws}R{" "}
                    {leader.losses}P
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {teams.length === 0 ? (
        <EmptyState />
      ) : (
        <section>
          <div className="flex items-end justify-between mb-4">
            <h2 className="display text-3xl sm:text-4xl">Klasyfikacja</h2>
            <div className="mono text-[11px] uppercase tracking-[0.25em] text-ink-soft hidden sm:block">
              M / W / R / P / B+ / B− / +/− / PKT
            </div>
          </div>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-ink text-lime">
                  <tr className="display text-xs tracking-[0.15em]">
                    <th className="px-3 py-3 text-left w-12">#</th>
                    <th className="px-3 py-3 text-left">Drużyna</th>
                    <Th>M</Th>
                    <Th>W</Th>
                    <Th>R</Th>
                    <Th>P</Th>
                    <Th>B+</Th>
                    <Th>B−</Th>
                    <Th>+/−</Th>
                    <th className="px-4 py-3 text-center bg-lime text-ink">
                      PKT
                    </th>
                  </tr>
                </thead>
                <tbody className="mono text-sm">
                  {standings.map((s, i) => {
                    const rank = i + 1;
                    const isLead = rank === 1;
                    return (
                      <tr
                        key={s.team.id}
                        className={`border-t-2 border-ink/10 transition-colors ${
                          isLead ? "bg-lime/20" : "hover:bg-cream-soft"
                        }`}
                      >
                        <td className="px-3 py-3">
                          <span
                            className={`display text-lg inline-flex items-center justify-center w-8 h-8 ${
                              isLead
                                ? "bg-ink text-lime"
                                : rank <= 3
                                  ? "bg-pitch text-cream"
                                  : "text-ink"
                            }`}
                          >
                            {rank}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <Link
                            href={`/druzyny/${s.team.id}`}
                            className="flex items-center gap-3 hover:text-pitch group"
                          >
                            <span
                              className="inline-block w-4 h-4 border-2 border-ink shrink-0"
                              style={{ backgroundColor: s.team.color }}
                            />
                            <span className="font-sans font-semibold text-base group-hover:underline">
                              {s.team.name}
                            </span>
                            <span className="tag bg-cream hidden md:inline-flex">
                              {s.team.shortName}
                            </span>
                          </Link>
                        </td>
                        <Td>{s.played}</Td>
                        <Td className="text-pitch font-bold">{s.wins}</Td>
                        <Td className="text-amber font-bold">{s.draws}</Td>
                        <Td className="text-rust font-bold">{s.losses}</Td>
                        <Td>{s.goalsFor}</Td>
                        <Td>{s.goalsAgainst}</Td>
                        <Td>
                          {s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff}
                        </Td>
                        <td className="px-4 py-3 text-center display text-2xl">
                          {s.points}
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

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-2 py-3 text-center w-12 hidden sm:table-cell">
      {children}
    </th>
  );
}
function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-2 py-3 text-center hidden sm:table-cell ${className}`}>
      {children}
    </td>
  );
}

function Stat({
  value,
  label,
  hero,
}: {
  value: number | string;
  label: string;
  hero?: boolean;
}) {
  return (
    <div>
      <div
        className={`display ${hero ? "text-5xl sm:text-6xl" : "text-4xl"} leading-none text-lime`}
      >
        {value}
      </div>
      <div className="mono text-[10px] uppercase tracking-[0.25em] opacity-80 mt-1">
        {label}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card p-10 text-center">
      <div className="display text-5xl text-ink-soft">Pusto na boisku</div>
      <p className="mt-3 text-ink-soft">
        Administrator doda drużyny i mecze z panelu admina.
      </p>
    </div>
  );
}
