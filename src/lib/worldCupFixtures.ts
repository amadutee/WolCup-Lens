import { COMPETITIONS } from "@/config/competitions";
import type { BracketRound, BracketTeamSlot, GroupStanding } from "@/data/tournamentData";
import type { MatchStatus, Team } from "@/lib/types";

const API_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io";

export type ApiFootballFixturesResponse = {
  response?: ApiFootballFixtureEntry[];
};

export type ApiFootballStandingsResponse = {
  response?: ApiFootballStandingLeagueEntry[];
};

type ApiFootballStandingLeagueEntry = {
  league?: {
    id?: number;
    name?: string;
    season?: number;
    standings?: ApiFootballStandingEntry[][];
  };
};

type ApiFootballStandingEntry = {
  rank?: number;
  team?: ApiFootballTeam;
  points?: number;
  goalsDiff?: number;
  group?: string;
  form?: string;
  all?: {
    played?: number;
    win?: number;
    draw?: number;
    lose?: number;
    goals?: {
      for?: number;
      against?: number;
    };
  };
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

async function apiFootballGet<T>(path: string, params: URLSearchParams) {
  const response = await fetch(
    `${process.env.API_FOOTBALL_BASE_URL ?? API_FOOTBALL_BASE_URL}${path}?${params.toString()}`,
    {
      headers: {
        "x-apisports-key": getApiFootballApiKey(),
      },
      next: { revalidate: 60 },
    },
  );

  if (!response.ok) {
    throw new Error(
      `API-Football ${path} request failed with ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as T;
}

async function fetchWorldCupFixtures(params: URLSearchParams) {
  const data = await apiFootballGet<ApiFootballFixturesResponse>(
    "/fixtures",
    params,
  );
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

export async function getWorldCupStandings() {
  const data = await apiFootballGet<ApiFootballStandingsResponse>(
    "/standings",
    worldCupFixtureParams(),
  );
  return mapApiFootballStandings(data.response ?? []);
}

export async function getWorldCupBracketRounds() {
  const fixtures = await getWorldCupFixtures();
  return buildBracketRoundsFromFixtures(fixtures);
}

export function filterWorldCupFixtures(fixtures: ApiFootballFixtureEntry[]) {
  return fixtures.filter(
    (fixture) =>
      fixture.league?.id === COMPETITIONS.WORLD_CUP.apiFootballLeagueId,
  );
}

export function mapApiFootballTeamForDisplay(team?: ApiFootballTeam): Team {
  const name = team?.name ?? "TBD";
  return {
    id: String(team?.id ?? name),
    name,
    shortName: abbreviateTeamName(name),
    flag: "🏳️",
    logo: team?.logo,
    fifaRank: 0,
    group: "API",
  };
}

function mapApiFootballStandings(entries: ApiFootballStandingLeagueEntry[]) {
  const worldCupEntry = entries.find(
    (entry) => entry.league?.id === COMPETITIONS.WORLD_CUP.apiFootballLeagueId,
  );

  return (worldCupEntry?.league?.standings ?? []).reduce<Record<string, GroupStanding[]>>(
    (groups, table, tableIndex) => {
      for (const standing of table) {
        const group = normaliseGroupName(standing.group, tableIndex);
        groups[group] ??= [];
        const team = mapApiFootballTeamForDisplay(standing.team);
        groups[group].push({
          teamId: team.id,
          team,
          played: standing.all?.played ?? 0,
          wins: standing.all?.win ?? 0,
          draws: standing.all?.draw ?? 0,
          losses: standing.all?.lose ?? 0,
          goalsFor: standing.all?.goals?.for ?? 0,
          goalsAgainst: standing.all?.goals?.against ?? 0,
          points: standing.points ?? 0,
          form: parseForm(standing.form),
        });
      }
      return groups;
    },
    {},
  );
}

function buildBracketRoundsFromFixtures(fixtures: ApiFootballFixtureEntry[]): BracketRound[] {
  const knockoutFixtures = fixtures.filter((fixture) => isKnockoutRound(fixture.league?.round));
  const byRound = knockoutFixtures.reduce<Map<string, ApiFootballFixtureEntry[]>>((rounds, fixture) => {
    const roundName = fixture.league?.round ?? "Knockout";
    rounds.set(roundName, [...(rounds.get(roundName) ?? []), fixture]);
    return rounds;
  }, new Map());

  return Array.from(byRound.entries())
    .sort(([roundA], [roundB]) => knockoutRoundOrder(roundA) - knockoutRoundOrder(roundB))
    .map(([name, roundFixtures]) => ({
      name,
      matches: roundFixtures
        .slice()
        .sort((a, b) => Date.parse(a.fixture?.date ?? "") - Date.parse(b.fixture?.date ?? ""))
        .map((fixture, index) => ({
          id: String(fixture.fixture?.id ?? `${name}-${index}`),
          label: `${shortRoundLabel(name)} ${index + 1}`,
          date: formatFixtureDate(fixture.fixture?.date),
          venue: fixture.fixture?.venue?.city ?? fixture.fixture?.venue?.name ?? "Venue TBC",
          status: mapStatus(fixture.fixture?.status?.short),
          home: mapBracketSlot(fixture.teams?.home, fixture.goals?.home ?? fixture.score?.fulltime?.home, "Home seed"),
          away: mapBracketSlot(fixture.teams?.away, fixture.goals?.away ?? fixture.score?.fulltime?.away, "Away seed"),
          winnerTeamId: getWinnerTeamId(fixture),
        })),
    }));
}

function mapBracketSlot(team: ApiFootballTeam | undefined, score: number | null | undefined, fallbackSeed: string): BracketTeamSlot {
  const displayTeam = mapApiFootballTeamForDisplay(team);
  const hasTeam = team?.id !== undefined || Boolean(team?.name);
  return {
    teamId: hasTeam ? displayTeam.id : undefined,
    team: hasTeam ? displayTeam : undefined,
    seed: team?.name ?? fallbackSeed,
    score: score ?? null,
  };
}

function getWinnerTeamId(fixture: ApiFootballFixtureEntry) {
  if (fixture.teams?.home?.winner) {
    return String(fixture.teams.home.id ?? fixture.teams.home.name);
  }
  if (fixture.teams?.away?.winner) {
    return String(fixture.teams.away.id ?? fixture.teams.away.name);
  }
  return undefined;
}

function isKnockoutRound(round?: string) {
  if (!round) {
    return false;
  }

  return !/group/i.test(round);
}

function knockoutRoundOrder(round: string) {
  const lower = round.toLowerCase();
  if (lower.includes("round of 32")) return 1;
  if (lower.includes("round of 16")) return 2;
  if (lower.includes("quarter")) return 3;
  if (lower.includes("semi")) return 4;
  if (lower.includes("third")) return 5;
  if (lower.includes("final")) return 6;
  return 99;
}

function shortRoundLabel(round: string) {
  const lower = round.toLowerCase();
  if (lower.includes("round of 32")) return "R32";
  if (lower.includes("round of 16")) return "R16";
  if (lower.includes("quarter")) return "QF";
  if (lower.includes("semi")) return "SF";
  if (lower.includes("third")) return "3P";
  if (lower.includes("final")) return "Final";
  return "Match";
}

function formatFixtureDate(date?: string) {
  if (!date) {
    return "Date TBC";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function normaliseGroupName(group: string | undefined, tableIndex: number) {
  const match = group?.match(/Group\s+(.+)$/i);
  return match?.[1] ?? group ?? String.fromCharCode(65 + tableIndex);
}

function parseForm(form?: string): GroupStanding["form"] {
  return (form ?? "")
    .split("")
    .filter((result): result is "W" | "D" | "L" => ["W", "D", "L"].includes(result))
    .slice(-5);
}

function mapStatus(status?: string): MatchStatus {
  if (["1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"].includes(status ?? "")) {
    return "live";
  }

  if (["NS", "TBD"].includes(status ?? "")) {
    return "upcoming";
  }

  return "recent";
}

function abbreviateTeamName(name: string) {
  const compact = name.replace(/[^A-Za-z]/g, "");
  return (compact.length >= 3 ? compact.slice(0, 3) : name.slice(0, 3)).toUpperCase();
}

export const worldCupFixturesInternals = {
  buildBracketRoundsFromFixtures,
  filterWorldCupFixtures,
  mapApiFootballStandings,
  worldCupFixtureParams,
};
