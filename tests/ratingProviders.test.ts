import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiFootballRatingProvider, apiFootballInternals } from "../src/providers/ApiFootballRatingProvider";
import { SampleRatingProvider } from "../src/providers/SampleRatingProvider";
import { StatsBombAdvancedRatingProvider, type StatsBombEvent } from "../src/providers/StatsBombAdvancedRatingProvider";
import { getRatingProvider } from "../src/config/ratingProvider";
import { getActiveCompetition, PREMIER_LEAGUE_2024, WORLD_CUP_2026 } from "../src/config/competitions";
import { isSampleMode } from "../src/config/providerMode";
import { ApiFootballDataProvider, MockFootballDataProvider, footballApiInternals } from "../src/lib/footballApi";
import { getWorldCupFixtures as getRawWorldCupFixtures, getWorldCupFixturesByRound, getWorldCupLiveFixtures, getWorldCupRounds, getWorldCupStandings as getRawWorldCupStandings } from "../src/lib/apiFootball";
import { getWorldCupBracketRounds, getWorldCupFixtures, getWorldCupStandings, isKnockoutRound, splitFixturesByStatus, worldCupFixturesInternals } from "../src/lib/worldCupFixtures";
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


test("competition config includes World Cup and Premier League API-Football metadata", () => {
  assert.equal(WORLD_CUP_2026.apiFootballLeagueId, 1);
  assert.equal(WORLD_CUP_2026.apiFootballV2LeagueId, 7902);
  assert.equal(WORLD_CUP_2026.season, 2026);
  assert.equal(WORLD_CUP_2026.name, "World Cup");
  assert.equal(PREMIER_LEAGUE_2024.apiFootballLeagueId, 39);
  assert.equal(PREMIER_LEAGUE_2024.season, 2024);
  assert.equal(PREMIER_LEAGUE_2024.name, "Premier League");
});

test("active competition defaults to England Premier League 2024 and accepts aliases", () => {
  const originalCompetition = process.env.API_FOOTBALL_COMPETITION;
  const originalPublicCompetition = process.env.NEXT_PUBLIC_API_FOOTBALL_COMPETITION;
  delete process.env.API_FOOTBALL_COMPETITION;
  delete process.env.NEXT_PUBLIC_API_FOOTBALL_COMPETITION;

  try {
    assert.equal(getActiveCompetition().name, "Premier League");
    process.env.API_FOOTBALL_COMPETITION = "world-cup";
    assert.equal(getActiveCompetition().name, "World Cup");
  } finally {
    restoreEnv("API_FOOTBALL_COMPETITION", originalCompetition);
    restoreEnv("NEXT_PUBLIC_API_FOOTBALL_COMPETITION", originalPublicCompetition);
  }
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
    assert.notEqual(requestedUrl.searchParams.get("league"), "7902");
    assert.equal(requestedUrl.searchParams.get("season"), "2026");
    assert.equal(requestedUrl.searchParams.has("live"), false);
    assert.equal(fixtures.length, 1);
  } finally {
    fetchMock.restore();
    restoreEnv("API_FOOTBALL_API_KEY", originalApiKey);
    restoreEnv("API_FOOTBALL_BASE_URL", originalBaseUrl);
  }
});

test("raw API helpers include league and season for all World Cup endpoints", async () => {
  const originalApiKey = process.env.API_FOOTBALL_API_KEY;
  const originalBaseUrl = process.env.API_FOOTBALL_BASE_URL;
  process.env.API_FOOTBALL_API_KEY = "test-key";
  process.env.API_FOOTBALL_BASE_URL = "https://api.example.test";
  const fetchMock = mockApiFootballFetch(() => ({ response: [] }));

  try {
    await getRawWorldCupFixtures();
    await getRawWorldCupStandings();
    await getWorldCupRounds();
    await getWorldCupFixturesByRound("Round of 16");
    await getWorldCupLiveFixtures();

    const urls = fetchMock.requestedUrls.map((url) => new URL(url));
    assert.deepEqual(urls.map((url) => url.pathname), ["/fixtures", "/standings", "/fixtures/rounds", "/fixtures", "/fixtures"]);
    assert.ok(urls.every((url) => url.searchParams.get("league") === "1"));
    assert.ok(urls.every((url) => url.searchParams.get("league") !== "7902"));
    assert.ok(urls.every((url) => url.searchParams.get("season") === "2026"));
    assert.equal(urls[3].searchParams.get("round"), "Round of 16");
    assert.equal(urls[4].searchParams.get("live"), "all");
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
    { ...worldCupFixture(1005), league: { id: 1, name: "Club Friendly", season: 2026 } },
    canadianPremierLeagueFixture(2001, canadianPremierLeagueId),
    canadianPremierLeagueFixture(2002, 999),
  ]);

  try {
    const fixtures = await getWorldCupFixtures();

    assert.deepEqual(fixtures.map((fixture) => fixture.fixture?.id), [1003]);
    assert.ok(fixtures.every((fixture) => fixture.league?.id === 1));
    assert.ok(fixtures.every((fixture) => fixture.league?.name?.toLowerCase().includes("world cup")));
    assert.ok(fixtures.every((fixture) => fixture.league?.id !== canadianPremierLeagueId));
  } finally {
    fetchMock.restore();
    restoreEnv("API_FOOTBALL_API_KEY", originalApiKey);
    restoreEnv("API_FOOTBALL_BASE_URL", originalBaseUrl);
  }
});

test("fixture status splitting includes upcoming, live, and completed fixtures", () => {
  const split = splitFixturesByStatus([
    worldCupFixture(1010, "NS"),
    worldCupFixture(1011, "TBD"),
    worldCupFixture(1012, "1H"),
    worldCupFixture(1013, "HT"),
    worldCupFixture(1014, "FT"),
    worldCupFixture(1015, "AET"),
    worldCupFixture(1016, "PEN"),
  ]);

  assert.deepEqual(split.upcoming.map((fixture) => fixture.fixture?.id), [1010, 1011]);
  assert.deepEqual(split.live.map((fixture) => fixture.fixture?.id), [1012, 1013]);
  assert.deepEqual(split.completed.map((fixture) => fixture.fixture?.id), [1014, 1015, 1016]);
});

test("standings map API-Football response into UI shape", () => {
  const standings = worldCupFixturesInternals.mapApiFootballStandings([
    {
      league: {
        id: 1,
        season: 2026,
        standings: [[
          {
            rank: 1,
            team: { id: 50, name: "Argentina", logo: "arg.png" },
            points: 7,
            goalsDiff: 4,
            group: "Group A",
            form: "WDW",
            all: { played: 3, win: 2, draw: 1, lose: 0, goals: { for: 5, against: 1 } },
          },
        ]],
      },
    },
  ], WORLD_CUP_2026);

  assert.equal(standings.A[0].teamId, "50");
  assert.equal(standings.A[0].team?.name, "Argentina");
  assert.equal(standings.A[0].team?.logo, "arg.png");
  assert.equal(standings.A[0].played, 3);
  assert.equal(standings.A[0].wins, 2);
  assert.equal(standings.A[0].draws, 1);
  assert.equal(standings.A[0].losses, 0);
  assert.equal(standings.A[0].goalsFor, 5);
  assert.equal(standings.A[0].goalsAgainst, 1);
  assert.equal(standings.A[0].points, 7);
  assert.deepEqual(standings.A[0].form, ["W", "D", "W"]);
});

test("World Cup standings helper calls standings endpoint and does not return sample standings on empty API data", async () => {
  const originalApiKey = process.env.API_FOOTBALL_API_KEY;
  const originalBaseUrl = process.env.API_FOOTBALL_BASE_URL;
  process.env.API_FOOTBALL_API_KEY = "test-key";
  process.env.API_FOOTBALL_BASE_URL = "https://api.example.test";
  const fetchMock = mockApiFootballFetch(() => ({ response: [] }));

  try {
    const standings = await getWorldCupStandings();
    const requestedUrl = new URL(fetchMock.requestedUrls[0]);

    assert.equal(requestedUrl.pathname, "/standings");
    assert.equal(requestedUrl.searchParams.get("league"), "1");
    assert.notEqual(requestedUrl.searchParams.get("league"), "7902");
    assert.equal(requestedUrl.searchParams.get("season"), "2026");
    assert.deepEqual(standings, {});
  } finally {
    fetchMock.restore();
    restoreEnv("API_FOOTBALL_API_KEY", originalApiKey);
    restoreEnv("API_FOOTBALL_BASE_URL", originalBaseUrl);
  }
});

test("bracket helper fetches rounds, excludes group stage, and fetches fixtures by knockout round", async () => {
  const originalApiKey = process.env.API_FOOTBALL_API_KEY;
  const originalBaseUrl = process.env.API_FOOTBALL_BASE_URL;
  process.env.API_FOOTBALL_API_KEY = "test-key";
  process.env.API_FOOTBALL_BASE_URL = "https://api.example.test";
  const fetchMock = mockApiFootballFetch((url) => {
    if (url.pathname === "/fixtures/rounds") {
      return { response: ["Group Stage - 1", "Round of 16", "Quarter-finals"] };
    }

    return { response: [worldCupFixture(Number(url.searchParams.get("round") === "Round of 16" ? 3001 : 3002), "NS")] };
  });

  try {
    const rounds = await getWorldCupBracketRounds();
    const urls = fetchMock.requestedUrls.map((url) => new URL(url));

    assert.deepEqual(rounds.map((round) => round.name), ["Round of 16", "Quarter-finals"]);
    assert.equal(urls[0].pathname, "/fixtures/rounds");
    assert.ok(urls.slice(1).every((url) => url.pathname === "/fixtures"));
    assert.ok(urls.every((url) => url.searchParams.get("league") === "1"));
    assert.ok(urls.every((url) => url.searchParams.get("league") !== "7902"));
    assert.ok(urls.every((url) => url.searchParams.get("season") === "2026"));
    assert.deepEqual(urls.slice(1).map((url) => url.searchParams.get("round")), ["Round of 16", "Quarter-finals"]);
  } finally {
    fetchMock.restore();
    restoreEnv("API_FOOTBALL_API_KEY", originalApiKey);
    restoreEnv("API_FOOTBALL_BASE_URL", originalBaseUrl);
  }
});

test("bracket mapping excludes group rounds and handles unknown future teams", () => {
  assert.equal(isKnockoutRound("Group Stage - 1"), false);
  assert.equal(isKnockoutRound("Round of 32"), true);

  const rounds = worldCupFixturesInternals.buildBracketRoundsFromFixtures([
    { ...worldCupFixture(4001, "NS"), league: { id: 1, season: 2026, round: "Group Stage - 1" } },
    { ...worldCupFixture(4002, "NS"), league: { id: 1, season: 2026, round: "Round of 32" }, teams: {} },
  ]);

  assert.equal(rounds.length, 1);
  assert.equal(rounds[0].name, "Round of 32");
  assert.equal(rounds[0].matches[0].home.team, undefined);
  assert.equal(rounds[0].matches[0].home.seed, "Home seed");
});

function worldCupFixture(fixtureId: number, status = "NS") {
  return {
    fixture: { id: fixtureId, date: `2026-06-${String(fixtureId).slice(-2).padStart(2, "0")}T20:00:00Z`, status: { short: status } },
    league: { id: 1, name: "World Cup", season: 2026 },
    teams: { home: { id: 50, name: "Argentina" }, away: { id: 49, name: "France" } },
  };
}

function canadianPremierLeagueFixture(fixtureId: number, leagueId: number) {
  return {
    fixture: { id: fixtureId, date: "2026-06-01T20:00:00Z", status: { short: "NS" } },
    league: { id: leagueId, name: "Canadian Premier League", season: 2026 },
    teams: { home: { id: 1, name: "Forge FC" }, away: { id: 2, name: "York United" } },
  };
}

test("sample data provider returns sample matches and API provider returns API fixtures", async () => {
  const sampleMatches = await new MockFootballDataProvider().getMatches();
  assert.ok(sampleMatches.length > 0);

  const originalApiKey = process.env.API_FOOTBALL_API_KEY;
  const originalBaseUrl = process.env.API_FOOTBALL_BASE_URL;
  const originalCompetition = process.env.API_FOOTBALL_COMPETITION;
  process.env.API_FOOTBALL_API_KEY = "test-key";
  process.env.API_FOOTBALL_BASE_URL = "https://api.example.test";
  process.env.API_FOOTBALL_COMPETITION = "WORLD_CUP_2026";
  const fetchMock = mockApiFootballFixtureFetch([worldCupFixture(5555, "FT")]);

  try {
    const apiMatches = await new ApiFootballDataProvider().getMatches();
    assert.deepEqual(apiMatches.map((match) => match.id), ["5555"]);
    assert.ok(!sampleMatches.some((match) => match.id === "5555"));
  } finally {
    fetchMock.restore();
    restoreEnv("API_FOOTBALL_API_KEY", originalApiKey);
    restoreEnv("API_FOOTBALL_BASE_URL", originalBaseUrl);
    restoreEnv("API_FOOTBALL_COMPETITION", originalCompetition);
  }
});

test("football data provider selection uses sample matches when configured", () => {
  const originalServerProvider = process.env.RATING_PROVIDER;
  const originalPublicProvider = process.env.NEXT_PUBLIC_RATING_PROVIDER;

  delete process.env.RATING_PROVIDER;
  process.env.NEXT_PUBLIC_RATING_PROVIDER = "sample";

  try {
    assert.equal(isSampleMode(), true);
    assert.equal(footballApiInternals.shouldUseApiFootballDataProvider(), false);
    process.env.NEXT_PUBLIC_RATING_PROVIDER = "api-football";
    assert.equal(isSampleMode(), false);
    assert.equal(footballApiInternals.shouldUseApiFootballDataProvider(), true);
    process.env.NEXT_PUBLIC_RATING_PROVIDER = "statsbomb-advanced";
    assert.equal(isSampleMode(), false);
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

function mockApiFootballFetch(handler: (url: URL) => unknown) {
  const originalFetch = globalThis.fetch;
  const requestedUrls: string[] = [];

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    requestedUrls.push(String(input));
    return new Response(JSON.stringify(handler(url)), { status: 200 });
  }) as typeof fetch;

  return {
    requestedUrls,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

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
