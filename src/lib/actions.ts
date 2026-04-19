"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "./auth-helpers";
import { query, uid, withTransaction } from "./db";

function str(v: FormDataEntryValue | null): string {
  return (v ?? "").toString().trim();
}
function numOrNull(v: FormDataEntryValue | null): number | null {
  const s = str(v);
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/mecze");
  revalidatePath("/druzyny");
  revalidatePath("/admin");
  revalidatePath("/admin/druzyny");
  revalidatePath("/admin/mecze");
}

// ============ DRUŻYNY ============
export async function createTeam(formData: FormData) {
  await requireAdmin();
  const name = str(formData.get("name"));
  const shortName = str(formData.get("shortName")) || name.slice(0, 3).toUpperCase();
  const color = str(formData.get("color")) || "#2563eb";
  if (!name) return;
  await query(
    "INSERT INTO teams (id, name, short_name, color) VALUES (?, ?, ?, ?)",
    [uid(), name, shortName, color],
  );
  revalidateAll();
}

export async function updateTeam(formData: FormData) {
  await requireAdmin();
  const id = str(formData.get("id"));
  const name = str(formData.get("name"));
  const shortName = str(formData.get("shortName"));
  const color = str(formData.get("color")) || "#2563eb";
  if (!id || !name) return;
  await query(
    "UPDATE teams SET name = ?, short_name = ?, color = ? WHERE id = ?",
    [name, shortName, color, id],
  );
  revalidateAll();
}

export async function deleteTeam(formData: FormData) {
  await requireAdmin();
  const id = str(formData.get("id"));
  if (!id) return;
  await query("DELETE FROM teams WHERE id = ?", [id]);
  revalidateAll();
}

// ============ ZAWODNICY ============
export async function addPlayer(formData: FormData) {
  await requireAdmin();
  const teamId = str(formData.get("teamId"));
  const name = str(formData.get("name"));
  const number = numOrNull(formData.get("number"));
  const position = str(formData.get("position"));
  if (!teamId || !name) return;
  await query(
    "INSERT INTO players (id, team_id, name, number, position) VALUES (?, ?, ?, ?, ?)",
    [uid(), teamId, name, number, position],
  );
  revalidatePath(`/druzyny/${teamId}`);
  revalidatePath(`/admin/druzyny/${teamId}`);
}

export async function deletePlayer(formData: FormData) {
  await requireAdmin();
  const id = str(formData.get("id"));
  const teamId = str(formData.get("teamId"));
  if (!id) return;
  await query("DELETE FROM players WHERE id = ?", [id]);
  if (teamId) {
    revalidatePath(`/druzyny/${teamId}`);
    revalidatePath(`/admin/druzyny/${teamId}`);
  }
}

// ============ MECZE ============
export async function createMatch(formData: FormData) {
  await requireAdmin();
  const homeTeamId = str(formData.get("homeTeamId"));
  const awayTeamId = str(formData.get("awayTeamId"));
  const date = str(formData.get("date"));
  const round = numOrNull(formData.get("round"));
  if (!homeTeamId || !awayTeamId || !date || homeTeamId === awayTeamId) return;
  await query(
    "INSERT INTO matches (id, home_team_id, away_team_id, match_date, round_no, played) VALUES (?, ?, ?, ?, ?, 0)",
    [uid(), homeTeamId, awayTeamId, new Date(date), round],
  );
  revalidateAll();
}

export async function setMatchResult(formData: FormData) {
  await requireAdmin();
  const id = str(formData.get("id"));
  const homeScore = numOrNull(formData.get("homeScore"));
  const awayScore = numOrNull(formData.get("awayScore"));
  if (!id || homeScore == null || awayScore == null) return;
  await query(
    "UPDATE matches SET home_score = ?, away_score = ?, played = 1 WHERE id = ?",
    [homeScore, awayScore, id],
  );
  revalidateAll();
}

export async function clearMatchResult(formData: FormData) {
  await requireAdmin();
  const id = str(formData.get("id"));
  if (!id) return;
  await query(
    "UPDATE matches SET home_score = NULL, away_score = NULL, played = 0 WHERE id = ?",
    [id],
  );
  revalidateAll();
}

// ============ STRZELCY ============
export async function addGoal(formData: FormData) {
  await requireAdmin();
  const matchId = str(formData.get("matchId"));
  const playerId = str(formData.get("playerId"));
  const minute = numOrNull(formData.get("minute"));
  const ownGoal = str(formData.get("ownGoal")) === "1";
  if (!matchId || !playerId) return;
  const rows = await query<{ team_id: string }>(
    "SELECT team_id FROM players WHERE id = ?",
    [playerId],
  );
  const playerTeam = rows[0]?.team_id;
  if (!playerTeam) return;
  const mRows = await query<{ home_team_id: string; away_team_id: string }>(
    "SELECT home_team_id, away_team_id FROM matches WHERE id = ?",
    [matchId],
  );
  const m = mRows[0];
  if (!m) return;
  // Dla samobója gol liczy się dla przeciwnika
  const creditTeam = ownGoal
    ? playerTeam === m.home_team_id
      ? m.away_team_id
      : m.home_team_id
    : playerTeam;
  await query(
    "INSERT INTO match_goals (id, match_id, player_id, team_id, minute, own_goal) VALUES (?, ?, ?, ?, ?, ?)",
    [uid(), matchId, playerId, creditTeam, minute, ownGoal ? 1 : 0],
  );
  revalidateAll();
}

export async function deleteGoal(formData: FormData) {
  await requireAdmin();
  const id = str(formData.get("id"));
  if (!id) return;
  await query("DELETE FROM match_goals WHERE id = ?", [id]);
  revalidateAll();
}

export async function deleteMatch(formData: FormData) {
  await requireAdmin();
  const id = str(formData.get("id"));
  if (!id) return;
  await query("DELETE FROM matches WHERE id = ?", [id]);
  revalidateAll();
}

// ============ BACKUP ============
type TeamBackup = { id: string; name: string; short_name: string; color: string };
type PlayerBackup = {
  id: string;
  team_id: string;
  name: string;
  number: number | null;
  position: string;
};
type MatchBackup = {
  id: string;
  home_team_id: string;
  away_team_id: string;
  match_date: string;
  round_no: number | null;
  home_score: number | null;
  away_score: number | null;
  played: number;
};
type GoalBackup = {
  id: string;
  match_id: string;
  player_id: string;
  team_id: string;
  minute: number | null;
  own_goal: number;
};
type Backup = {
  version?: number;
  teams: TeamBackup[];
  players: PlayerBackup[];
  matches: MatchBackup[];
  match_goals: GoalBackup[];
};

function asStr(v: unknown): string {
  return typeof v === "string" ? v : String(v ?? "");
}
function asNumOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}
function asInt01(v: unknown): number {
  return v ? 1 : 0;
}

function parseBackup(raw: unknown): Backup {
  if (!raw || typeof raw !== "object") throw new Error("Nieprawidłowy plik.");
  const o = raw as Record<string, unknown>;
  const teams = Array.isArray(o.teams) ? (o.teams as TeamBackup[]) : null;
  const players = Array.isArray(o.players) ? (o.players as PlayerBackup[]) : null;
  const matches = Array.isArray(o.matches) ? (o.matches as MatchBackup[]) : null;
  const goals = Array.isArray(o.match_goals)
    ? (o.match_goals as GoalBackup[])
    : null;
  if (!teams || !players || !matches || !goals) {
    throw new Error("Brakuje wymaganych sekcji (teams/players/matches/match_goals).");
  }
  return { version: asNumOrNull(o.version) ?? 1, teams, players, matches, match_goals: goals };
}

export async function importBackup(formData: FormData) {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Wybierz plik JSON z kopią zapasową.");
  }
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Plik nie jest prawidłowym JSON-em.");
  }
  const backup = parseBackup(parsed);

  await withTransaction(async (run) => {
    await run("SET FOREIGN_KEY_CHECKS = 0");
    await run("DELETE FROM match_goals");
    await run("DELETE FROM matches");
    await run("DELETE FROM players");
    await run("DELETE FROM teams");

    for (const t of backup.teams) {
      await run(
        "INSERT INTO teams (id, name, short_name, color) VALUES (?, ?, ?, ?)",
        [asStr(t.id), asStr(t.name), asStr(t.short_name), asStr(t.color) || "#2563eb"],
      );
    }
    for (const p of backup.players) {
      await run(
        "INSERT INTO players (id, team_id, name, number, position) VALUES (?, ?, ?, ?, ?)",
        [
          asStr(p.id),
          asStr(p.team_id),
          asStr(p.name),
          asNumOrNull(p.number),
          asStr(p.position),
        ],
      );
    }
    for (const m of backup.matches) {
      await run(
        "INSERT INTO matches (id, home_team_id, away_team_id, match_date, round_no, home_score, away_score, played) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          asStr(m.id),
          asStr(m.home_team_id),
          asStr(m.away_team_id),
          new Date(asStr(m.match_date)),
          asNumOrNull(m.round_no),
          asNumOrNull(m.home_score),
          asNumOrNull(m.away_score),
          asInt01(m.played),
        ],
      );
    }
    for (const g of backup.match_goals) {
      await run(
        "INSERT INTO match_goals (id, match_id, player_id, team_id, minute, own_goal) VALUES (?, ?, ?, ?, ?, ?)",
        [
          asStr(g.id),
          asStr(g.match_id),
          asStr(g.player_id),
          asStr(g.team_id),
          asNumOrNull(g.minute),
          asInt01(g.own_goal),
        ],
      );
    }
    await run("SET FOREIGN_KEY_CHECKS = 1");
  });
  revalidateAll();
}
