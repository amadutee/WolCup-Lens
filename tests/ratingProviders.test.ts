import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiFootballRatingProvider, apiFootballInternals } from "../src/providers/ApiFootballRatingProvider";
import { SampleRatingProvider } from "../src/providers/SampleRatingProvider";
import { StatsBombAdvancedRatingProvider, type StatsBombEvent } from "../src/providers/StatsBombAdvancedRatingProvider";
import { getRatingProvider } from "../src/config/ratingProvider";
import { footballApiInternals } from "../src/lib/footballApi";
import { getWorldCupFixtures, getWorldCupLiveFixtures } from "../src/lib/worldCupFixtures";
import type { PlayerMatchStats } from "../src/lib/types";

const basePlayer = (overrides: Partial<PlayerMatchStats> = {}): PlayerMatchStats => ({
  playerId: "p1",
  matchId: "m1",
  teamId: "t1",
  playerName: "Player One",
  position: "MID",
  minutesPlayed: 90,
  ...overrides,
});

test("ApiFootballRatingProvider goals increase score", async () => {
  const provider = new ApiFootballRatingProvider(async () => [basePlayer(), basePlayer({ playerId: "p2", playerName: "Scorer", goals: 1 })]);
  const ratings = await provider.getMatchRatings("m1");
  assert.ok(ratings.find((rating) => rating.playerId === "p2")!.rating > ratings.find((rating) => rating.playerId === "p1")!.rating);
});

test("ApiFootballRatingProvider assists and key passes increase playmaking", () => {
  const provider = new ApiFootballRatingProvider();
  const rating = provider.ratePlayer(basePlayer({ assists: 1, keyPasses: 3 }));
  assert.ok(rating.breakdown!.playmaking > 1);
});

test("ApiFootballRatingProvider defensive stats increase defender score", () => {
  const provider = new ApiFootballRatingProvider();
  const quiet = provider.ratePlayer(basePlayer({ position: "DEF" }));
  const defender = provider.ratePlayer(basePlayer({ position: "DEF", tackles: 4, interceptions: 3, clearances: 5 }));
  assert.ok(defender.rating > quiet.rating);
  assert.ok(defender.breakdown!.defensive > quiet.breakdown!.defensive);
});

test("ApiFootballRatingProvider cards reduce score", () => {
  const provider = new ApiFootballRatingProvider();
  const clean = provider.ratePlayer(basePlayer());
  const booked = provider.ratePlayer(basePlayer({ yellowCards: 1, redCards: 1 }));
  assert.ok(booked.rating < clean.rating);
  assert.ok(booked.breakdown!.disciplinePenalty < 0);
});

test("ApiFootballRatingProvider missing optional stats do not crash", () => {
  const provider = new ApiFootballRatingProvider();
  const rating = provider.ratePlayer(basePlayer({ minutesPlayed: undefined }));
  assert.equal(Number.isFinite(rating.rating), true);
});

test("ApiFootballRatingProvider maps fixture player API responses", () => {
  const stats = apiFootballInternals.mapApiFootballFixturePlayers(
    {
      response: [
        {
          team: { id: 50, name: "Team A" },
          players: [
            {
              player: { id: 99, name: "API Player" },
              statistics: [
                {
                  games: { minutes: 88, position: "Attacker" },
                  shots: { total: 4, on: 2 },
                  goals: { total: 1, assists: 1 },
                  passes: { total: 35, key: 3, accuracy: "86" },
                  tackles: { total: 2, interceptions: 1 },
                  cards: { yellow: 1, red: 0 },
                },
              ],
            },
          ],
        },
      ],
    },
    "fixture-99",
    {},
  );

  assert.deepEqual(stats, [
    {
      playerId: "99",
      matchId: "fixture-99",
      teamId: "50",
      playerName: "API Player",
      position: "FWD",
      minutesPlayed: 88,
      goals: 1,
      assists: 1,
      shots: 4,
      shotsOnTarget: 2,
      keyPasses: 3,
      passAccuracy: 86,
      totalPasses: 35,
      tackles: 2,
      interceptions: 1,
      saves: undefined,
      penaltiesWon: undefined,
      penaltiesConceded: undefined,
      yellowCards: 1,
      redCards: 0,
    },
  ]);
});


test("ApiFootballDataProvider maps API fixtures to numeric match ids and dynamic teams", () => {
  const match = footballApiInternals.mapApiFootballFixture({
    fixture: { id: 12345, date: "2026-07-01T20:00:00Z", venue: { name: "Test Stadium", city: "Test City" }, status: { short: "NS", long: "Not Started" } },
    league: { name: "World Cup", round: "Group Stage" },
    teams: { home: { id: 50, name: "Argentina" }, away: { id: 49, name: "France" } },
    goals: { home: null, away: null },
  });

  assert.equal(match.id, "12345");
  assert.equal(match.status, "upcoming");
  assert.equal(match.homeTeamId, "50");
  assert.equal(match.awayTeamId, "49");
  assert.equal(match.homeTeam?.shortName, "ARG");
  assert.equal(match.awayTeam?.shortName, "FRA");
});


test("getWorldCupFixtures calls API-Football with World Cup league and season", async () => {
  const originalApiKey = process.env.API_FOOTBALL_API_KEY;
  const originalBaseUrl = process.env.API_FOOTBALL_BASE_URL;
  process.env.API_FOOTBALL_API_KEY = "test-key";
  process.env.API_FOOTBALL_BASE_URL = "https://api.example.test";
  const fetchMock = mockApiFootballFixtureFetch([worldCupFixture(1001)]);

  try {
    const fixtures = await getWorldCupFixtures();
    const requestedUrl = new URL(fetchMock.requestedUrls[0]);

    assert.equal(requestedUrl.pathname, "/fixtures");
    assert.equal(requestedUrl.searchParams.get("league"), "1");
    assert.equal(requestedUrl.searchParams.get("season"), "2026");
    assert.equal(requestedUrl.searchParams.has("live"), false);
    assert.equal(fixtures.length, 1);
  } finally {
    fetchMock.restore();
    restoreEnv("API_FOOTBALL_API_KEY", originalApiKey);
    restoreEnv("API_FOOTBALL_BASE_URL", originalBaseUrl);
  }
});

test("getWorldCupLiveFixtures calls API-Football with World Cup league, season, and live=all", async () => {
  const originalApiKey = process.env.API_FOOTBALL_API_KEY;
  const originalBaseUrl = process.env.API_FOOTBALL_BASE_URL;
  process.env.API_FOOTBALL_API_KEY = "test-key";
  process.env.API_FOOTBALL_BASE_URL = "https://api.example.test";
  const fetchMock = mockApiFootballFixtureFetch([worldCupFixture(1002)]);

  try {
    const fixtures = await getWorldCupLiveFixtures();
    const requestedUrl = new URL(fetchMock.requestedUrls[0]);

    assert.equal(requestedUrl.pathname, "/fixtures");
    assert.equal(requestedUrl.searchParams.get("league"), "1");
    assert.equal(requestedUrl.searchParams.get("season"), "2026");
    assert.equal(requestedUrl.searchParams.get("live"), "all");
    assert.equal(fixtures.length, 1);
  } finally {
    fetchMock.restore();
    restoreEnv("API_FOOTBALL_API_KEY", originalApiKey);
    restoreEnv("API_FOOTBALL_BASE_URL", originalBaseUrl);
  }
});

test("World Cup fixture helper filters out non-World-Cup competitions", async () => {
  const originalApiKey = process.env.API_FOOTBALL_API_KEY;
  const originalBaseUrl = process.env.API_FOOTBALL_BASE_URL;
  process.env.API_FOOTBALL_API_KEY = "test-key";
  process.env.API_FOOTBALL_BASE_URL = "https://api.example.test";
  const canadianPremierLeagueId = 186;
  const fetchMock = mockApiFootballFixtureFetch([
    worldCupFixture(1003),
    canadianPremierLeagueFixture(2001, canadianPremierLeagueId),
    canadianPremierLeagueFixture(2002, 999),
  ]);

  try {
    const fixtures = await getWorldCupFixtures();

    assert.deepEqual(fixtures.map((fixture) => fixture.fixture?.id), [1003]);
    assert.ok(fixtures.every((fixture) => fixture.league?.id === 1));
    assert.ok(fixtures.every((fixture) => fixture.league?.id !== canadianPremierLeagueId));
  } finally {
    fetchMock.restore();
    restoreEnv("API_FOOTBALL_API_KEY", originalApiKey);
    restoreEnv("API_FOOTBALL_BASE_URL", originalBaseUrl);
  }
});

function worldCupFixture(fixtureId: number) {
  return {
    fixture: { id: fixtureId },
    league: { id: 1, name: "World Cup", season: 2026 },
    teams: { home: { id: 50, name: "Argentina" }, away: { id: 49, name: "France" } },
  };
}

function canadianPremierLeagueFixture(fixtureId: number, leagueId: number) {
  return {
    fixture: { id: fixtureId },
    league: { id: leagueId, name: "Canadian Premier League", season: 2026 },
    teams: { home: { id: 1, name: "Forge FC" }, away: { id: 2, name: "York United" } },
  };
}

test("football data provider selection uses sample matches when configured", () => {
  const originalServerProvider = process.env.RATING_PROVIDER;
  const originalPublicProvider = process.env.NEXT_PUBLIC_RATING_PROVIDER;

  delete process.env.RATING_PROVIDER;
  process.env.NEXT_PUBLIC_RATING_PROVIDER = "sample";

  try {
    assert.equal(footballApiInternals.shouldUseApiFootballDataProvider(), false);
    process.env.NEXT_PUBLIC_RATING_PROVIDER = "api-football";
    assert.equal(footballApiInternals.shouldUseApiFootballDataProvider(), true);
  } finally {
    restoreEnv("RATING_PROVIDER", originalServerProvider);
    restoreEnv("NEXT_PUBLIC_RATING_PROVIDER", originalPublicProvider);
  }
});

test("ApiFootballRatingProvider parses mock-to-fixture id maps", () => {
  assert.deepEqual(apiFootballInternals.parseFixtureIdMap("arg-fra-live:123, bra-eng-upcoming:456, bad:nope"), {
    "arg-fra-live": "123",
    "bra-eng-upcoming": "456",
  });
});

test("ApiFootballRatingProvider parses API-to-local team id maps", () => {
  assert.deepEqual(apiFootballInternals.parseTeamIdMap("50:arg, 49:fra"), {
    "50": "arg",
    "49": "fra",
  });
});

const pass = (playerId: number, playerName: string, recipientId: number, recipientName: string): StatsBombEvent => ({
  type: { name: "Pass" },
  player: { id: playerId, name: playerName },
  pass: { recipient: { id: recipientId, name: recipientName } },
  possession: 1,
});

test("StatsBombAdvancedRatingProvider completed passes create directed edges", () => {
  const provider = new StatsBombAdvancedRatingProvider();
  const network = provider.buildPassNetwork([pass(1, "A", 2, "B"), pass(1, "A", 2, "B"), pass(1, "A", 3, "C")]);
  assert.equal(network.edgeWeights.get("1->2"), 2 / 3);
  assert.equal(network.edgeWeights.get("1->3"), 1 / 3);
});

test("StatsBombAdvancedRatingProvider pass-recipient data affects PageRank influence", () => {
  const provider = new StatsBombAdvancedRatingProvider();
  const network = provider.buildPassNetwork([pass(1, "A", 2, "B"), pass(1, "A", 2, "B"), pass(3, "C", 2, "B")]);
  const ranks = provider.calculatePageRank(network);
  assert.ok(ranks.get("2")! > ranks.get("1")!);
});

test("StatsBombAdvancedRatingProvider goals and assists increase score", () => {
  const provider = new StatsBombAdvancedRatingProvider();
  const ratings = provider.rateData({
    events: [
      { type: { name: "Pass" }, player: { id: 1, name: "Creator" }, pass: { recipient: { id: 2, name: "Scorer" }, goal_assist: true }, possession: 1 },
      { type: { name: "Shot" }, player: { id: 2, name: "Scorer" }, shot: { statsbomb_xg: 0.6, outcome: { name: "Goal" } }, possession: 1 },
    ],
  });
  assert.ok(ratings.find((rating) => rating.playerId === "2")!.breakdown!.attacking > 0);
  assert.ok(ratings.find((rating) => rating.playerId === "1")!.breakdown!.playmaking > 0);
});

test("StatsBombAdvancedRatingProvider defensive actions increase score", () => {
  const provider = new StatsBombAdvancedRatingProvider();
  const ratings = provider.rateData({ events: [{ type: { name: "Pressure" }, player: { id: 1, name: "Presser" } }, { type: { name: "Ball Recovery" }, player: { id: 1, name: "Presser" } }] });
  assert.ok(ratings[0].breakdown!.defensive > 0);
});

test("StatsBombAdvancedRatingProvider players with no pass network still receive a valid score", () => {
  const provider = new StatsBombAdvancedRatingProvider();
  const ratings = provider.rateData({ players: [basePlayer({ playerId: "solo", playerName: "Solo" })], events: [] });
  assert.equal(Number.isFinite(ratings[0].rating), true);
});

test("StatsBombAdvancedRatingProvider malformed incomplete events are safely ignored", () => {
  const provider = new StatsBombAdvancedRatingProvider();
  const ratings = provider.rateData({ events: [{ type: { name: "Pass" } }, { player: { name: "No Id" } }] });
  assert.deepEqual(ratings, []);
});

test("rating provider factory selects configured providers", () => {
  assert.ok(getRatingProvider("sample") instanceof SampleRatingProvider);
  assert.ok(getRatingProvider("api-football") instanceof ApiFootballRatingProvider);
  assert.ok(getRatingProvider("statsbomb-advanced") instanceof StatsBombAdvancedRatingProvider);
  assert.ok(getRatingProvider(" API-FOOTBALL ") instanceof ApiFootballRatingProvider);
  assert.ok(getRatingProvider("unknown") instanceof SampleRatingProvider);
});

test("rating provider factory prefers server-only deployment provider", () => {
  const originalServerProvider = process.env.RATING_PROVIDER;
  const originalPublicProvider = process.env.NEXT_PUBLIC_RATING_PROVIDER;

  process.env.RATING_PROVIDER = "api-football";
  process.env.NEXT_PUBLIC_RATING_PROVIDER = "sample";

  try {
    assert.ok(getRatingProvider() instanceof ApiFootballRatingProvider);
  } finally {
    restoreEnv("RATING_PROVIDER", originalServerProvider);
    restoreEnv("NEXT_PUBLIC_RATING_PROVIDER", originalPublicProvider);
  }
});

test("ApiFootballRatingProvider disables sample fallback in production by default", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalFallback = process.env.API_FOOTBALL_ALLOW_SAMPLE_FALLBACK;

  (process.env as Record<string, string | undefined>)["NODE_ENV"] = "production";
  delete process.env.API_FOOTBALL_ALLOW_SAMPLE_FALLBACK;

  try {
    assert.equal(apiFootballInternals.allowsSampleFallback(), false);
  } finally {
    restoreEnv("NODE_ENV", originalNodeEnv);
    restoreEnv("API_FOOTBALL_ALLOW_SAMPLE_FALLBACK", originalFallback);
  }
});

function mockApiFootballFixtureFetch(responseFixtures: unknown[]) {
  const originalFetch = globalThis.fetch;
  const requestedUrls: string[] = [];

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    requestedUrls.push(String(input));
    return new Response(JSON.stringify({ response: responseFixtures }), { status: 200 });
  }) as typeof fetch;

  return {
    requestedUrls,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
