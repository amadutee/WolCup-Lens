import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiFootballRatingProvider } from "../src/providers/ApiFootballRatingProvider";
import { SampleRatingProvider } from "../src/providers/SampleRatingProvider";
import { StatsBombAdvancedRatingProvider, type StatsBombEvent } from "../src/providers/StatsBombAdvancedRatingProvider";
import { getRatingProvider } from "../src/config/ratingProvider";
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
  assert.ok(getRatingProvider("unknown") instanceof SampleRatingProvider);
});
