import type { PlayerMatchStats, RatingBreakdown, RatingImpact } from "@/lib/types";

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
export const round = (value: number, decimals = 1) => {
  const scale = 10 ** decimals;
  return Math.round(value * scale) / scale;
};

export const stat = (stats: PlayerMatchStats, key: keyof PlayerMatchStats) => {
  const value = stats[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
};

export function breakdownToImpacts(breakdown: RatingBreakdown): RatingImpact[] {
  const rows: Array<[string, number]> = [
    ["Attacking", breakdown.attacking],
    ["Playmaking", breakdown.playmaking],
    ["Possession", breakdown.possession],
    ["Defensive", breakdown.defensive],
    ["Goalkeeping", breakdown.goalkeeping],
    ["Discipline penalty", breakdown.disciplinePenalty],
  ];

  if (typeof breakdown.networkInfluence === "number") {
    rows.push(["Pass-network influence", breakdown.networkInfluence]);
  }

  if (typeof breakdown.xgChain === "number") {
    rows.push(["xG chain", breakdown.xgChain]);
  }

  return rows
    .filter(([, impact]) => Math.abs(impact) > 0.04)
    .map(([label, impact]) => ({
      label,
      value: impact >= 0 ? `+${round(impact).toFixed(1)}` : round(impact).toFixed(1),
      impact: round(impact),
      direction: (impact > 0 ? "positive" : impact < 0 ? "negative" : "neutral") as RatingImpact["direction"],
    }))
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
}
