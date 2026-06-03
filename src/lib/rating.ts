import type { PlayerRating, PlayerStats, Position, RatingImpact } from "./types";

type WeightedStat = {
  key: keyof PlayerStats;
  label: string;
  weight: number;
  format?: (value: number) => string;
};

type PositionWeights = Record<Position, Partial<Record<keyof PlayerStats, number>>>;

const baseWeights: WeightedStat[] = [
  { key: "goals", label: "Goals", weight: 1.15 },
  { key: "assists", label: "Assists", weight: 0.8 },
  { key: "expectedGoals", label: "Expected goals", weight: 0.45, format: (value) => value.toFixed(2) },
  { key: "expectedAssists", label: "Expected assists", weight: 0.45, format: (value) => value.toFixed(2) },
  { key: "shotsOnTarget", label: "Shots on target", weight: 0.18 },
  { key: "keyPasses", label: "Key passes", weight: 0.2 },
  { key: "passCompletion", label: "Pass completion", weight: 0.025, format: (value) => `${value}%` },
  { key: "progressivePasses", label: "Progressive passes", weight: 0.08 },
  { key: "tackles", label: "Tackles", weight: 0.12 },
  { key: "interceptions", label: "Interceptions", weight: 0.14 },
  { key: "clearances", label: "Clearances", weight: 0.08 },
  { key: "errorsLeadingToShots", label: "Errors leading to shots", weight: -0.45 },
  { key: "errorsLeadingToGoals", label: "Errors leading to goals", weight: -1.15 },
  { key: "yellowCards", label: "Yellow cards", weight: -0.25 },
  { key: "redCards", label: "Red cards", weight: -1.4 },
];

const positionMultipliers: PositionWeights = {
  GK: {
    passCompletion: 0.8,
    clearances: 1.15,
    errorsLeadingToGoals: 1.35,
    errorsLeadingToShots: 1.25,
  },
  DEF: {
    tackles: 1.35,
    interceptions: 1.35,
    clearances: 1.4,
    passCompletion: 1.05,
    errorsLeadingToGoals: 1.25,
  },
  MID: {
    assists: 1.15,
    expectedAssists: 1.25,
    keyPasses: 1.25,
    progressivePasses: 1.35,
    passCompletion: 1.15,
    tackles: 1.05,
  },
  FWD: {
    goals: 1.25,
    assists: 1.05,
    expectedGoals: 1.35,
    shotsOnTarget: 1.25,
    keyPasses: 1.05,
  },
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const round = (value: number) => Math.round(value * 10) / 10;

function getImpact(stat: WeightedStat, playerStats: PlayerStats): RatingImpact {
  const rawValue = playerStats[stat.key];
  const numericValue = typeof rawValue === "number" ? rawValue : 0;
  const multiplier = positionMultipliers[playerStats.position][stat.key] ?? 1;
  let impact = numericValue * stat.weight * multiplier;

  if (stat.key === "passCompletion") {
    impact = (numericValue - 76) * stat.weight * multiplier;
  }

  const direction: RatingImpact["direction"] = impact > 0.05 ? "positive" : impact < -0.05 ? "negative" : "neutral";

  return {
    label: stat.label,
    value: stat.format ? stat.format(numericValue) : String(numericValue),
    impact: round(impact),
    direction,
  };
}

export function calculatePlayerRating(playerStats: PlayerStats): PlayerRating {
  const minutesAdjustment = playerStats.minutesPlayed >= 75 ? 0.25 : playerStats.minutesPlayed < 30 ? -0.3 : 0;
  const minutesDirection: RatingImpact["direction"] = minutesAdjustment > 0 ? "positive" : minutesAdjustment < 0 ? "negative" : "neutral";
  const baseRating = 6 + minutesAdjustment;
  const statImpacts = baseWeights.map((stat) => getImpact(stat, playerStats));
  const totalImpact = statImpacts.reduce((sum, impact) => sum + impact.impact, 0);
  const rating = round(clamp(baseRating + totalImpact, 0, 10));

  const impacts: RatingImpact[] = [
    {
      label: "Minutes played",
      value: `${playerStats.minutesPlayed}'`,
      impact: round(minutesAdjustment),
      direction: minutesDirection,
    },
    ...statImpacts.filter((impact) => impact.direction !== "neutral" || impact.label === "Pass completion"),
  ].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

  return {
    playerId: playerStats.playerId,
    playerName: playerStats.playerName,
    teamId: playerStats.teamId,
    position: playerStats.position,
    rating,
    baseRating: round(baseRating),
    impacts,
  };
}

export function calculateMatchRatings(players: PlayerStats[]): PlayerRating[] {
  return players.map(calculatePlayerRating).sort((a, b) => b.rating - a.rating);
}
