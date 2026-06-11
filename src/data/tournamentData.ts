import type { MatchStatus, Team } from "@/lib/types";

export type GroupStanding = {
  teamId: string;
  team?: Team;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  form: Array<"W" | "D" | "L">;
};

export type BracketTeamSlot = {
  teamId?: string;
  team?: Team;
  seed: string;
  score?: number | null;
};

export type BracketMatch = {
  id: string;
  label: string;
  date: string;
  venue: string;
  status: MatchStatus;
  home: BracketTeamSlot;
  away: BracketTeamSlot;
  winnerTeamId?: string;
};

export type BracketRound = {
  name: string;
  matches: BracketMatch[];
};

export const groupStageStandings: Record<string, GroupStanding[]> = {
  A: [
    { teamId: "arg", played: 3, wins: 2, draws: 1, losses: 0, goalsFor: 7, goalsAgainst: 3, points: 7, form: ["W", "D", "W"] },
    { teamId: "fra", played: 3, wins: 2, draws: 0, losses: 1, goalsFor: 6, goalsAgainst: 4, points: 6, form: ["W", "W", "L"] },
  ],
  B: [
    { teamId: "bra", played: 3, wins: 2, draws: 1, losses: 0, goalsFor: 5, goalsAgainst: 2, points: 7, form: ["D", "W", "W"] },
    { teamId: "eng", played: 3, wins: 1, draws: 2, losses: 0, goalsFor: 4, goalsAgainst: 2, points: 5, form: ["D", "D", "W"] },
  ],
  C: [
    { teamId: "esp", played: 3, wins: 2, draws: 0, losses: 1, goalsFor: 6, goalsAgainst: 3, points: 6, form: ["W", "L", "W"] },
    { teamId: "usa", played: 3, wins: 1, draws: 1, losses: 1, goalsFor: 4, goalsAgainst: 4, points: 4, form: ["L", "W", "D"] },
  ],
};

export const bracketRounds: BracketRound[] = [
  {
    name: "Quarter-finals",
    matches: [
      {
        id: "qf-arg-usa",
        label: "QF 1",
        date: "Jul 10",
        venue: "Seattle",
        status: "recent",
        home: { teamId: "esp", seed: "Group C winner", score: 3 },
        away: { teamId: "usa", seed: "Group C runner-up", score: 1 },
        winnerTeamId: "esp",
      },
      {
        id: "qf-arg-tbd",
        label: "QF 2",
        date: "Jul 11",
        venue: "Los Angeles",
        status: "recent",
        home: { teamId: "arg", seed: "Group A winner", score: 2 },
        away: { seed: "Cross-group runner-up", score: 0 },
        winnerTeamId: "arg",
      },
      {
        id: "qf-bra-eng",
        label: "QF 3",
        date: "Jul 12",
        venue: "Kansas City",
        status: "recent",
        home: { teamId: "bra", seed: "Group B winner", score: 1 },
        away: { teamId: "eng", seed: "Group B runner-up", score: 0 },
        winnerTeamId: "bra",
      },
      {
        id: "qf-fra-tbd",
        label: "QF 4",
        date: "Jul 12",
        venue: "Miami",
        status: "recent",
        home: { teamId: "fra", seed: "Group A runner-up", score: 2 },
        away: { seed: "Next group winner", score: 1 },
        winnerTeamId: "fra",
      },
    ],
  },
  {
    name: "Semi-finals",
    matches: [
      {
        id: "sf-arg-esp",
        label: "SF 1",
        date: "Jul 15",
        venue: "Atlanta",
        status: "upcoming",
        home: { teamId: "arg", seed: "QF 2 winner", score: null },
        away: { teamId: "esp", seed: "QF 1 winner", score: null },
      },
      {
        id: "sf-bra-fra",
        label: "SF 2",
        date: "Jul 15",
        venue: "Arlington",
        status: "upcoming",
        home: { teamId: "bra", seed: "QF 3 winner", score: null },
        away: { teamId: "fra", seed: "QF 4 winner", score: null },
      },
    ],
  },
  {
    name: "Final",
    matches: [
      {
        id: "final-path",
        label: "Final",
        date: "Jul 19",
        venue: "East Rutherford",
        status: "live",
        home: { teamId: "arg", seed: "SF 1 winner", score: 2 },
        away: { teamId: "fra", seed: "SF 2 winner", score: 1 },
        winnerTeamId: "arg",
      },
    ],
  },
];
