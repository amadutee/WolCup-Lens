import { WORLD_CUP_2026 } from "@/config/competitions";
import type {
  ApiFootballFixtureEntry,
  ApiFootballFixturesResponse,
  ApiFootballRoundsResponse,
  ApiFootballStandingLeagueEntry,
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
  const data = await apiFootballGet<ApiFootballFixturesResponse>("/fixtures", worldCupParams());
  return filterWorldCupFixturesResponse(data);
}

export async function getWorldCupLiveFixtures() {
  const data = await apiFootballGet<ApiFootballFixturesResponse>("/fixtures", worldCupParams({ live: "all" }));
  return filterWorldCupFixturesResponse(data);
}

export async function getWorldCupStandings() {
  const data = await apiFootballGet<ApiFootballStandingsResponse>("/standings", worldCupParams());
  return filterWorldCupStandingsResponse(data);
}

export async function getWorldCupRounds() {
  return apiFootballGet<ApiFootballRoundsResponse>("/fixtures/rounds", worldCupParams());
}

export async function getWorldCupFixturesByRound(round: string) {
  const data = await apiFootballGet<ApiFootballFixturesResponse>("/fixtures", worldCupParams({ round }));
  return filterWorldCupFixturesResponse(data);
}

function filterWorldCupFixturesResponse(data: ApiFootballFixturesResponse): ApiFootballFixturesResponse {
  return {
    ...data,
    response: (data.response ?? []).filter(isWorldCup2026Fixture),
  };
}

function filterWorldCupStandingsResponse(data: ApiFootballStandingsResponse): ApiFootballStandingsResponse {
  return {
    ...data,
    response: (data.response ?? []).filter(isWorldCup2026Standing),
  };
}

function isWorldCup2026Fixture(item: ApiFootballFixtureEntry) {
  return (
    item.league?.id === WORLD_CUP_2026.apiFootballLeagueId &&
    item.league?.season === WORLD_CUP_2026.season &&
    item.league?.name?.toLowerCase().includes(WORLD_CUP_2026.name.toLowerCase()) === true
  );
}

function isWorldCup2026Standing(item: ApiFootballStandingLeagueEntry) {
  return (
    item.league?.id === WORLD_CUP_2026.apiFootballLeagueId &&
    item.league?.season === WORLD_CUP_2026.season
  );
}

export const apiFootballInternals = {
  filterWorldCupFixturesResponse,
  filterWorldCupStandingsResponse,
  isWorldCup2026Fixture,
  isWorldCup2026Standing,
  worldCupParams,
};
