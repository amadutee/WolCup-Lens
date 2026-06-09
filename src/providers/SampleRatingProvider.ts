import { getMatch } from "@/data/mockData";
import { calculateMatchRatings } from "@/lib/rating";
import type { PlayerRating, PlayerRatingProvider } from "@/lib/types";

export class SampleRatingProvider implements PlayerRatingProvider {
  async getMatchRatings(matchId: string): Promise<PlayerRating[]> {
    const match = getMatch(matchId);
    return match ? calculateMatchRatings(match.playerStats) : [];
  }
}
