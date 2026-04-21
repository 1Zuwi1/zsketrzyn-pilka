"use server";
import { revalidatePath } from "next/cache";
import {
  getCurrentUserWithRole,
  requireAdminOrCaptain,
} from "./auth-helpers";
import { query, queryText, uid } from "./db";
import type { LineupPlayer, MatchLineup } from "./types";

const VALID_POSITIONS = new Set(["GK", "DF", "MF", "FW"]);
const STARTING_SIZE = 6;
const MAX_SUBS = 30;

function clampPct(n: unknown): number {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x)) return 50;
  return Math.max(0, Math.min(100, x));
}

function parseLineupPlayer(raw: unknown): LineupPlayer | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const playerId = typeof o.playerId === "string" ? o.playerId : null;
  if (!playerId) return null;
  const position =
    typeof o.position === "string" && VALID_POSITIONS.has(o.position)
      ? (o.position as LineupPlayer["position"])
      : "MF";
  const shirtNumber =
    typeof o.shirtNumber === "number"
      ? o.shirtNumber
      : o.shirtNumber == null
        ? null
        : Number(o.shirtNumber);
  return {
    playerId,
    shirtNumber:
      shirtNumber != null && Number.isFinite(shirtNumber) ? shirtNumber : null,
    position,
    x: clampPct(o.x),
    y: clampPct(o.y),
    isCaptain: !!o.isCaptain,
  };
}

export type SaveLineupInput = {
  matchId: string;
  teamId: string;
  formation: string;
  startingXI: unknown;
  substitutes: unknown;
  coach?: string | null;
};

export type SaveLineupResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveLineup(
  input: SaveLineupInput,
): Promise<SaveLineupResult> {
  const { session, role, teamId: myTeamId } = await requireAdminOrCaptain();

  const matchRows = await query<{
    home_team_id: string;
    away_team_id: string;
    played: number;
  }>("SELECT home_team_id, away_team_id, played FROM matches WHERE id = ?", [
    input.matchId,
  ]);
  const match = matchRows[0];
  if (!match) return { ok: false, error: "Mecz nie istnieje." };

  if (
    input.teamId !== match.home_team_id &&
    input.teamId !== match.away_team_id
  ) {
    return { ok: false, error: "Drużyna nie bierze udziału w tym meczu." };
  }

  if (role === "captain") {
    if (!myTeamId || myTeamId !== input.teamId) {
      return { ok: false, error: "Możesz edytować tylko swoją drużynę." };
    }
    if (match.played) {
      return { ok: false, error: "Mecz rozegrany - skład zablokowany." };
    }
  }

  const existing = await query<{ locked_at: Date | string | null }>(
    "SELECT locked_at FROM match_lineups WHERE match_id = ? AND team_id = ? LIMIT 1",
    [input.matchId, input.teamId],
  );
  if (role === "captain" && existing[0]?.locked_at) {
    return { ok: false, error: "Skład zablokowany." };
  }

  const startingRaw = Array.isArray(input.startingXI) ? input.startingXI : [];
  const subsRaw = Array.isArray(input.substitutes) ? input.substitutes : [];
  const starting = startingRaw
    .map(parseLineupPlayer)
    .filter((p): p is LineupPlayer => p !== null);
  const subs = subsRaw
    .map(parseLineupPlayer)
    .filter((p): p is LineupPlayer => p !== null);

  if (starting.length !== STARTING_SIZE) {
    return {
      ok: false,
      error: `Skład wyjściowy musi mieć dokładnie ${STARTING_SIZE} zawodników.`,
    };
  }
  if (subs.length > MAX_SUBS) {
    return { ok: false, error: `Max ${MAX_SUBS} rezerwowych.` };
  }
  const captains = starting.filter((p) => p.isCaptain).length;
  if (captains > 1) {
    return { ok: false, error: "Tylko jeden kapitan w składzie." };
  }

  const ids = new Set<string>();
  for (const p of [...starting, ...subs]) {
    if (ids.has(p.playerId)) {
      return { ok: false, error: "Zawodnik występuje więcej niż raz." };
    }
    ids.add(p.playerId);
  }

  // Walidacja: wszyscy zawodnicy należą do tej drużyny.
  if (ids.size > 0) {
    const placeholders = Array.from(ids)
      .map(() => "?")
      .join(",");
    const rows = await query<{ id: string; team_id: string }>(
      `SELECT id, team_id FROM players WHERE id IN (${placeholders})`,
      Array.from(ids),
    );
    if (rows.length !== ids.size) {
      return { ok: false, error: "Niektórzy zawodnicy nie istnieją." };
    }
    for (const r of rows) {
      if (r.team_id !== input.teamId) {
        return {
          ok: false,
          error: "Wszyscy zawodnicy muszą należeć do tej drużyny.",
        };
      }
    }
  }

  const formation = (input.formation || "4-4-2").slice(0, 16);
  const coach = input.coach ? String(input.coach).slice(0, 120) : null;
  const startingJson = JSON.stringify(starting);
  const subsJson = JSON.stringify(subs);
  const now = new Date();

  try {
    if (existing.length > 0) {
      await queryText(
        `UPDATE match_lineups
           SET formation = ?, starting_xi = ?, substitutes = ?, coach = ?,
               updated_by = ?, updated_at = ?
         WHERE match_id = ? AND team_id = ?`,
        [
          formation,
          startingJson,
          subsJson,
          coach,
          session.user.id,
          now,
          input.matchId,
          input.teamId,
        ],
      );
    } else {
      await queryText(
        `INSERT INTO match_lineups
           (id, match_id, team_id, formation, starting_xi, substitutes, coach, updated_by, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uid(),
          input.matchId,
          input.teamId,
          formation,
          startingJson,
          subsJson,
          coach,
          session.user.id,
          now,
        ],
      );
    }
  } catch (e) {
    console.error("[saveLineup] DB write failed", e);
    return {
      ok: false,
      error: `Zapis do bazy nie powiódł się: ${e instanceof Error ? e.message : "nieznany błąd"}`,
    };
  }

  revalidatePath(`/mecze/${input.matchId}`);
  revalidatePath(`/mecze/${input.matchId}/sklady`);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function canEditLineupForTeam(
  matchId: string,
  teamId: string,
): Promise<boolean> {
  const me = await getCurrentUserWithRole();
  if (!me) return false;
  if (me.role === "admin") return true;
  if (me.role !== "captain") return false;
  if (me.teamId !== teamId) return false;
  const rows = await query<{
    home_team_id: string;
    away_team_id: string;
    played: number;
  }>("SELECT home_team_id, away_team_id, played FROM matches WHERE id = ?", [
    matchId,
  ]);
  const m = rows[0];
  if (!m) return false;
  if (m.played) return false;
  if (m.home_team_id !== teamId && m.away_team_id !== teamId) return false;
  const lineup = await query<{ locked_at: Date | string | null }>(
    "SELECT locked_at FROM match_lineups WHERE match_id = ? AND team_id = ? LIMIT 1",
    [matchId, teamId],
  );
  return !lineup[0]?.locked_at;
}

export type LineupData = {
  matchId: string;
  teamId: string;
  lineup: MatchLineup | null;
};
