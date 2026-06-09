import { getMatch } from "@/data/mockData";
import type { PlayerMatchStats, PlayerRating, PlayerRatingProvider, RatingBreakdown } from "@/lib/types";
import { breakdownToImpacts, clamp, round, stat } from "./shared";

export type ApiFootballStatsLoader = (matchId: string) => Promise<PlayerMatchStats[]>;

const defaultLoader: ApiFootballStatsLoader = async (matchId) => getMatch(matchId)?.playerStats ?? [];

/**
 * API-Football exposes aggregate box-score fields, not pass-recipient event streams.
 * This provider therefore uses transparent weighted aggregates instead of PageRank.
 */
export class ApiFootballRatingProvider implements PlayerRatingProvider {
  constructor(private readonly loadStats: ApiFootballStatsLoader = defaultLoader) {}

  async getMatchRatings(matchId: string): Promise<PlayerRating[]> {
    const stats = await this.loadStats(matchId);
    return stats.map((playerStats) => this.ratePlayer(playerStats)).sort((a, b) => b.rating - a.rating);
  }

  ratePlayer(playerStats: PlayerMatchStats): PlayerRating {
    const passAccuracy = stat(playerStats, "passAccuracy") || stat(playerStats, "passCompletion");
    const totalPasses = stat(playerStats, "totalPasses") || stat(playerStats, "progressivePasses") * 4;
    const breakdown: RatingBreakdown = {
      attacking: stat(playerStats, "goals") * 0.9 + stat(playerStats, "shots") * 0.08 + stat(playerStats, "shotsOnTarget") * 0.16 + stat(playerStats, "expectedGoals") * 0.35,
      playmaking: stat(playerStats, "assists") * 0.7 + stat(playerStats, "keyPasses") * 0.16 + stat(playerStats, "expectedAssists") * 0.35,
      possession: Math.max(0, passAccuracy - 75) * 0.018 + Math.min(totalPasses, 100) * 0.006 + stat(playerStats, "progressivePasses") * 0.05,
      defensive: stat(playerStats, "tackles") * 0.12 + stat(playerStats, "interceptions") * 0.14 + stat(playerStats, "clearances") * 0.07,
      goalkeeping: playerStats.position === "GK" ? stat(playerStats, "saves") * 0.22 : 0,
      disciplinePenalty: -(stat(playerStats, "yellowCards") * 0.25 + stat(playerStats, "redCards") * 1.25 + stat(playerStats, "penaltiesConceded") * 0.6 + stat(playerStats, "errorsLeadingToShots") * 0.35 + stat(playerStats, "errorsLeadingToGoals") * 1),
      details: ["Aggregate API-Football-compatible scoring; no pass-recipient graph is available."],
    };
    const minutes = stat(playerStats, "minutesPlayed");
    const baseRating = 6 + (minutes >= 75 ? 0.2 : minutes > 0 && minutes < 30 ? -0.25 : 0);
    const rating = round(clamp(baseRating + Object.entries(breakdown).reduce((sum, [, value]) => sum + (typeof value === "number" ? value : 0), 0), 0, 10));

    return {
      playerId: playerStats.playerId,
      playerName: playerStats.playerName,
      teamId: playerStats.teamId,
      position: playerStats.position,
      rating,
      baseRating: round(baseRating),
      impacts: breakdownToImpacts(breakdown),
      breakdown,
    };
  }
}
