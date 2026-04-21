import type { LineupPlayer } from "./types";

export const STARTING_SIZE = 6;
export const MAX_SUBS = 7;

// Formacje dla 6-osobowego składu (bramkarz + 5 w polu).
// Współrzędne liczone dla DOMOWEJ strony boiska (y: 0=linia bramkowa własna,
// 100=linia środkowa). Pozycja gości jest lustrzana (y → 100-y) przy renderze
// na pełnym boisku.
export const FORMATIONS: Record<
  string,
  { positions: { position: LineupPlayer["position"]; x: number; y: number }[] }
> = {
  "2-1-2": {
    positions: [
      { position: "GK", x: 50, y: 8 },
      { position: "DF", x: 30, y: 30 },
      { position: "DF", x: 70, y: 30 },
      { position: "MF", x: 50, y: 55 },
      { position: "FW", x: 30, y: 80 },
      { position: "FW", x: 70, y: 80 },
    ],
  },
  "2-2-1": {
    positions: [
      { position: "GK", x: 50, y: 8 },
      { position: "DF", x: 30, y: 28 },
      { position: "DF", x: 70, y: 28 },
      { position: "MF", x: 30, y: 55 },
      { position: "MF", x: 70, y: 55 },
      { position: "FW", x: 50, y: 82 },
    ],
  },
  "1-3-1": {
    positions: [
      { position: "GK", x: 50, y: 8 },
      { position: "DF", x: 50, y: 28 },
      { position: "MF", x: 22, y: 55 },
      { position: "MF", x: 50, y: 55 },
      { position: "MF", x: 78, y: 55 },
      { position: "FW", x: 50, y: 82 },
    ],
  },
  "3-1-1": {
    positions: [
      { position: "GK", x: 50, y: 8 },
      { position: "DF", x: 22, y: 28 },
      { position: "DF", x: 50, y: 28 },
      { position: "DF", x: 78, y: 28 },
      { position: "MF", x: 50, y: 55 },
      { position: "FW", x: 50, y: 82 },
    ],
  },
  "1-2-2": {
    positions: [
      { position: "GK", x: 50, y: 8 },
      { position: "DF", x: 50, y: 28 },
      { position: "MF", x: 30, y: 50 },
      { position: "MF", x: 70, y: 50 },
      { position: "FW", x: 30, y: 80 },
      { position: "FW", x: 70, y: 80 },
    ],
  },
};

export const FORMATION_NAMES = Object.keys(FORMATIONS);
export const DEFAULT_FORMATION = "2-1-2";

export function getFormationPositions(name: string) {
  return FORMATIONS[name]?.positions ?? FORMATIONS[DEFAULT_FORMATION].positions;
}

// Tworzy losowe rozstawienie gdy kapitan nie ustawił składu.
export function randomLineup(
  players: { id: string; number: number | null; position: string }[],
  formation: string = DEFAULT_FORMATION,
): { starting: LineupPlayer[]; subs: LineupPlayer[] } {
  const positions = getFormationPositions(formation);
  const sorted = [...players].sort((a, b) => {
    const aGk = a.position.toUpperCase().includes("BR") ? 0 : 1;
    const bGk = b.position.toUpperCase().includes("BR") ? 0 : 1;
    if (aGk !== bGk) return aGk - bGk;
    return (a.number ?? 999) - (b.number ?? 999);
  });
  const starting: LineupPlayer[] = [];
  for (let i = 0; i < positions.length && i < sorted.length; i++) {
    const p = sorted[i];
    const slot = positions[i];
    starting.push({
      playerId: p.id,
      shirtNumber: p.number,
      position: slot.position,
      x: slot.x,
      y: slot.y,
      isCaptain: false,
    });
  }
  const subs: LineupPlayer[] = sorted.slice(positions.length).map((p) => ({
    playerId: p.id,
    shirtNumber: p.number,
    position: guessPosition(p.position),
    x: 0,
    y: 0,
    isCaptain: false,
  }));
  return { starting, subs };
}

function guessPosition(raw: string): LineupPlayer["position"] {
  const s = raw.toUpperCase();
  if (s.includes("BR") || s.includes("GK")) return "GK";
  if (s.includes("OB") || s.includes("DEF") || s.includes("DF")) return "DF";
  if (s.includes("POM") || s.includes("MID") || s.includes("MF")) return "MF";
  if (s.includes("NAP") || s.includes("FW") || s.includes("ATK")) return "FW";
  return "MF";
}
