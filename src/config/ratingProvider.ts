import type { PlayerRatingProvider } from "@/lib/types";
import { ApiFootballRatingProvider } from "@/providers/ApiFootballRatingProvider";
import { SampleRatingProvider } from "@/providers/SampleRatingProvider";
import { StatsBombAdvancedRatingProvider } from "@/providers/StatsBombAdvancedRatingProvider";

export type RatingProviderName = "sample" | "api-football" | "statsbomb-advanced";

/**
 * Switch providers with RATING_PROVIDER or NEXT_PUBLIC_RATING_PROVIDER=sample,
 * api-football, or statsbomb-advanced. Sample is the default for local
 * development. Prefer the server-only RATING_PROVIDER in deployments so the
 * provider can be changed at runtime without rebuilding public env bundles.
 */
export function getRatingProvider(providerName = process.env.RATING_PROVIDER ?? process.env.NEXT_PUBLIC_RATING_PROVIDER): PlayerRatingProvider {
  switch (normalizeProviderName(providerName)) {
    case "api-football":
      return new ApiFootballRatingProvider();
    case "statsbomb-advanced":
      return new StatsBombAdvancedRatingProvider();
    case "sample":
    case undefined:
      return new SampleRatingProvider();
    default:
      return new SampleRatingProvider();
  }
}

function normalizeProviderName(providerName?: string): RatingProviderName | undefined {
  const normalized = providerName?.trim().toLowerCase();

  if (normalized === "api-football" || normalized === "sample" || normalized === "statsbomb-advanced") {
    return normalized;
  }

  return undefined;
}
