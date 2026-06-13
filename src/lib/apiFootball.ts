import { getActiveCompetition, WORLD_CUP_2026, type CompetitionConfig } from "@/config/competitions";
import type {
  ApiFootballFixtureEntry,
  ApiFootballFixturesResponse,
  ApiFootballLineupsResponse,
  ApiFootballRoundsResponse,
  ApiFootballStandingLeagueEntry,
  ApiFootballStandingsResponse,
} from "@/lib/worldCupFixtures";

const API_BASE = "https://v3.football.api-sports.io";

function getApiFootballApiKey() {
  const apiKey = process.env.API_FOOTBALL_API_KEY;

  if (!apiKey) {
    throw new Error("API_FOOTBALL_API_KEY is not configured for API-Football competition data.");
  }

  return apiKey;
}

function competitionParams(competition: CompetitionConfig = getActiveCompetition(), extraParams: Record<string, string> = {}) {
  return new URLSearchParams({
    league: String(competition.apiFootballLeagueId),
    season: String(competition.season),
    ...extraParams,
  });
}

function worldCupParams(extraParams: Record<string, string> = {}) {
  return competitionParams(WORLD_CUP_2026, extraParams);
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

export async function getCompetitionFixtures(competition: CompetitionConfig = getActiveCompetition()) {
  const data = await apiFootballGet<ApiFootballFixturesResponse>("/fixtures", competitionParams(competition));
  return filterCompetitionFixturesResponse(data, competition);
}

export async function getCompetitionFixtureById(fixtureId: string, competition: CompetitionConfig = getActiveCompetition()) {
  const data = await apiFootballGet<ApiFootballFixturesResponse>("/fixtures", competitionParams(competition, { id: fixtureId }));
  return filterCompetitionFixturesResponse(data, competition);
}

export async function getCompetitionFixtureLineups(fixtureId: string) {
  return apiFootballGet<ApiFootballLineupsResponse>("/fixtures/lineups", new URLSearchParams({ fixture: fixtureId }));
}

export async function getCompetitionLiveFixtures(competition: CompetitionConfig = getActiveCompetition()) {
  const data = await apiFootballGet<ApiFootballFixturesResponse>("/fixtures", competitionParams(competition, { live: "all" }));
  return filterCompetitionFixturesResponse(data, competition);
}

export async function getCompetitionStandings(competition: CompetitionConfig = getActiveCompetition()) {
  const data = await apiFootballGet<ApiFootballStandingsResponse>("/standings", competitionParams(competition));
  return filterCompetitionStandingsResponse(data, competition);
}

export async function getCompetitionRounds(competition: CompetitionConfig = getActiveCompetition()) {
  return apiFootballGet<ApiFootballRoundsResponse>("/fixtures/rounds", competitionParams(competition));
}

export async function getCompetitionFixturesByRound(round: string, competition: CompetitionConfig = getActiveCompetition()) {
  const data = await apiFootballGet<ApiFootballFixturesResponse>("/fixtures", competitionParams(competition, { round }));
  return filterCompetitionFixturesResponse(data, competition);
}

export async function getWorldCupFixtures() {
  return getCompetitionFixtures(WORLD_CUP_2026);
}

export async function getWorldCupLiveFixtures() {
  return getCompetitionLiveFixtures(WORLD_CUP_2026);
}

export async function getWorldCupFixtureById(fixtureId: string) {
  return getCompetitionFixtureById(fixtureId, WORLD_CUP_2026);
}

export async function getWorldCupFixtureLineups(fixtureId: string) {
  return getCompetitionFixtureLineups(fixtureId);
}

export async function getWorldCupStandings() {
  return getCompetitionStandings(WORLD_CUP_2026);
}

export async function getWorldCupRounds() {
  return getCompetitionRounds(WORLD_CUP_2026);
}

export async function getWorldCupFixturesByRound(round: string) {
  return getCompetitionFixturesByRound(round, WORLD_CUP_2026);
}

function filterCompetitionFixturesResponse(data: ApiFootballFixturesResponse, competition: CompetitionConfig): ApiFootballFixturesResponse {
  return {
    ...data,
    response: (data.response ?? []).filter((item) => isCompetitionFixture(item, competition)),
  };
}

function filterCompetitionStandingsResponse(data: ApiFootballStandingsResponse, competition: CompetitionConfig): ApiFootballStandingsResponse {
  return {
    ...data,
    response: (data.response ?? []).filter((item) => isCompetitionStanding(item, competition)),
  };
}

function isCompetitionFixture(item: ApiFootballFixtureEntry, competition: CompetitionConfig) {
  return (
    item.league?.id === competition.apiFootballLeagueId &&
    item.league?.season === competition.season &&
    item.league?.name?.toLowerCase().includes(competition.name.toLowerCase()) === true
  );
}

function isCompetitionStanding(item: ApiFootballStandingLeagueEntry, competition: CompetitionConfig) {
  return (
    item.league?.id === competition.apiFootballLeagueId &&
    item.league?.season === competition.season
  );
}

function filterWorldCupFixturesResponse(data: ApiFootballFixturesResponse): ApiFootballFixturesResponse {
  return filterCompetitionFixturesResponse(data, WORLD_CUP_2026);
}

function filterWorldCupStandingsResponse(data: ApiFootballStandingsResponse): ApiFootballStandingsResponse {
  return filterCompetitionStandingsResponse(data, WORLD_CUP_2026);
}

function isWorldCup2026Fixture(item: ApiFootballFixtureEntry) {
  return isCompetitionFixture(item, WORLD_CUP_2026);
}

function isWorldCup2026Standing(item: ApiFootballStandingLeagueEntry) {
  return isCompetitionStanding(item, WORLD_CUP_2026);
}

export const apiFootballInternals = {
  competitionParams,
  filterCompetitionFixturesResponse,
  filterCompetitionStandingsResponse,
  filterWorldCupFixturesResponse,
  filterWorldCupStandingsResponse,
  isCompetitionFixture,
  isCompetitionStanding,
  isWorldCup2026Fixture,
  isWorldCup2026Standing,
  worldCupParams,
};
