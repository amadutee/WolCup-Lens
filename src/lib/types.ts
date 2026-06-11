export type MatchStatus = "upcoming" | "live" | "recent";
export type Position = "GK" | "DEF" | "MID" | "FWD";

export type Team = {
  id: string;
  name: string;
  shortName: string;
  flag: string;
  logo?: string;
  fifaRank: number;
  group: string;
};

export type Player = {
  id: string;
  name: string;
  teamId: string;
  position: Position;
  shirtNumber?: number;
};

export type PlayerMatchStats = {
  playerId: string;
  matchId: string;
  teamId: string;
  playerName: string;
  position: Position;
  minutesPlayed?: number;
  goals?: number;
  assists?: number;
  expectedGoals?: number;
  expectedAssists?: number;
  shots?: number;
  shotsOnTarget?: number;
  keyPasses?: number;
  passAccuracy?: number;
  passCompletion?: number;
  totalPasses?: number;
  progressivePasses?: number;
  tackles?: number;
  interceptions?: number;
  clearances?: number;
  pressures?: number;
  ballRecoveries?: number;
  saves?: number;
  penaltiesWon?: number;
  penaltiesConceded?: number;
  errorsLeadingToShots?: number;
  errorsLeadingToGoals?: number;
  yellowCards?: number;
  redCards?: number;
};

export type PlayerStats = Required<
  Pick<
    PlayerMatchStats,
    | "playerId"
    | "matchId"
    | "teamId"
    | "playerName"
    | "position"
    | "minutesPlayed"
    | "goals"
    | "assists"
    | "expectedGoals"
    | "expectedAssists"
    | "shotsOnTarget"
    | "keyPasses"
    | "passCompletion"
    | "progressivePasses"
    | "tackles"
    | "interceptions"
    | "clearances"
    | "errorsLeadingToShots"
    | "errorsLeadingToGoals"
    | "yellowCards"
    | "redCards"
  >
>;

export type RatingBreakdown = {
  attacking: number;
  playmaking: number;
  possession: number;
  defensive: number;
  goalkeeping: number;
  disciplinePenalty: number;
  networkInfluence?: number;
  xgChain?: number;
  details?: string[];
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
  manager?: string;
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
  homeTeam?: Team;
  awayTeam?: Team;
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
  breakdown?: RatingBreakdown;
};

export interface PlayerRatingProvider {
  getMatchRatings(matchId: string): Promise<PlayerRating[]>;
}
