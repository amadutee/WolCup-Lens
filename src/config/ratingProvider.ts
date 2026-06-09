import type { PlayerRatingProvider } from "@/lib/types";
import { ApiFootballRatingProvider } from "@/providers/ApiFootballRatingProvider";
import { SampleRatingProvider } from "@/providers/SampleRatingProvider";
import { StatsBombAdvancedRatingProvider } from "@/providers/StatsBombAdvancedRatingProvider";

export type RatingProviderName = "sample" | "api-football" | "statsbomb-advanced";

/**
 * Switch providers with NEXT_PUBLIC_RATING_PROVIDER=sample, api-football,
 * or statsbomb-advanced. Sample is the default for local development.
 */
export function getRatingProvider(providerName = process.env.NEXT_PUBLIC_RATING_PROVIDER): PlayerRatingProvider {
  switch (providerName) {
    case "api-football":
      return new ApiFootballRatingProvider();
    case "statsbomb-advanced":
      return new StatsBombAdvancedRatingProvider();
    case "sample":
    case undefined:
    case "":
      return new SampleRatingProvider();
    default:
      return new SampleRatingProvider();
  }
}
