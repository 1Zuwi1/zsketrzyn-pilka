import { getSession, isAdmin } from "@/lib/auth-helpers";
import { query } from "@/lib/db";

type TeamRow = { id: string; name: string; short_name: string; color: string };
type PlayerRow = {
  id: string;
  team_id: string;
  name: string;
  number: number | null;
  position: string;
};
type MatchRow = {
  id: string;
  home_team_id: string;
  away_team_id: string;
  match_date: Date;
  round_no: number | null;
  home_score: number | null;
  away_score: number | null;
  played: number;
};
type GoalRow = {
  id: string;
  match_id: string;
  player_id: string;
  team_id: string;
  minute: number | null;
  own_goal: number;
};

export async function GET() {
  const session = await getSession();
  if (!session?.user || !(await isAdmin(session.user.id))) {
    return new Response("Forbidden", { status: 403 });
  }

  const [teams, players, matches, goals] = await Promise.all([
    query<TeamRow>("SELECT id, name, short_name, color FROM teams ORDER BY id"),
    query<PlayerRow>(
      "SELECT id, team_id, name, number, position FROM players ORDER BY id",
    ),
    query<MatchRow>(
      "SELECT id, home_team_id, away_team_id, match_date, round_no, home_score, away_score, played FROM matches ORDER BY id",
    ),
    query<GoalRow>(
      "SELECT id, match_id, player_id, team_id, minute, own_goal FROM match_goals ORDER BY id",
    ),
  ]);

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    teams,
    players,
    matches: matches.map((m) => ({
      ...m,
      match_date:
        m.match_date instanceof Date
          ? m.match_date.toISOString()
          : new Date(m.match_date).toISOString(),
    })),
    match_goals: goals,
  };

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="liga-backup-${stamp}.json"`,
      "cache-control": "no-store",
    },
  });
}
