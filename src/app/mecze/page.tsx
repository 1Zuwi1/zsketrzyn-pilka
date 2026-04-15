import { MatchCard } from "@/components/match-card";
import { getGoals, getMatches, getTeams } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const [teams, matches, goals] = await Promise.all([
    getTeams(),
    getMatches(),
    getGoals(),
  ]);
  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const goalsByMatch = new Map<string, typeof goals>();
  for (const g of goals) {
    const list = goalsByMatch.get(g.matchId) ?? [];
    list.push(g);
    goalsByMatch.set(g.matchId, list);
  }
  const upcoming = matches.filter((m) => !m.played);
  const played = matches
    .filter((m) => m.played)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));

  return (
    <div className="space-y-12 rise">
      <header className="grid lg:grid-cols-[auto_1fr] items-end gap-6 border-b-2 border-ink pb-6">
        <h1 className="display text-[clamp(3rem,8vw,7rem)] leading-[0.85]">
          Termi<span className="text-pitch">narz</span>
        </h1>
        <div className="mono text-xs uppercase tracking-[0.25em] text-ink-soft lg:text-right">
          {upcoming.length} zaplanowanych · {played.length} rozegranych
        </div>
      </header>

      <Section
        title="Nadchodzące"
        count={upcoming.length}
        accent="bg-lime text-ink"
      >
        {upcoming.length === 0 ? (
          <Empty>Brak zaplanowanych meczów.</Empty>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                teamsById={teamsById}
                goals={goalsByMatch.get(m.id) ?? []}
              />
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Wyniki"
        count={played.length}
        accent="bg-ink text-lime"
      >
        {played.length === 0 ? (
          <Empty>Brak rozegranych meczów.</Empty>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {played.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                teamsById={teamsById}
                goals={goalsByMatch.get(m.id) ?? []}
              />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  count,
  accent,
  children,
}: {
  title: string;
  count: number;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-5">
        <span className={`display text-sm px-2.5 py-1 ${accent}`}>
          {String(count).padStart(2, "0")}
        </span>
        <h2 className="display text-3xl sm:text-4xl">{title}</h2>
        <div className="flex-1 border-t-2 border-ink/20" />
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="card p-8 text-center text-ink-soft italic">{children}</div>
  );
}
