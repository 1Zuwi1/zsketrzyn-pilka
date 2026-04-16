import type { FormResult, Match, Standing, Team } from "./types";

const FORM_LIMIT = 5;

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
      form: [],
    });
  }
  const formByTeam = new Map<string, { date: number; result: FormResult }[]>();
  for (const t of teams) formByTeam.set(t.id, []);

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

    const ts = +new Date(m.date);
    let homeResult: FormResult;
    let awayResult: FormResult;
    if (m.homeScore > m.awayScore) {
      h.wins++;
      h.points += 3;
      a.losses++;
      homeResult = "W";
      awayResult = "L";
    } else if (m.homeScore < m.awayScore) {
      a.wins++;
      a.points += 3;
      h.losses++;
      homeResult = "L";
      awayResult = "W";
    } else {
      h.draws++;
      a.draws++;
      h.points += 1;
      a.points += 1;
      homeResult = "D";
      awayResult = "D";
    }
    formByTeam.get(m.homeTeamId)?.push({ date: ts, result: homeResult });
    formByTeam.get(m.awayTeamId)?.push({ date: ts, result: awayResult });
  }
  for (const s of map.values()) {
    s.goalDiff = s.goalsFor - s.goalsAgainst;
    const entries = formByTeam.get(s.team.id) ?? [];
    entries.sort((a, b) => a.date - b.date);
    s.form = entries.slice(-FORM_LIMIT).map((e) => e.result);
  }
  return [...map.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDiff - a.goalDiff ||
      b.goalsFor - a.goalsFor ||
      a.team.name.localeCompare(b.team.name),
  );
}
