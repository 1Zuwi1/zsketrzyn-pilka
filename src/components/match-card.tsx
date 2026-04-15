import Link from "next/link";
import type { GoalWithNames, Match, Team } from "@/lib/types";

export function MatchCard({
  match,
  teamsById,
  goals = [],
}: {
  match: Match;
  teamsById: Map<string, Team>;
  goals?: GoalWithNames[];
}) {
  const home = teamsById.get(match.homeTeamId);
  const away = teamsById.get(match.awayTeamId);
  const date = new Date(match.date);
  const day = date.toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "short",
  });
  const time = date.toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const homeGoals = goals.filter((g) => g.teamId === match.homeTeamId);
  const awayGoals = goals.filter((g) => g.teamId === match.awayTeamId);

  return (
    <Link
      href={`/mecze/${match.id}`}
      className="card p-4 flex flex-col gap-3 transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:edge-lime"
    >
      <div className="flex items-center justify-between mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
        <span>
          {match.round != null ? `Kol. ${match.round}` : "Mecz"} · {day}
        </span>
        <span>{time}</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamSide team={home} align="right" />
        <div
          className={`px-3 py-2 display text-2xl tabular min-w-23 text-center border-2 border-ink ${
            match.played ? "bg-ink text-lime" : "bg-cream"
          }`}
        >
          {match.played ? `${match.homeScore} : ${match.awayScore}` : "VS"}
        </div>
        <TeamSide team={away} align="left" />
      </div>
      {match.played && goals.length > 0 && (
        <div className="grid grid-cols-2 gap-3 pt-3 border-t-2 border-ink/10 text-xs">
          <ScorerList goals={homeGoals} align="right" />
          <ScorerList goals={awayGoals} align="left" />
        </div>
      )}
    </Link>
  );
}

function ScorerList({
  goals,
  align,
}: {
  goals: GoalWithNames[];
  align: "left" | "right";
}) {
  if (goals.length === 0)
    return <div className={align === "right" ? "text-right" : ""} />;
  return (
    <ul
      className={`space-y-0.5 ${align === "right" ? "text-right" : "text-left"}`}
    >
      {goals.map((g) => (
        <li key={g.id} className="truncate">
          <span className="mono text-ink-soft">
            {g.minute != null ? `${g.minute}'` : "—"}
          </span>{" "}
          ⚽ {g.playerName}
          {g.ownGoal && (
            <span className="ml-1 text-[10px] uppercase text-rust">(sam.)</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function TeamSide({
  team,
  align,
}: {
  team: Team | undefined;
  align: "left" | "right";
}) {
  return (
    <div
      className={`flex items-center gap-2 min-w-0 ${
        align === "right" ? "justify-end text-right" : ""
      }`}
    >
      {align === "right" && (
        <span className="font-semibold truncate min-w-0">
          {team?.name ?? "—"}
        </span>
      )}
      <span
        aria-hidden
        className="inline-block w-3.5 h-3.5 border-2 border-ink shrink-0"
        style={{ backgroundColor: team?.color }}
      />
      {align === "left" && (
        <span className="font-semibold truncate min-w-0">
          {team?.name ?? "—"}
        </span>
      )}
    </div>
  );
}
