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

export type FormResult = "W" | "D" | "L";

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
  form: FormResult[]; // oldest → newest, up to last 5
};

export type ScorerRow = {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  teamColor: string;
  teamShortName: string;
  goals: number;
};

export type UserRole = "admin" | "captain" | "user";

export type AppUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  teamId: string | null;
  createdAt: string;
};

export type LineupPlayer = {
  playerId: string;
  shirtNumber: number | null;
  position: "GK" | "DF" | "MF" | "FW";
  x: number;
  y: number;
  isCaptain: boolean;
};

export type MatchLineup = {
  matchId: string;
  teamId: string;
  formation: string;
  startingXI: LineupPlayer[];
  substitutes: LineupPlayer[];
  coach: string | null;
  updatedBy: string | null;
  updatedAt: string;
  lockedAt: string | null;
};
