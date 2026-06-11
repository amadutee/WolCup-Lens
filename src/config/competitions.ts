export const WORLD_CUP_2026 = {
  // API-Football v3 endpoints use ID (V3). ID (V2) is legacy and should not be used for v3 endpoints.
  apiFootballLeagueId: 1,
  apiFootballV2LeagueId: 7902,
  season: 2026,
  name: "World Cup",
  country: "World",
  startDate: "2026-06-11",
  endDate: "2026-06-28",
} as const;

export const COMPETITIONS = {
  WORLD_CUP: WORLD_CUP_2026,
} as const;
