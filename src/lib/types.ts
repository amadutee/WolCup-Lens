export type MatchStatus = "upcoming" | "live" | "recent";
export type Position = "GK" | "DEF" | "MID" | "FWD";

export type Team = {
  id: string;
  name: string;
  shortName: string;
  flag: string;
  fifaRank: number;
  group: string;
};

export type PlayerStats = {
  playerId: string;
  matchId: string;
  teamId: string;
  playerName: string;
  position: Position;
  minutesPlayed: number;
  goals: number;
  assists: number;
  expectedGoals: number;
  expectedAssists: number;
  shotsOnTarget: number;
  keyPasses: number;
  passCompletion: number;
  progressivePasses: number;
  tackles: number;
  interceptions: number;
  clearances: number;
  errorsLeadingToShots: number;
  errorsLeadingToGoals: number;
  yellowCards: number;
  redCards: number;
};

export type LineupPlayer = {
  playerId: string;
  name: string;
  shirtNumber: number;
  position: Position;
};

export type TeamLineup = {
  formation: string;
  starters: LineupPlayer[];
  substitutes: LineupPlayer[];
};

export type TimelineEvent = {
  minute: number;
  stoppage?: number;
  type: "goal" | "card" | "substitution" | "shot" | "var";
  teamId: string;
  player: string;
  detail: string;
};

export type TeamStats = {
  possession: number;
  shots: number;
  shotsOnTarget: number;
  expectedGoals: number;
  corners: number;
  fouls: number;
  passes: number;
  passCompletion: number;
};

export type Match = {
  id: string;
  stage: string;
  venue: string;
  city: string;
  kickoff: string;
  status: MatchStatus;
  minute?: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  timeline: TimelineEvent[];
  teamStats: Record<string, TeamStats>;
  lineups: Record<string, TeamLineup>;
  playerStats: PlayerStats[];
};

export type RatingImpact = {
  label: string;
  value: string;
  impact: number;
  direction: "positive" | "negative" | "neutral";
};

export type PlayerRating = {
  playerId: string;
  playerName: string;
  teamId: string;
  position: Position;
  rating: number;
  baseRating: number;
  impacts: RatingImpact[];
};
