import { WORLD_CUP_2026 } from "@/config/competitions";
import type {
  ApiFootballFixturesResponse,
  ApiFootballRoundsResponse,
  ApiFootballStandingsResponse,
} from "@/lib/worldCupFixtures";

const API_BASE = "https://v3.football.api-sports.io";

function getApiFootballApiKey() {
  const apiKey = process.env.API_FOOTBALL_API_KEY;

  if (!apiKey) {
    throw new Error("API_FOOTBALL_API_KEY is not configured for API-Football World Cup data.");
  }

  return apiKey;
}

function worldCupParams(extraParams: Record<string, string> = {}) {
  return new URLSearchParams({
    league: String(WORLD_CUP_2026.apiFootballLeagueId),
    season: String(WORLD_CUP_2026.season),
    ...extraParams,
  });
}

async function apiFootballGet<T>(path: string, params: URLSearchParams) {
  const response = await fetch(
    `${process.env.API_FOOTBALL_BASE_URL ?? API_BASE}${path}?${params.toString()}`,
    {
      headers: {
        "x-apisports-key": getApiFootballApiKey(),
      },
      next: { revalidate: 60 },
    },
  );

  if (!response.ok) {
    throw new Error(`API-Football ${path} request failed with ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export async function getWorldCupFixtures() {
  return apiFootballGet<ApiFootballFixturesResponse>("/fixtures", worldCupParams());
}

export async function getWorldCupStandings() {
  return apiFootballGet<ApiFootballStandingsResponse>("/standings", worldCupParams());
}

export async function getWorldCupRounds() {
  return apiFootballGet<ApiFootballRoundsResponse>("/fixtures/rounds", worldCupParams());
}

export async function getWorldCupFixturesByRound(round: string) {
  return apiFootballGet<ApiFootballFixturesResponse>("/fixtures", worldCupParams({ round }));
}

export const apiFootballInternals = {
  worldCupParams,
};
