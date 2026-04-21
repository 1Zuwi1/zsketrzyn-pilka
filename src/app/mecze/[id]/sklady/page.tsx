import Link from "next/link";
import { notFound } from "next/navigation";
import { MatchLineupsBoard } from "@/components/match-lineups";
import { MatchTabs } from "@/components/match-tabs";
import { getCurrentUserWithRole } from "@/lib/auth-helpers";
import { getMatch, getMatchLineups, getPlayers, getTeam } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function MatchLineupsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const match = await getMatch(id);
  if (!match) notFound();
  const [home, away, homePlayers, awayPlayers, lineups, me] = await Promise.all(
    [
      getTeam(match.homeTeamId),
      getTeam(match.awayTeamId),
      getPlayers(match.homeTeamId),
      getPlayers(match.awayTeamId),
      getMatchLineups(match.id),
      getCurrentUserWithRole(),
    ],
  );
  if (!home || !away) notFound();

  const homeLineup = lineups.find((l) => l.teamId === home.id) ?? null;
  const awayLineup = lineups.find((l) => l.teamId === away.id) ?? null;

  const matchLocked = match.played;

  const canEdit = (teamId: string) => {
    if (!me) return false;
    if (me.role === "admin") return !matchLocked;
    if (me.role !== "captain") return false;
    if (me.teamId !== teamId) return false;
    return !matchLocked;
  };

  return (
    <div className="space-y-10 rise">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link
          href={`/mecze/${match.id}`}
          className="mono text-[11px] uppercase tracking-[0.3em] text-ink-soft hover:text-pitch"
        >
          ← Wydarzenia
        </Link>
        <MatchTabs matchId={match.id} active="sklady" />
      </div>

      <header className="card p-4 sm:p-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="mono text-[11px] uppercase tracking-[0.3em] text-ink-soft">
            Składy meczu
          </div>
          <div className="display text-3xl sm:text-4xl mt-1">
            {home.name} <span className="text-ink-soft text-2xl">vs</span>{" "}
            {away.name}
          </div>
        </div>
        <div className="mono text-[11px] uppercase tracking-[0.3em] text-ink-soft">
          {match.played
            ? "Rozegrany · snapshot"
            : "Zaplanowany · edytowalny przez kapitanów"}
        </div>
      </header>

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
    </div>
  );
}
