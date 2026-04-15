export type Team = {
  id: string;
  name: string;
  shortName: string;
  color: string;
};

export type Player = {
  id: string;
  teamId: string;
  name: string;
  number: number | null;
  position: string;
};

export type Match = {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  date: string; // ISO
  round: number | null;
  homeScore: number | null;
  awayScore: number | null;
  played: boolean;
};

export type Goal = {
  id: string;
  matchId: string;
  playerId: string;
  teamId: string;
  minute: number | null;
  ownGoal: boolean;
};

export type GoalWithNames = Goal & {
  playerName: string;
};

export type League = {
  teams: Team[];
  players: Player[];
  matches: Match[];
};

export type Standing = {
  team: Team;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
};
