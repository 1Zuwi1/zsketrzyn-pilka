import {
  addGoal,
  clearMatchResult,
  createMatch,
  deleteGoal,
  deleteMatch,
  setMatchResult,
} from "@/lib/actions";
import { getGoals, getMatches, getPlayers, getTeams } from "@/lib/repo";
import type { Match, Player, Team } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminMatchesPage() {
  const [teams, matches, players, goals] = await Promise.all([
    getTeams(),
    getMatches(),
    getPlayers(),
    getGoals(),
  ]);
  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const playersByTeam = new Map<string, Player[]>();
  for (const p of players) {
    const list = playersByTeam.get(p.teamId) ?? [];
    list.push(p);
    playersByTeam.set(p.teamId, list);
  }
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
    <div className="space-y-8">
      <section className="card p-6">
        <div className="mono text-[11px] uppercase tracking-[0.3em] text-ink-soft">
          Nowy mecz
        </div>
        <h2 className="display text-3xl mt-1 mb-4">Zaplanuj spotkanie</h2>
        {teams.length < 2 ? (
          <p className="italic text-ink-soft">
            Dodaj najpierw co najmniej dwie drużyny.
          </p>
        ) : (
          <form
            action={createMatch}
            className="grid sm:grid-cols-[1fr_1fr_auto_90px_auto] gap-3"
          >
            <select name="homeTeamId" required className="field">
              <option value="">Gospodarze</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <select name="awayTeamId" required className="field">
              <option value="">Goście</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              name="date"
              required
              className="field"
            />
            <input
              type="number"
              name="round"
              min={1}
              placeholder="Kol."
              className="field"
            />
            <button type="submit" className="btn-primary">
              Dodaj
            </button>
          </form>
        )}
      </section>

      <Section title="Zaplanowane" count={upcoming.length} dark={false}>
        {upcoming.length === 0 ? (
          <Empty>Brak zaplanowanych meczów.</Empty>
        ) : (
          upcoming.map((m) => (
            <UpcomingRow key={m.id} match={m} teamsById={teamsById} />
          ))
        )}
      </Section>

      <Section title="Rozegrane" count={played.length} dark>
        {played.length === 0 ? (
          <Empty>Brak rozegranych meczów.</Empty>
        ) : (
          played.map((m) => (
            <PlayedRow
              key={m.id}
              match={m}
              teamsById={teamsById}
              playersByTeam={playersByTeam}
              goals={goalsByMatch.get(m.id) ?? []}
            />
          ))
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  count,
  dark,
  children,
}: {
  title: string;
  count: number;
  dark: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <span
          className={`display text-sm px-2.5 py-1 ${
            dark ? "bg-ink text-lime" : "bg-lime text-ink"
          }`}
        >
          {String(count).padStart(2, "0")}
        </span>
        <h2 className="display text-3xl">{title}</h2>
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

function UpcomingRow({
  match,
  teamsById,
}: {
  match: Match;
  teamsById: Map<string, Team>;
}) {
  const h = teamsById.get(match.homeTeamId);
  const a = teamsById.get(match.awayTeamId);
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
        <span>
          {match.round != null ? `Kol. ${match.round}` : "Mecz"} ·{" "}
          {new Date(match.date).toLocaleString("pl-PL")}
        </span>
        <form action={deleteMatch}>
          <input type="hidden" name="id" value={match.id} />
          <button
            type="submit"
            className="text-rust hover:underline tracking-[0.2em]"
          >
            usuń
          </button>
        </form>
      </div>
      <div className="display text-2xl">
        {h?.name ?? "?"} <span className="text-ink-soft">vs</span>{" "}
        {a?.name ?? "?"}
      </div>
      <form
        action={setMatchResult}
        className="flex items-center gap-2 flex-wrap"
      >
        <input type="hidden" name="id" value={match.id} />
        <input
          type="number"
          name="homeScore"
          min={0}
          required
          placeholder="0"
          className="field !w-20 text-center display text-xl"
        />
        <span className="display text-2xl">:</span>
        <input
          type="number"
          name="awayScore"
          min={0}
          required
          placeholder="0"
          className="field !w-20 text-center display text-xl"
        />
        <button type="submit" className="btn-primary text-sm">
          Zapisz wynik
        </button>
      </form>
    </div>
  );
}

function PlayedRow({
  match,
  teamsById,
  playersByTeam,
  goals,
}: {
  match: Match;
  teamsById: Map<string, Team>;
  playersByTeam: Map<string, Player[]>;
  goals: Awaited<ReturnType<typeof getGoals>>;
}) {
  const h = teamsById.get(match.homeTeamId);
  const a = teamsById.get(match.awayTeamId);
  const homePlayers = playersByTeam.get(match.homeTeamId) ?? [];
  const awayPlayers = playersByTeam.get(match.awayTeamId) ?? [];
  const allPlayers = [...homePlayers, ...awayPlayers];

  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center gap-4 p-4 bg-ink text-cream flex-wrap">
        <div className="mono text-[11px] uppercase tracking-[0.2em] opacity-80">
          {new Date(match.date).toLocaleString("pl-PL")}
        </div>
        <div className="flex-1 display text-2xl flex items-center gap-3 flex-wrap">
          <span>{h?.name ?? "?"}</span>
          <span className="bg-lime text-ink px-3 py-0.5">
            {match.homeScore} : {match.awayScore}
          </span>
          <span>{a?.name ?? "?"}</span>
        </div>
        <form action={clearMatchResult}>
          <input type="hidden" name="id" value={match.id} />
          <button
            type="submit"
            className="mono text-[11px] uppercase tracking-[0.2em] text-lime hover:underline"
          >
            wycofaj wynik
          </button>
        </form>
        <form action={deleteMatch}>
          <input type="hidden" name="id" value={match.id} />
          <button
            type="submit"
            className="mono text-[11px] uppercase tracking-[0.2em] text-rust hover:underline"
          >
            usuń mecz
          </button>
        </form>
      </div>
      <div className="grid md:grid-cols-2 gap-0">
        <GoalColumn
          title={h?.name ?? "Gospodarze"}
          color={h?.color}
          goals={goals.filter((g) => g.teamId === match.homeTeamId)}
          border
        />
        <GoalColumn
          title={a?.name ?? "Goście"}
          color={a?.color}
          goals={goals.filter((g) => g.teamId === match.awayTeamId)}
        />
      </div>
      <form
        action={addGoal}
        className="grid sm:grid-cols-[1fr_90px_auto_auto] gap-3 p-4 bg-cream-soft border-t-2 border-ink"
      >
        <input type="hidden" name="matchId" value={match.id} />
        <select name="playerId" required className="field">
          <option value="">Wybierz strzelca...</option>
          <optgroup label={h?.name ?? "Gospodarze"}>
            {homePlayers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.number != null ? `#${p.number} ` : ""}
                {p.name}
              </option>
            ))}
          </optgroup>
          <optgroup label={a?.name ?? "Goście"}>
            {awayPlayers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.number != null ? `#${p.number} ` : ""}
                {p.name}
              </option>
            ))}
          </optgroup>
        </select>
        <input
          type="number"
          name="minute"
          min={1}
          max={200}
          placeholder="Min"
          className="field"
        />
        <label className="flex items-center gap-2 text-sm px-2 border-2 border-ink bg-chalk cursor-pointer">
          <input type="checkbox" name="ownGoal" value="1" />
          <span className="mono uppercase tracking-[0.2em] text-[11px]">
            Samobój
          </span>
        </label>
        <button
          type="submit"
          className="btn-primary text-sm"
          disabled={allPlayers.length === 0}
        >
          Dodaj gola
        </button>
      </form>
    </div>
  );
}

function GoalColumn({
  title,
  color,
  goals,
  border,
}: {
  title: string;
  color?: string;
  goals: Awaited<ReturnType<typeof getGoals>>;
  border?: boolean;
}) {
  return (
    <div className={`p-4 ${border ? "md:border-r-2 border-ink" : ""}`}>
      <div className="flex items-center gap-2 mb-2">
        <span
          className="inline-block w-3 h-3 border-2 border-ink"
          style={{ backgroundColor: color }}
        />
        <span className="mono text-[11px] uppercase tracking-[0.25em] text-ink-soft">
          {title}
        </span>
      </div>
      {goals.length === 0 ? (
        <div className="italic text-ink-soft text-sm">Brak strzelców.</div>
      ) : (
        <ul className="space-y-1.5">
          {goals.map((g) => (
            <li
              key={g.id}
              className="flex items-center gap-2 text-sm"
            >
              <span className="mono text-[11px] w-10 shrink-0 text-ink-soft">
                {g.minute != null ? `${g.minute}'` : "—"}
              </span>
              <span className="flex-1 truncate">
                ⚽ {g.playerName}
                {g.ownGoal && (
                  <span className="ml-2 tag bg-rust/10 text-rust border-rust">
                    samobój
                  </span>
                )}
              </span>
              <form action={deleteGoal}>
                <input type="hidden" name="id" value={g.id} />
                <button
                  type="submit"
                  aria-label="Usuń gola"
                  className="text-rust hover:underline mono text-[11px] tracking-[0.2em]"
                >
                  ✕
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
