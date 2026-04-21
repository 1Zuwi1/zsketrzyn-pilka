import Link from "next/link";
import { notFound } from "next/navigation";
import { MatchLineupsBoard } from "@/components/match-lineups";
import { MatchTabs } from "@/components/match-tabs";
import { getCurrentUserWithRole } from "@/lib/auth-helpers";
import {
  getGoals,
  getMatch,
  getMatchLineups,
  getPlayers,
  getTeam,
} from "@/lib/repo";
import type { GoalWithNames, Player, Team } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const match = await getMatch(id);
  if (!match) notFound();
  const [home, away, goals, homePlayers, awayPlayers, lineups, me] =
    await Promise.all([
      getTeam(match.homeTeamId),
      getTeam(match.awayTeamId),
      getGoals(match.id),
      getPlayers(match.homeTeamId),
      getPlayers(match.awayTeamId),
      getMatchLineups(match.id),
      getCurrentUserWithRole(),
    ]);
  if (!home || !away) notFound();

  const homeLineup = lineups.find((l) => l.teamId === home.id) ?? null;
  const awayLineup = lineups.find((l) => l.teamId === away.id) ?? null;
  const canEdit = (teamId: string) => {
    if (!me || match.played) return false;
    if (me.role === "admin") return true;
    return me.role === "captain" && me.teamId === teamId;
  };

  const date = new Date(match.date);
  const fullDate = date.toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const time = date.toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const homeGoals = goals.filter((g) => g.teamId === home.id);
  const awayGoals = goals.filter((g) => g.teamId === away.id);
  const timeline = [...goals].sort(
    (a, b) => (a.minute ?? 999) - (b.minute ?? 999),
  );

  return (
    <div className="space-y-10 rise">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link
          href="/mecze"
          className="mono text-[11px] uppercase tracking-[0.3em] text-ink-soft hover:text-pitch"
        >
          ← Terminarz
        </Link>
        <MatchTabs matchId={match.id} active="przebieg" />
      </div>

      <header className="border-2 border-ink overflow-hidden">
        <div className="bg-ink text-cream px-5 py-3 flex items-center justify-between flex-wrap gap-2 mono text-[11px] uppercase tracking-[0.25em]">
          <span>
            {match.round != null ? `Kolejka ${match.round}` : "Mecz"} ·{" "}
            {fullDate}
          </span>
          <span className="text-lime">
            {match.played ? "Po gwizdku" : `Start ${time}`}
          </span>
        </div>

        <div className="pitch-stripes text-chalk p-4 sm:p-10">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-8">
            <TeamHero team={home} align="right" />
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div
                className={`display text-[clamp(2rem,9vw,7rem)] leading-none tabular px-2 sm:px-4 py-1 border-2 ${
                  match.played
                    ? "bg-lime text-ink border-lime"
                    : "border-chalk/40"
                }`}
              >
                {match.played
                  ? `${match.homeScore} : ${match.awayScore}`
                  : "— : —"}
              </div>
              <div className="mono text-[11px] uppercase tracking-[0.3em] opacity-80">
                {time} · Gwizdek
              </div>
            </div>
            <TeamHero team={away} align="left" />
          </div>
        </div>
      </header>

      <section className="grid lg:grid-cols-[1fr_auto] gap-6 items-start">
        <div className="space-y-4">
          <h2 className="display text-3xl">Przebieg meczu</h2>
          {!match.played ? (
            <div className="card p-8 text-center text-ink-soft italic">
              Mecz jeszcze nierozegrany.
            </div>
          ) : timeline.length === 0 ? (
            <div className="card p-8 text-center text-ink-soft italic">
              Brak zarejestrowanych bramek.
            </div>
          ) : (
            <ol className="card p-0 overflow-hidden divide-y-2 divide-ink/10">
              {timeline.map((g) => {
                const isHome = g.teamId === home.id;
                const team = isHome ? home : away;
                return (
                  <li
                    key={g.id}
                    className={`grid grid-cols-[72px_1fr] items-center gap-0 ${
                      isHome ? "" : "bg-cream-soft"
                    }`}
                  >
                    <div className="display text-2xl px-3 py-3 bg-ink text-lime text-center tabular h-full flex items-center justify-center">
                      {g.minute != null ? `${g.minute}'` : "—"}
                    </div>
                    <div
                      className={`flex items-center gap-3 p-3 ${
                        isHome ? "" : "flex-row-reverse text-right"
                      }`}
                    >
                      <span
                        aria-hidden
                        className="inline-block w-3 h-3 border-2 border-ink shrink-0"
                        style={{ backgroundColor: team.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">
                          ⚽ {g.playerName}
                          {g.ownGoal && (
                            <span className="ml-2 tag bg-rust/10 text-rust border-rust">
                              samobój
                            </span>
                          )}
                        </div>
                        <div className="mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
                          {team.name}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <aside className="card p-5 lg:w-64 w-full">
          <div className="mono text-[11px] uppercase tracking-[0.3em] text-ink-soft mb-2">
            Informacje
          </div>
          <dl className="space-y-3 text-sm">
            <Info label="Data">{fullDate}</Info>
            <Info label="Godzina">{time}</Info>
            {match.round != null && (
              <Info label="Kolejka">{String(match.round)}</Info>
            )}
            <Info label="Status">
              {match.played ? "Rozegrany" : "Zaplanowany"}
            </Info>
            {match.played && (
              <>
                <Info label="Bramki">
                  {homeGoals.length} : {awayGoals.length}
                </Info>
                <Info label="Wynik">
                  {(() => {
                    if (match.homeScore == null || match.awayScore == null)
                      return "—";
                    if (match.homeScore > match.awayScore)
                      return `Wygrana ${home.shortName}`;
                    if (match.homeScore < match.awayScore)
                      return `Wygrana ${away.shortName}`;
                    return "Remis";
                  })()}
                </Info>
              </>
            )}
          </dl>
        </aside>
      </section>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h2 className="display text-3xl">Składy na murawie</h2>
          <Link
            href={`/mecze/${match.id}/sklady`}
            className="mono text-[11px] uppercase tracking-[0.3em] text-ink-soft hover:text-pitch"
          >
            pełny widok →
          </Link>
        </div>
        <MatchLineupsBoard
          home={home}
          away={away}
          homePlayers={homePlayers}
          awayPlayers={awayPlayers}
          homeLineup={homeLineup}
          awayLineup={awayLineup}
          matchId={match.id}
          canEditHome={canEdit(home.id)}
          canEditAway={canEdit(away.id)}
        />
      </section>

      <section className="space-y-4">
        <h2 className="display text-3xl">Kadra zawodników</h2>
        <div className="grid md:grid-cols-2 gap-5">
          <Lineup team={home} players={homePlayers} goals={homeGoals} />
          <Lineup team={away} players={awayPlayers} goals={awayGoals} />
        </div>
      </section>
    </div>
  );
}

function TeamHero({
  team,
  align,
}: {
  team: Team;
  align: "left" | "right";
}) {
  return (
    <Link
      href={`/druzyny/${team.id}`}
      className={`flex items-center gap-2 sm:gap-5 min-w-0 group ${
        align === "right" ? "justify-end text-right" : ""
      }`}
    >
      {align === "right" && (
        <div className="min-w-0 flex-1">
          <div className="display text-[clamp(1rem,3.5vw,3rem)] leading-[0.9] truncate group-hover:text-lime">
            {team.name}
          </div>
          <div className="mono text-[9px] sm:text-[10px] uppercase tracking-[0.25em] opacity-70 truncate">
            {team.shortName}
          </div>
        </div>
      )}
      <div
        className="w-12 h-12 sm:w-24 sm:h-24 border-2 border-chalk/60 shrink-0 flex items-center justify-center display text-lg sm:text-4xl"
        style={{ backgroundColor: team.color }}
      >
        <span className="text-chalk mix-blend-difference">
          {team.shortName.slice(0, 3).toUpperCase()}
        </span>
      </div>
      {align === "left" && (
        <div className="min-w-0 flex-1">
          <div className="display text-[clamp(1rem,3.5vw,3rem)] leading-[0.9] truncate group-hover:text-lime">
            {team.name}
          </div>
          <div className="mono text-[9px] sm:text-[10px] uppercase tracking-[0.25em] opacity-70 truncate">
            {team.shortName}
          </div>
        </div>
      )}
    </Link>
  );
}

function Info({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-ink/10 pb-2 last:border-b-0 last:pb-0">
      <dt className="mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
        {label}
      </dt>
      <dd className="font-semibold text-right">{children}</dd>
    </div>
  );
}

function Lineup({
  team,
  players,
  goals,
}: {
  team: Team;
  players: Player[];
  goals: GoalWithNames[];
}) {
  const goalsByPlayer = new Map<string, GoalWithNames[]>();
  for (const g of goals) {
    const list = goalsByPlayer.get(g.playerId) ?? [];
    list.push(g);
    goalsByPlayer.set(g.playerId, list);
  }
  return (
    <div className="card p-0 overflow-hidden">
      <Link
        href={`/druzyny/${team.id}`}
        className="flex items-center gap-3 p-4 border-b-2 border-ink group"
        style={{ backgroundColor: team.color }}
      >
        <div className="w-10 h-10 border-2 border-ink flex items-center justify-center display text-lg shrink-0 bg-chalk/20">
          <span className="text-chalk mix-blend-difference">
            {team.shortName.slice(0, 3).toUpperCase()}
          </span>
        </div>
        <div className="display text-xl text-chalk mix-blend-difference truncate group-hover:underline">
          {team.name}
        </div>
        <span className="ml-auto mono text-[11px] uppercase tracking-[0.25em] text-chalk mix-blend-difference">
          skład →
        </span>
      </Link>
      {players.length === 0 ? (
        <div className="p-6 text-center italic text-ink-soft">
          Brak zawodników.
        </div>
      ) : (
        <ul className="divide-y-2 divide-ink/10">
          {players.map((p) => {
            const pg = goalsByPlayer.get(p.id) ?? [];
            return (
              <li key={p.id} className="flex items-center gap-3 p-2.5">
                <div
                  className="w-9 h-9 flex items-center justify-center display text-lg shrink-0 border-2 border-ink"
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
                {pg.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-end shrink-0">
                    {pg.map((g) => (
                      <span
                        key={g.id}
                        className={`tag ${
                          g.ownGoal
                            ? "bg-rust/10 text-rust border-rust"
                            : "bg-lime text-ink"
                        }`}
                        title={g.ownGoal ? "Samobój" : "Gol"}
                      >
                        ⚽ {g.minute != null ? `${g.minute}'` : ""}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
