import Link from "next/link";
import { notFound } from "next/navigation";
import { MatchCard } from "@/components/match-card";
import { getGoals, getMatches, getPlayers, getTeam, getTeams } from "@/lib/repo";
import { computeStandings } from "@/lib/standings";

export const dynamic = "force-dynamic";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [team, teams, players, matches, goals] = await Promise.all([
    getTeam(id),
    getTeams(),
    getPlayers(id),
    getMatches(),
    getGoals(),
  ]);
  if (!team) notFound();
  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const goalsByMatch = new Map<string, typeof goals>();
  for (const g of goals) {
    const list = goalsByMatch.get(g.matchId) ?? [];
    list.push(g);
    goalsByMatch.set(g.matchId, list);
  }
  const scorerCount = new Map<string, { name: string; count: number }>();
  for (const g of goals) {
    if (g.ownGoal) continue;
    const p = players.find((pl) => pl.id === g.playerId);
    if (!p) continue;
    const prev = scorerCount.get(p.id) ?? { name: p.name, count: 0 };
    prev.count++;
    scorerCount.set(p.id, prev);
  }
  const topScorers = [...scorerCount.entries()]
    .map(([playerId, v]) => ({ playerId, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const standings = computeStandings(teams, matches);
  const standing = standings.find((s) => s.team.id === id);
  const rank = standings.findIndex((s) => s.team.id === id) + 1;
  const teamMatches = matches.filter(
    (m) => m.homeTeamId === id || m.awayTeamId === id,
  );

  return (
    <div className="space-y-10 rise">
      <Link
        href="/druzyny"
        className="mono text-[11px] uppercase tracking-[0.3em] text-ink-soft hover:text-pitch"
      >
        ← Wszystkie drużyny
      </Link>

      <header className="grid lg:grid-cols-[auto_1fr_auto] items-stretch gap-0 border-2 border-ink">
        <div
          className="w-full lg:w-56 p-8 flex items-center justify-center border-r-2 border-ink"
          style={{ backgroundColor: team.color }}
        >
          <span className="display text-7xl text-chalk mix-blend-difference">
            {team.shortName.slice(0, 3).toUpperCase()}
          </span>
        </div>
        <div className="p-6 sm:p-8 bg-cream flex flex-col justify-center">
          <div className="mono text-[11px] uppercase tracking-[0.3em] text-ink-soft">
            Zespół
          </div>
          <h1 className="display text-[clamp(2.2rem,6vw,5rem)] leading-[0.9] break-words">
            {team.name}
          </h1>
          <div className="mt-3 mono text-xs uppercase tracking-[0.25em] text-ink-soft">
            {players.length} zawodników · {teamMatches.length} meczów
          </div>
        </div>
        {standing && rank > 0 && (
          <div className="bg-ink text-lime p-8 flex flex-col items-center justify-center border-t-2 lg:border-t-0 lg:border-l-2 border-ink min-w-[160px]">
            <div className="mono text-[10px] uppercase tracking-[0.3em] opacity-80">
              Pozycja
            </div>
            <div className="display text-7xl leading-none">
              {String(rank).padStart(2, "0")}
            </div>
            <div className="mono text-xs mt-2">{standing.points} pkt</div>
          </div>
        )}
      </header>

      {standing && (
        <section className="grid grid-cols-3 md:grid-cols-6 gap-0 border-2 border-ink">
          <Stat label="Mecze" value={standing.played} />
          <Stat label="Wygrane" value={standing.wins} color="text-pitch" />
          <Stat label="Remisy" value={standing.draws} color="text-amber" />
          <Stat label="Porażki" value={standing.losses} color="text-rust" />
          <Stat
            label="Bramki"
            value={`${standing.goalsFor}:${standing.goalsAgainst}`}
          />
          <Stat
            label="Różnica"
            value={
              standing.goalDiff > 0 ? `+${standing.goalDiff}` : standing.goalDiff
            }
          />
        </section>
      )}

      <section>
        <div className="flex items-end justify-between mb-4">
          <h2 className="display text-3xl sm:text-4xl">Skład</h2>
          <span className="mono text-[11px] uppercase tracking-[0.25em] text-ink-soft">
            {players.length} graczy
          </span>
        </div>
        {players.length === 0 ? (
          <div className="card p-8 text-center text-ink-soft italic">
            Brak zawodników.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {players.map((p) => (
              <div
                key={p.id}
                className="card flex items-center gap-3 p-3 hover:bg-cream-soft transition-colors"
              >
                <div
                  className="w-12 h-12 flex items-center justify-center display text-2xl shrink-0 border-2 border-ink"
                  style={{ backgroundColor: team.color }}
                >
                  <span className="text-chalk mix-blend-difference">
                    {p.number ?? "—"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{p.name}</div>
                  {p.position && (
                    <div className="mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
                      {p.position}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {topScorers.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="display text-sm px-2.5 py-1 bg-lime text-ink">
              ⚽
            </span>
            <h2 className="display text-3xl sm:text-4xl">Najlepsi strzelcy</h2>
            <div className="flex-1 border-t-2 border-ink/20" />
          </div>
          <ol className="card divide-y-2 divide-ink/10">
            {topScorers.map((s, i) => (
              <li
                key={s.playerId}
                className="flex items-center gap-4 p-3"
              >
                <span className="display text-2xl w-8 text-pitch">
                  {i + 1}
                </span>
                <span className="flex-1 font-semibold">{s.name}</span>
                <span className="display text-2xl">
                  {s.count}{" "}
                  <span className="mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
                    goli
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section>
        <h2 className="display text-3xl sm:text-4xl mb-4">Mecze</h2>
        {teamMatches.length === 0 ? (
          <div className="card p-8 text-center text-ink-soft italic">
            Brak meczów.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {teamMatches.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                teamsById={teamsById}
                goals={goalsByMatch.get(m.id) ?? []}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="bg-chalk p-4 border-r-2 last:border-r-0 border-b-2 md:border-b-0 [&:nth-child(n+4)]:border-b-0 border-ink">
      <div className="mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
        {label}
      </div>
      <div className={`display text-4xl mt-1 ${color ?? "text-ink"}`}>
        {value}
      </div>
    </div>
  );
}
