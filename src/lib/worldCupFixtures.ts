import { COMPETITIONS } from "@/config/competitions";

const API_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io";

export type ApiFootballFixturesResponse = {
  response?: ApiFootballFixtureEntry[];
};

export type ApiFootballFixtureEntry = {
  fixture?: {
    id?: number;
    date?: string;
    venue?: {
      name?: string;
      city?: string;
    };
    status?: {
      short?: string;
      long?: string;
      elapsed?: number | null;
    };
  };
  league?: {
    id?: number;
    name?: string;
    round?: string;
    season?: number;
  };
  teams?: {
    home?: ApiFootballTeam;
    away?: ApiFootballTeam;
  };
  goals?: {
    home?: number | null;
    away?: number | null;
  };
  score?: {
    fulltime?: {
      home?: number | null;
      away?: number | null;
    };
  };
  events?: ApiFootballEvent[];
  statistics?: ApiFootballTeamStatistics[];
  lineups?: ApiFootballLineup[];
};

export type ApiFootballTeam = {
  id?: number;
  name?: string;
  logo?: string;
  winner?: boolean | null;
};

export type ApiFootballEvent = {
  time?: {
    elapsed?: number;
    extra?: number | null;
  };
  team?: ApiFootballTeam;
  player?: { name?: string };
  type?: string;
  detail?: string;
};

export type ApiFootballTeamStatistics = {
  team?: ApiFootballTeam;
  statistics?: Array<{ type?: string; value?: number | string | null }>;
};

export type ApiFootballLineup = {
  team?: ApiFootballTeam;
  formation?: string;
  coach?: { name?: string };
  startXI?: ApiFootballLineupPlayer[];
  substitutes?: ApiFootballLineupPlayer[];
};

export type ApiFootballLineupPlayer = {
  player?: {
    id?: number;
    name?: string;
    number?: number;
    pos?: string;
  };
};

function getApiFootballApiKey() {
  const apiKey = process.env.API_FOOTBALL_API_KEY;
  if (!apiKey) {
    throw new Error(
      "API_FOOTBALL_API_KEY is not configured for API-Football match data.",
    );
  }
  return apiKey;
}

function worldCupFixtureParams(extraParams: Record<string, string> = {}) {
  const worldCup = COMPETITIONS.WORLD_CUP;
  return new URLSearchParams({
    league: String(worldCup.apiFootballLeagueId),
    season: String(worldCup.season),
    ...extraParams,
  });
}

async function fetchWorldCupFixtures(params: URLSearchParams) {
  const response = await fetch(
    `${process.env.API_FOOTBALL_BASE_URL ?? API_FOOTBALL_BASE_URL}/fixtures?${params.toString()}`,
    {
      headers: {
        "x-apisports-key": getApiFootballApiKey(),
      },
      next: { revalidate: 60 },
    },
  );

  if (!response.ok) {
    throw new Error(
      `API-Football fixtures request failed with ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as ApiFootballFixturesResponse;
  return filterWorldCupFixtures(data.response ?? []);
}

// API-Football returns fixtures from many competitions unless filtered by league and season.
// This project is currently scoped to FIFA World Cup 2026, so all fixture calls must use the World Cup league ID and season.
export async function getWorldCupFixtures() {
  return fetchWorldCupFixtures(worldCupFixtureParams());
}

export async function getWorldCupLiveFixtures() {
  return fetchWorldCupFixtures(worldCupFixtureParams({ live: "all" }));
}

export async function getWorldCupFixtureById(fixtureId: string) {
  const fixtures = await fetchWorldCupFixtures(
    worldCupFixtureParams({ id: fixtureId }),
  );
  return fixtures[0];
}

export function filterWorldCupFixtures(fixtures: ApiFootballFixtureEntry[]) {
  return fixtures.filter(
    (fixture) =>
      fixture.league?.id === COMPETITIONS.WORLD_CUP.apiFootballLeagueId,
  );
}

export const worldCupFixturesInternals = {
  filterWorldCupFixtures,
  worldCupFixtureParams,
};
