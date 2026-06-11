import { isSampleMode } from "@/config/providerMode";
import { matches, teams } from "@/data/mockData";
import {
  getWorldCupFixtureById,
  getWorldCupFixtures,
  mapApiFootballTeamForDisplay,
} from "@/lib/worldCupFixtures";
import type {
  ApiFootballEvent,
  ApiFootballFixtureEntry,
  ApiFootballLineup,
  ApiFootballLineupPlayer,
  ApiFootballTeam,
  ApiFootballTeamStatistics,
} from "@/lib/worldCupFixtures";
import type {
  Match,
  MatchStatus,
  Position,
  Team,
  TeamLineup,
  TeamStats,
  TimelineEvent,
} from "./types";

export interface FootballDataProvider {
  getMatches(): Promise<Match[]>;
  getMatch(id: string): Promise<Match | undefined>;
  getTeams(): Promise<Team[]>;
}

export class MockFootballDataProvider implements FootballDataProvider {
  async getMatches() {
    return matches;
  }

  async getMatch(id: string) {
    return matches.find((match) => match.id === id);
  }

  async getTeams() {
    return teams;
  }
}

export class ApiFootballDataProvider implements FootballDataProvider {
  async getMatches() {
    const fixtures = await getWorldCupFixtures();

    return uniqueMatchesById(
      fixtures.map((fixture) => mapApiFootballFixture(fixture)),
    ).sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff));
  }

  async getMatch(id: string) {
    const fixtureId = resolveFixtureId(id);
    if (!fixtureId) {
      return undefined;
    }

    const fixture = await getWorldCupFixtureById(fixtureId);
    return fixture ? mapApiFootballFixture(fixture, id) : undefined;
  }

  async getTeams() {
    return teams;
  }
}

function resolveFixtureId(matchId: string) {
  if (/^\d+$/.test(matchId)) {
    return matchId;
  }

  return parseFixtureIdMap(process.env.API_FOOTBALL_FIXTURE_ID_MAP)[matchId];
}

function parseFixtureIdMap(value?: string): Record<string, string> {
  if (!value) {
    return {};
  }

  return value.split(",").reduce<Record<string, string>>((fixtureMap, pair) => {
    const [matchId, fixtureId] = pair.split(":").map((part) => part.trim());
    if (matchId && /^\d+$/.test(fixtureId)) {
      fixtureMap[matchId] = fixtureId;
    }
    return fixtureMap;
  }, {});
}

function mapApiFootballFixture(
  entry: ApiFootballFixtureEntry,
  requestedId?: string,
): Match {
  const fixtureId = String(entry.fixture?.id ?? requestedId ?? "unknown");
  const homeTeam = mapApiFootballTeam(entry.teams?.home);
  const awayTeam = mapApiFootballTeam(entry.teams?.away);
  const status = mapApiFootballStatus(entry.fixture?.status?.short);
  const homeScore = entry.goals?.home ?? entry.score?.fulltime?.home ?? null;
  const awayScore = entry.goals?.away ?? entry.score?.fulltime?.away ?? null;

  return {
    id: requestedId ?? fixtureId,
    stage:
      [entry.league?.round, entry.fixture?.status?.long]
        .filter(Boolean)
        .join(" · ") ||
      entry.league?.name ||
      "API-Football fixture",
    venue: entry.fixture?.venue?.name ?? "Venue TBC",
    city: entry.fixture?.venue?.city ?? "City TBC",
    kickoff: entry.fixture?.date ?? new Date().toISOString(),
    status,
    minute:
      status === "live"
        ? (entry.fixture?.status?.elapsed ?? undefined)
        : undefined,
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    timeline: mapApiFootballEvents(entry.events, homeTeam.id, awayTeam.id),
    teamStats: mapApiFootballTeamStats(entry.statistics),
    lineups: mapApiFootballLineups(entry.lineups),
    playerStats: [],
  };
}

function mapApiFootballTeam(team?: ApiFootballTeam): Team {
  return mapApiFootballTeamForDisplay(team);
}

function abbreviateTeamName(name: string) {
  const compact = name.replace(/[^A-Za-z]/g, "");
  return (
    compact.length >= 3 ? compact.slice(0, 3) : name.slice(0, 3)
  ).toUpperCase();
}

function mapApiFootballStatus(status?: string): MatchStatus {
  if (
    ["1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"].includes(
      status ?? "",
    )
  ) {
    return "live";
  }

  if (["NS", "TBD"].includes(status ?? "")) {
    return "upcoming";
  }

  return "recent";
}

function mapApiFootballEvents(
  events: ApiFootballEvent[] | undefined,
  homeTeamId: string,
  awayTeamId: string,
): TimelineEvent[] {
  return (events ?? []).flatMap((event) => {
    const type = mapApiFootballEventType(event.type);
    const teamId = String(event.team?.id ?? "");
    if (!type || (teamId !== homeTeamId && teamId !== awayTeamId)) {
      return [];
    }

    return [
      {
        minute: event.time?.elapsed ?? 0,
        stoppage: event.time?.extra ?? undefined,
        type,
        teamId,
        player: event.player?.name ?? "Unknown player",
        detail: event.detail ?? event.type ?? "Event",
      },
    ];
  });
}

function mapApiFootballEventType(
  type?: string,
): TimelineEvent["type"] | undefined {
  switch (type) {
    case "Goal":
      return "goal";
    case "Card":
      return "card";
    case "subst":
      return "substitution";
    case "Var":
      return "var";
    default:
      return undefined;
  }
}

function mapApiFootballTeamStats(
  statistics: ApiFootballTeamStatistics[] | undefined,
): Record<string, TeamStats> {
  return (statistics ?? []).reduce<Record<string, TeamStats>>(
    (teamStats, teamEntry) => {
      const teamId =
        teamEntry.team?.id === undefined
          ? undefined
          : String(teamEntry.team.id);
      if (!teamId) {
        return teamStats;
      }

      const stats = new Map(
        (teamEntry.statistics ?? []).map((statistic) => [
          statistic.type,
          parseStatValue(statistic.value),
        ]),
      );
      teamStats[teamId] = {
        possession: stats.get("Ball Possession") ?? 0,
        shots: stats.get("Total Shots") ?? 0,
        shotsOnTarget: stats.get("Shots on Goal") ?? 0,
        expectedGoals: stats.get("expected_goals") ?? 0,
        corners: stats.get("Corner Kicks") ?? 0,
        fouls: stats.get("Fouls") ?? 0,
        passes: stats.get("Total passes") ?? 0,
        passCompletion: stats.get("Passes %") ?? 0,
      };
      return teamStats;
    },
    {},
  );
}

function parseStatValue(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (!value) {
    return 0;
  }

  const parsed = Number.parseFloat(value.replace("%", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapApiFootballLineups(
  lineups: ApiFootballLineup[] | undefined,
): Record<string, TeamLineup> {
  return (lineups ?? []).reduce<Record<string, TeamLineup>>(
    (lineupMap, lineup) => {
      const teamId =
        lineup.team?.id === undefined ? undefined : String(lineup.team.id);
      if (!teamId) {
        return lineupMap;
      }

      lineupMap[teamId] = {
        formation: lineup.formation ?? "TBC",
        manager: lineup.coach?.name,
        starters: (lineup.startXI ?? []).map(mapApiFootballLineupPlayer),
        substitutes: (lineup.substitutes ?? []).map(mapApiFootballLineupPlayer),
      };
      return lineupMap;
    },
    {},
  );
}

function mapApiFootballLineupPlayer(entry: ApiFootballLineupPlayer) {
  return {
    playerId: String(entry.player?.id ?? entry.player?.name ?? "unknown"),
    name: entry.player?.name ?? "Unknown player",
    shirtNumber: entry.player?.number ?? 0,
    position: mapLineupPosition(entry.player?.pos),
  };
}

function mapLineupPosition(position?: string): Position {
  switch (position) {
    case "G":
      return "GK";
    case "D":
      return "DEF";
    case "F":
      return "FWD";
    case "M":
    default:
      return "MID";
  }
}

function uniqueMatchesById(matches: Match[]) {
  return Array.from(
    new Map(matches.map((match) => [match.id, match])).values(),
  );
}

function shouldUseApiFootballDataProvider() {
  return !isSampleMode();
}

export const footballDataProvider: FootballDataProvider =
  shouldUseApiFootballDataProvider()
    ? new ApiFootballDataProvider()
    : new MockFootballDataProvider();

export const footballApiInternals = {
  abbreviateTeamName,
  mapApiFootballFixture,
  mapApiFootballStatus,
  parseFixtureIdMap,
  resolveFixtureId,
  shouldUseApiFootballDataProvider,
};
