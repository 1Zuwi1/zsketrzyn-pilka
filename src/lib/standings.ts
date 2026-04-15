import type { Match, Standing, Team } from "./types";

export function computeStandings(teams: Team[], matches: Match[]): Standing[] {
  const map = new Map<string, Standing>();
  for (const t of teams) {
    map.set(t.id, {
      team: t,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: 0,
    });
  }
  for (const m of matches) {
    if (!m.played || m.homeScore == null || m.awayScore == null) continue;
    const h = map.get(m.homeTeamId);
    const a = map.get(m.awayTeamId);
    if (!h || !a) continue;
    h.played++;
    a.played++;
    h.goalsFor += m.homeScore;
    h.goalsAgainst += m.awayScore;
    a.goalsFor += m.awayScore;
    a.goalsAgainst += m.homeScore;
    if (m.homeScore > m.awayScore) {
      h.wins++;
      h.points += 3;
      a.losses++;
    } else if (m.homeScore < m.awayScore) {
      a.wins++;
      a.points += 3;
      h.losses++;
    } else {
      h.draws++;
      a.draws++;
      h.points += 1;
      a.points += 1;
    }
  }
  for (const s of map.values()) s.goalDiff = s.goalsFor - s.goalsAgainst;
  return [...map.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDiff - a.goalDiff ||
      b.goalsFor - a.goalsFor ||
      a.team.name.localeCompare(b.team.name),
  );
}
