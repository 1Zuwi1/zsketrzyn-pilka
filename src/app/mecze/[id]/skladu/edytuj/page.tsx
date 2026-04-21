import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LineupEditor } from "@/components/lineup-editor";
import { getCurrentUserWithRole } from "@/lib/auth-helpers";
import {
  getMatch,
  getMatchLineup,
  getPlayers,
  getTeam,
} from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function LineupEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ team?: string }>;
}) {
  const [{ id }, sp, me] = await Promise.all([
    params,
    searchParams,
    getCurrentUserWithRole(),
  ]);
  if (!me) redirect("/login");

  const match = await getMatch(id);
  if (!match) notFound();

  const teamId = sp.team ?? "";
  if (teamId !== match.homeTeamId && teamId !== match.awayTeamId) {
    redirect(`/mecze/${id}/skladu`);
  }

  // Autoryzacja
  if (me.role !== "admin") {
    if (me.role !== "captain" || me.teamId !== teamId) {
      redirect(`/mecze/${id}/skladu`);
    }
  }
  if (match.played) {
    redirect(`/mecze/${id}/skladu`);
  }

  const [team, players, lineup] = await Promise.all([
    getTeam(teamId),
    getPlayers(teamId),
    getMatchLineup(id, teamId),
  ]);
  if (!team) notFound();

  const backHref = `/mecze/${id}/skladu`;

  return (
    <div className="space-y-6 rise">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link
          href={backHref}
          className="mono text-[11px] uppercase tracking-[0.3em] text-ink-soft hover:text-pitch"
        >
          ← Składy
        </Link>
        <div className="mono text-[11px] uppercase tracking-[0.3em] text-ink-soft">
          Edycja składu · {team.name}
        </div>
      </div>

      <header className="card p-4 sm:p-6">
        <div className="mono text-[11px] uppercase tracking-[0.3em] text-ink-soft">
          Tryb kapitana
        </div>
        <div className="display text-3xl mt-1">Ustaw swój skład</div>
        <p className="mt-2 text-sm text-ink-soft max-w-2xl">
          Przeciągnij zawodników z kadry na pozycje na boisku. Kliknij na
          zawodnika na boisku, aby nadać mu opaskę kapitana (C). Dodaj do{" "}
          {7} rezerwowych. Skład zapisany jest widoczny dla wszystkich, a po
          rozpoczęciu meczu zostaje zablokowany.
        </p>
      </header>

      <LineupEditor
        matchId={id}
        team={team}
        squad={players}
        initialLineup={lineup}
        backHref={backHref}
      />
    </div>
  );
}
