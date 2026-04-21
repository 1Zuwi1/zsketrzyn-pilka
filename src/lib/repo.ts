import "server-only";
import { query } from "./db";
import type {
  AppUser,
  GoalWithNames,
  LineupPlayer,
  Match,
  MatchLineup,
  Player,
  ScorerRow,
  Team,
  UserRole,
} from "./types";

type TeamRow = {
  id: string;
  name: string;
  short_name: string;
  color: string;
};
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

const teamFrom = (r: TeamRow): Team => ({
  id: r.id,
  name: r.name,
  shortName: r.short_name,
  color: r.color,
});
const playerFrom = (r: PlayerRow): Player => ({
  id: r.id,
  teamId: r.team_id,
  name: r.name,
  number: r.number,
  position: r.position,
});
const matchFrom = (r: MatchRow): Match => ({
  id: r.id,
  homeTeamId: r.home_team_id,
  awayTeamId: r.away_team_id,
  date:
    r.match_date instanceof Date
      ? r.match_date.toISOString()
      : new Date(r.match_date).toISOString(),
  round: r.round_no,
  homeScore: r.home_score,
  awayScore: r.away_score,
  played: !!r.played,
});

export async function getTeams(): Promise<Team[]> {
  const rows = await query<TeamRow>("SELECT * FROM teams ORDER BY name ASC");
  return rows.map(teamFrom);
}
export async function getTeam(id: string): Promise<Team | null> {
  const rows = await query<TeamRow>("SELECT * FROM teams WHERE id = ?", [id]);
  return rows[0] ? teamFrom(rows[0]) : null;
}
export async function getPlayers(teamId?: string): Promise<Player[]> {
  const rows = teamId
    ? await query<PlayerRow>(
        "SELECT * FROM players WHERE team_id = ? ORDER BY COALESCE(number, 9999), name",
        [teamId],
      )
    : await query<PlayerRow>(
        "SELECT * FROM players ORDER BY team_id, COALESCE(number, 9999), name",
      );
  return rows.map(playerFrom);
}
export async function getMatch(id: string): Promise<Match | null> {
  const rows = await query<MatchRow>("SELECT * FROM matches WHERE id = ?", [id]);
  return rows[0] ? matchFrom(rows[0]) : null;
}

export async function getMatches(): Promise<Match[]> {
  const rows = await query<MatchRow>(
    "SELECT * FROM matches ORDER BY match_date ASC",
  );
  return rows.map(matchFrom);
}

type GoalRow = {
  id: string;
  match_id: string;
  player_id: string;
  team_id: string;
  minute: number | null;
  own_goal: number;
  player_name: string;
};

export async function getGoals(matchId?: string): Promise<GoalWithNames[]> {
  const rows = matchId
    ? await query<GoalRow>(
        `SELECT g.*, p.name AS player_name
         FROM match_goals g
         JOIN players p ON p.id = g.player_id
         WHERE g.match_id = ?
         ORDER BY COALESCE(g.minute, 999), p.name`,
        [matchId],
      )
    : await query<GoalRow>(
        `SELECT g.*, p.name AS player_name
         FROM match_goals g
         JOIN players p ON p.id = g.player_id
         ORDER BY g.match_id, COALESCE(g.minute, 999)`,
      );
  return rows.map((r) => ({
    id: r.id,
    matchId: r.match_id,
    playerId: r.player_id,
    teamId: r.team_id,
    minute: r.minute,
    ownGoal: !!r.own_goal,
    playerName: r.player_name,
  }));
}

type ScorerDbRow = {
  player_id: string;
  player_name: string;
  team_id: string;
  team_name: string;
  team_color: string;
  team_short_name: string;
  goals: number | string;
};

type LineupRow = {
  match_id: string;
  team_id: string;
  formation: string;
  starting_xi: string | LineupPlayer[];
  substitutes: string | LineupPlayer[];
  coach: string | null;
  updated_by: string | null;
  updated_at: Date | string;
  locked_at: Date | string | null;
};

function parseJsonField<T>(v: unknown): T[] {
  if (!v) return [] as T[];
  if (Array.isArray(v)) return v as T[];
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? (parsed as T[]) : ([] as T[]);
    } catch {
      return [] as T[];
    }
  }
  return [] as T[];
}

function dateToIso(v: Date | string | null): string | null {
  if (v == null) return null;
  return v instanceof Date ? v.toISOString() : new Date(v).toISOString();
}

function lineupFrom(r: LineupRow): MatchLineup {
  return {
    matchId: r.match_id,
    teamId: r.team_id,
    formation: r.formation,
    startingXI: parseJsonField<LineupPlayer>(r.starting_xi),
    substitutes: parseJsonField<LineupPlayer>(r.substitutes),
    coach: r.coach,
    updatedBy: r.updated_by,
    updatedAt: dateToIso(r.updated_at) ?? new Date().toISOString(),
    lockedAt: dateToIso(r.locked_at),
  };
}

export async function getMatchLineups(matchId: string): Promise<MatchLineup[]> {
  const rows = await query<LineupRow>(
    "SELECT * FROM match_lineups WHERE match_id = ?",
    [matchId],
  );
  return rows.map(lineupFrom);
}

export async function getMatchLineup(
  matchId: string,
  teamId: string,
): Promise<MatchLineup | null> {
  const rows = await query<LineupRow>(
    "SELECT * FROM match_lineups WHERE match_id = ? AND team_id = ? LIMIT 1",
    [matchId, teamId],
  );
  return rows[0] ? lineupFrom(rows[0]) : null;
}

type AppUserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  teamId: string | null;
  createdAt: Date | string;
};

function userRoleFrom(role: string): UserRole {
  if (role === "admin" || role === "captain") return role;
  return "captain";
}

export async function getAllUsers(): Promise<AppUser[]> {
  // Fan (role='user') accounts are unsupported — purge any that exist.
  await query("DELETE FROM user WHERE role NOT IN ('admin', 'captain')");
  const rows = await query<AppUserRow>(
    "SELECT id, email, name, role, teamId, createdAt FROM user WHERE role IN ('admin', 'captain') ORDER BY createdAt DESC",
  );
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    name: r.name,
    role: userRoleFrom(r.role),
    teamId: r.teamId,
    createdAt: dateToIso(r.createdAt) ?? "",
  }));
}

export async function getTopScorers(): Promise<ScorerRow[]> {
  const rows = await query<ScorerDbRow>(
    `SELECT
       p.id AS player_id,
       p.name AS player_name,
       t.id AS team_id,
       t.name AS team_name,
       t.color AS team_color,
       t.short_name AS team_short_name,
       COUNT(*) AS goals
     FROM match_goals g
     JOIN players p ON p.id = g.player_id
     JOIN teams   t ON t.id = p.team_id
     WHERE g.own_goal = 0
     GROUP BY p.id, p.name, t.id, t.name, t.color, t.short_name
     ORDER BY goals DESC, p.name ASC`,
  );
  return rows.map((r) => ({
    playerId: r.player_id,
    playerName: r.player_name,
    teamId: r.team_id,
    teamName: r.team_name,
    teamColor: r.team_color,
    teamShortName: r.team_short_name,
    goals: Number(r.goals),
  }));
}
