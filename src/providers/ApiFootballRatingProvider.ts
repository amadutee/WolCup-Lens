import { getMatch } from "@/data/mockData";
import type { PlayerMatchStats, PlayerRating, PlayerRatingProvider, Position, RatingBreakdown } from "@/lib/types";
import { breakdownToImpacts, clamp, round, stat } from "./shared";

export type ApiFootballStatsLoader = (matchId: string) => Promise<PlayerMatchStats[]>;

type ApiFootballFixturePlayersResponse = {
  response?: ApiFootballTeamPlayers[];
};

type ApiFootballTeamPlayers = {
  team?: {
    id?: number;
    name?: string;
  };
  players?: ApiFootballPlayerEntry[];
};

type ApiFootballPlayerEntry = {
  player?: {
    id?: number;
    name?: string;
  };
  statistics?: ApiFootballPlayerStatistics[];
};

type ApiFootballPlayerStatistics = {
  games?: {
    minutes?: number;
    position?: string;
  };
  shots?: {
    total?: number;
    on?: number;
  };
  goals?: {
    total?: number;
    assists?: number;
    saves?: number;
  };
  passes?: {
    total?: number;
    key?: number;
    accuracy?: number | string;
  };
  tackles?: {
    total?: number;
    interceptions?: number;
  };
  cards?: {
    yellow?: number;
    red?: number;
  };
  penalty?: {
    won?: number;
    commited?: number;
  };
};

const API_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io";

const defaultLoader: ApiFootballStatsLoader = async (matchId) => {
  const fixtureId = resolveFixtureId(matchId);
  const apiKey = process.env.API_FOOTBALL_API_KEY;

  if (!apiKey) {
    return fallbackOrThrow(matchId, "API_FOOTBALL_API_KEY is not configured");
  }

  if (!fixtureId) {
    return fallbackOrThrow(
      matchId,
      `No API-Football fixture id is configured for match "${matchId}". Set API_FOOTBALL_FIXTURE_ID_MAP or use numeric API fixture ids.`,
    );
  }

  const stats = await fetchApiFootballPlayerStats(fixtureId, apiKey, matchId);
  return stats.length > 0 ? stats : fallbackOrThrow(matchId, `API-Football returned no player stats for fixture ${fixtureId}`);
};

async function fetchApiFootballPlayerStats(fixtureId: string, apiKey: string, matchId: string): Promise<PlayerMatchStats[]> {
  const response = await fetch(`${process.env.API_FOOTBALL_BASE_URL ?? API_FOOTBALL_BASE_URL}/fixtures/players?fixture=${encodeURIComponent(fixtureId)}`, {
    headers: {
      "x-apisports-key": apiKey,
    },
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`API-Football request failed with ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as ApiFootballFixturePlayersResponse;
  return mapApiFootballFixturePlayers(data, matchId);
}

function resolveFixtureId(matchId: string) {
  if (/^\d+$/.test(matchId)) {
    return matchId;
  }

  const fixtureMap = parseFixtureIdMap(process.env.API_FOOTBALL_FIXTURE_ID_MAP);
  return fixtureMap[matchId];
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

function parseTeamIdMap(value?: string): Record<string, string> {
  if (!value) {
    return {};
  }

  return value.split(",").reduce<Record<string, string>>((teamMap, pair) => {
    const [apiTeamId, localTeamId] = pair.split(":").map((part) => part.trim());
    if (apiTeamId && localTeamId) {
      teamMap[apiTeamId] = localTeamId;
    }
    return teamMap;
  }, {});
}

function getMockPlayerStats(matchId: string) {
  return getMatch(matchId)?.playerStats ?? [];
}

function fallbackOrThrow(matchId: string, reason: string): PlayerMatchStats[] {
  if (allowsSampleFallback()) {
    console.warn(`[ApiFootballRatingProvider] ${reason}; using sample player stats for ${matchId}.`);
    return getMockPlayerStats(matchId);
  }

  throw new Error(`${reason}. To allow sample fallback, set API_FOOTBALL_ALLOW_SAMPLE_FALLBACK=true.`);
}

function allowsSampleFallback() {
  return process.env.API_FOOTBALL_ALLOW_SAMPLE_FALLBACK === "true" || (process.env.API_FOOTBALL_ALLOW_SAMPLE_FALLBACK !== "false" && process.env.NODE_ENV !== "production");
}

function resolveTeamId(
  team: ApiFootballTeamPlayers["team"],
  teamIndex: number,
  teamIdMap: Record<string, string>,
  localMatch: ReturnType<typeof getMatch>,
) {
  const apiTeamId = team?.id === undefined ? undefined : String(team.id);

  if (apiTeamId && teamIdMap[apiTeamId]) {
    return teamIdMap[apiTeamId];
  }

  if (localMatch && teamIndex === 0) {
    return localMatch.homeTeamId;
  }

  if (localMatch && teamIndex === 1) {
    return localMatch.awayTeamId;
  }

  return apiTeamId ?? team?.name ?? "unknown";
}

function mapApiFootballFixturePlayers(
  data: ApiFootballFixturePlayersResponse,
  matchId: string,
  teamIdMap = parseTeamIdMap(process.env.API_FOOTBALL_TEAM_ID_MAP),
): PlayerMatchStats[] {
  const localMatch = getMatch(matchId);

  return (data.response ?? []).flatMap((teamEntry, teamIndex) =>
    (teamEntry.players ?? []).map((playerEntry) => {
      const stats = playerEntry.statistics?.[0] ?? {};
      return {
        playerId: String(playerEntry.player?.id ?? playerEntry.player?.name ?? "unknown"),
        matchId,
        teamId: resolveTeamId(teamEntry.team, teamIndex, teamIdMap, localMatch),
        playerName: playerEntry.player?.name ?? "Unknown player",
        position: mapApiFootballPosition(stats.games?.position),
        minutesPlayed: stats.games?.minutes,
        goals: stats.goals?.total,
        assists: stats.goals?.assists,
        shots: stats.shots?.total,
        shotsOnTarget: stats.shots?.on,
        keyPasses: stats.passes?.key,
        passAccuracy: parseNumber(stats.passes?.accuracy),
        totalPasses: stats.passes?.total,
        tackles: stats.tackles?.total,
        interceptions: stats.tackles?.interceptions,
        saves: stats.goals?.saves,
        penaltiesWon: stats.penalty?.won,
        penaltiesConceded: stats.penalty?.commited,
        yellowCards: stats.cards?.yellow,
        redCards: stats.cards?.red,
      };
    }),
  );
}

function mapApiFootballPosition(position?: string): Position {
  switch (position) {
    case "Goalkeeper":
    case "G":
      return "GK";
    case "Defender":
    case "D":
      return "DEF";
    case "Attacker":
    case "F":
      return "FWD";
    case "Midfielder":
    case "M":
    default:
      return "MID";
  }
}

function parseNumber(value: number | string | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (!value) {
    return undefined;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * API-Football exposes aggregate box-score fields, not pass-recipient event streams.
 * This provider therefore uses transparent weighted aggregates instead of PageRank.
 */
export class ApiFootballRatingProvider implements PlayerRatingProvider {
  constructor(private readonly loadStats: ApiFootballStatsLoader = defaultLoader) {}

  async getMatchRatings(matchId: string): Promise<PlayerRating[]> {
    const stats = await this.loadStats(matchId);
    return stats.map((playerStats) => this.ratePlayer(playerStats)).sort((a, b) => b.rating - a.rating);
  }

  ratePlayer(playerStats: PlayerMatchStats): PlayerRating {
    const passAccuracy = stat(playerStats, "passAccuracy") || stat(playerStats, "passCompletion");
    const totalPasses = stat(playerStats, "totalPasses") || stat(playerStats, "progressivePasses") * 4;
    const breakdown: RatingBreakdown = {
      attacking: stat(playerStats, "goals") * 0.9 + stat(playerStats, "shots") * 0.08 + stat(playerStats, "shotsOnTarget") * 0.16 + stat(playerStats, "expectedGoals") * 0.35,
      playmaking: stat(playerStats, "assists") * 0.7 + stat(playerStats, "keyPasses") * 0.16 + stat(playerStats, "expectedAssists") * 0.35,
      possession: Math.max(0, passAccuracy - 75) * 0.018 + Math.min(totalPasses, 100) * 0.006 + stat(playerStats, "progressivePasses") * 0.05,
      defensive: stat(playerStats, "tackles") * 0.12 + stat(playerStats, "interceptions") * 0.14 + stat(playerStats, "clearances") * 0.07,
      goalkeeping: playerStats.position === "GK" ? stat(playerStats, "saves") * 0.22 : 0,
      disciplinePenalty: -(stat(playerStats, "yellowCards") * 0.25 + stat(playerStats, "redCards") * 1.25 + stat(playerStats, "penaltiesConceded") * 0.6 + stat(playerStats, "errorsLeadingToShots") * 0.35 + stat(playerStats, "errorsLeadingToGoals") * 1),
      details: ["Aggregate API-Football-compatible scoring; no pass-recipient graph is available."],
    };
    const minutes = stat(playerStats, "minutesPlayed");
    const baseRating = 6 + (minutes >= 75 ? 0.2 : minutes > 0 && minutes < 30 ? -0.25 : 0);
    const rating = round(clamp(baseRating + Object.entries(breakdown).reduce((sum, [, value]) => sum + (typeof value === "number" ? value : 0), 0), 0, 10));

    return {
      playerId: playerStats.playerId,
      playerName: playerStats.playerName,
      teamId: playerStats.teamId,
      position: playerStats.position,
      rating,
      baseRating: round(baseRating),
      impacts: breakdownToImpacts(breakdown),
      breakdown,
    };
  }
}

export const apiFootballInternals = {
  mapApiFootballFixturePlayers,
  parseFixtureIdMap,
  parseTeamIdMap,
  resolveFixtureId,
  allowsSampleFallback,
};
