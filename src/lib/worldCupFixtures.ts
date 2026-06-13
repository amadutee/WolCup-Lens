import { getActiveCompetition, WORLD_CUP_2026, type CompetitionConfig } from "@/config/competitions";
import { getCompetitionFixtureById as fetchApiCompetitionFixtureById, getCompetitionFixtureLineups, getCompetitionFixtures as fetchApiCompetitionFixtures, getCompetitionFixturesByRound, getCompetitionRounds, getCompetitionStandings as fetchApiCompetitionStandings } from "@/lib/apiFootball";
import type { BracketRound, BracketTeamSlot, GroupStanding } from "@/data/tournamentData";
import type { MatchStatus, Team } from "@/lib/types";

export type ApiFootballFixturesResponse = {
  response?: ApiFootballFixtureEntry[];
};

export type ApiFootballStandingsResponse = {
  response?: ApiFootballStandingLeagueEntry[];
};

export type ApiFootballRoundsResponse = {
  response?: string[];
};

export type ApiFootballLineupsResponse = {
  response?: ApiFootballLineup[];
};

export type ApiFootballStandingLeagueEntry = {
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

// API-Football can return more than the requested competition in some response shapes.
// Keep this defensive filter close to the mapping layer so every UI consumer receives only the configured competition.
export async function getCompetitionFixtures(competition: CompetitionConfig = getActiveCompetition()) {
  try {
    const data = await fetchApiCompetitionFixtures(competition);
    return sortFixturesByDate(filterCompetitionFixtures(data.response ?? [], competition));
  } catch (error) {
    console.error(`[CompetitionFixtures] Unable to load API-Football ${competition.name} fixtures.`, error);
    return [];
  }
}

export async function getCompetitionFixtureById(fixtureId: string, competition: CompetitionConfig = getActiveCompetition()) {
  try {
    const data = await fetchApiCompetitionFixtureById(fixtureId, competition);
    const fixture = filterCompetitionFixtures(data.response ?? [], competition).find((item) => String(item.fixture?.id) === fixtureId);
    if (fixture) {
      return fixture;
    }
  } catch (error) {
    console.error(`[CompetitionFixtures] Unable to load API-Football ${competition.name} fixture ${fixtureId}.`, error);
  }

  const fixtures = await getCompetitionFixtures(competition);
  return fixtures.find((fixture) => String(fixture.fixture?.id) === fixtureId);
}

export async function getCompetitionLineupsByFixtureId(fixtureId: string, competition: CompetitionConfig = getActiveCompetition()) {
  try {
    const data = await getCompetitionFixtureLineups(fixtureId);
    return data.response ?? [];
  } catch (error) {
    console.error(`[CompetitionFixtures] Unable to load API-Football ${competition.name} lineups for fixture ${fixtureId}.`, error);
    return [];
  }
}

export async function getCompetitionStandings(competition: CompetitionConfig = getActiveCompetition()) {
  try {
    const data = await fetchApiCompetitionStandings(competition);
    return mapApiFootballStandings(data.response ?? [], competition);
  } catch (error) {
    console.error(`[CompetitionFixtures] Unable to load API-Football ${competition.name} standings.`, error);
    return {};
  }
}

export async function getCompetitionBracketRounds(competition: CompetitionConfig = getActiveCompetition()) {
  if (!competition.hasKnockoutBracket) {
    return [];
  }

  try {
    const roundsData = await getCompetitionRounds(competition);
    const knockoutRounds = (roundsData.response ?? []).filter(isKnockoutRound);
    const fixtureGroups = await Promise.all(
      knockoutRounds.map(async (roundName) => {
        const fixturesData = await getCompetitionFixturesByRound(roundName, competition);
        return {
          roundName,
          fixtures: sortFixturesByDate(filterCompetitionFixtures(fixturesData.response ?? [], competition)),
        };
      }),
    );

    return buildBracketRoundsFromRoundFixtures(fixtureGroups);
  } catch (error) {
    console.error(`[CompetitionFixtures] Unable to load API-Football ${competition.name} bracket.`, error);
    return [];
  }
}

export function filterCompetitionFixtures(fixtures: ApiFootballFixtureEntry[], competition: CompetitionConfig = getActiveCompetition()) {
  return fixtures.filter(
    (fixture) =>
      fixture.league?.id === competition.apiFootballLeagueId &&
      fixture.league?.season === competition.season &&
      fixture.league?.name?.toLowerCase().includes(competition.name.toLowerCase()) === true,
  );
}

export async function getWorldCupFixtures() {
  return getCompetitionFixtures(WORLD_CUP_2026);
}

export async function getWorldCupFixtureById(fixtureId: string) {
  return getCompetitionFixtureById(fixtureId, WORLD_CUP_2026);
}

export async function getWorldCupLineupsByFixtureId(fixtureId: string) {
  return getCompetitionLineupsByFixtureId(fixtureId, WORLD_CUP_2026);
}

export async function getWorldCupStandings() {
  return getCompetitionStandings(WORLD_CUP_2026);
}

export async function getWorldCupBracketRounds() {
  return getCompetitionBracketRounds(WORLD_CUP_2026);
}

export function filterWorldCupFixtures(fixtures: ApiFootballFixtureEntry[]) {
  return filterCompetitionFixtures(fixtures, WORLD_CUP_2026);
}

export function sortFixturesByDate(fixtures: ApiFootballFixtureEntry[]) {
  return fixtures.slice().sort((a, b) => Date.parse(a.fixture?.date ?? "") - Date.parse(b.fixture?.date ?? ""));
}

export function splitFixturesByStatus(fixtures: ApiFootballFixtureEntry[]) {
  return {
    upcoming: fixtures.filter((fixture) => isUpcomingStatus(fixture.fixture?.status?.short)),
    live: fixtures.filter((fixture) => isLiveStatus(fixture.fixture?.status?.short)),
    completed: fixtures.filter((fixture) => isCompletedStatus(fixture.fixture?.status?.short)),
  };
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

export function mapApiFootballStandings(entries: ApiFootballStandingLeagueEntry[], competition: CompetitionConfig = getActiveCompetition()) {
  const competitionEntry = entries.find(
    (entry) =>
      entry.league?.id === competition.apiFootballLeagueId &&
      entry.league?.season === competition.season,
  );

  return (competitionEntry?.league?.standings ?? []).reduce<Record<string, GroupStanding[]>>(
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

export function buildBracketRoundsFromFixtures(fixtures: ApiFootballFixtureEntry[]): BracketRound[] {
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
        .map((fixture, index) => mapBracketMatch(name, fixture, index)),
    }));
}

function buildBracketRoundsFromRoundFixtures(rounds: Array<{ roundName: string; fixtures: ApiFootballFixtureEntry[] }>): BracketRound[] {
  return rounds
    .filter(({ roundName }) => isKnockoutRound(roundName))
    .sort((a, b) => knockoutRoundOrder(a.roundName) - knockoutRoundOrder(b.roundName))
    .map(({ roundName, fixtures }) => ({
      name: roundName,
      matches: fixtures
        .slice()
        .sort((a, b) => Date.parse(a.fixture?.date ?? "") - Date.parse(b.fixture?.date ?? ""))
        .map((fixture, index) => mapBracketMatch(roundName, fixture, index)),
    }))
    .filter((round) => round.matches.length > 0);
}

function mapBracketMatch(name: string, fixture: ApiFootballFixtureEntry, index: number) {
  return {
    id: String(fixture.fixture?.id ?? `${name}-${index}`),
    label: `${shortRoundLabel(name)} ${index + 1}`,
    date: formatFixtureDate(fixture.fixture?.date),
    venue: fixture.fixture?.venue?.city ?? fixture.fixture?.venue?.name ?? "Venue TBC",
    status: mapStatus(fixture.fixture?.status?.short),
    home: mapBracketSlot(fixture.teams?.home, fixture.goals?.home ?? fixture.score?.fulltime?.home, "Home seed"),
    away: mapBracketSlot(fixture.teams?.away, fixture.goals?.away ?? fixture.score?.fulltime?.away, "Away seed"),
    winnerTeamId: getWinnerTeamId(fixture),
  };
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

export function isKnockoutRound(round?: string) {
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
  if (isLiveStatus(status)) {
    return "live";
  }

  if (isUpcomingStatus(status)) {
    return "upcoming";
  }

  return "recent";
}

export function isUpcomingStatus(status?: string) {
  return ["NS", "TBD"].includes(status ?? "");
}

export function isLiveStatus(status?: string) {
  return ["1H", "HT", "2H", "ET", "P", "BT", "LIVE"].includes(status ?? "");
}

export function isCompletedStatus(status?: string) {
  return ["FT", "AET", "PEN"].includes(status ?? "");
}

function abbreviateTeamName(name: string) {
  const compact = name.replace(/[^A-Za-z]/g, "");
  return (compact.length >= 3 ? compact.slice(0, 3) : name.slice(0, 3)).toUpperCase();
}

export const worldCupFixturesInternals = {
  buildBracketRoundsFromFixtures,
  buildBracketRoundsFromRoundFixtures,
  filterCompetitionFixtures,
  filterWorldCupFixtures,
  isKnockoutRound,
  mapApiFootballStandings,
  splitFixturesByStatus,
};
