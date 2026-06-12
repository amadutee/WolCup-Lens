export type CompetitionKey = keyof typeof COMPETITIONS;

export type CompetitionConfig = {
  apiFootballLeagueId: number;
  apiFootballV2LeagueId?: number;
  season: number;
  name: string;
  country: string;
  startDate: string;
  endDate: string;
  hasKnockoutBracket: boolean;
  standingsGroupLabel: string;
  standingsAdvancementLabel: string;
};

export const WORLD_CUP_2026 = {
  // API-Football v3 endpoints use ID (V3). ID (V2) is legacy and should not be used for v3 endpoints.
  apiFootballLeagueId: 1,
  apiFootballV2LeagueId: 7902,
  season: 2026,
  name: "World Cup",
  country: "World",
  startDate: "2026-06-11",
  endDate: "2026-06-28",
  hasKnockoutBracket: true,
  standingsGroupLabel: "Group",
  standingsAdvancementLabel: "Top 2 advance",
} as const satisfies CompetitionConfig;

export const PREMIER_LEAGUE_2024 = {
  apiFootballLeagueId: 39,
  season: 2024,
  name: "Premier League",
  country: "England",
  startDate: "2024-08-16",
  endDate: "2025-05-25",
  hasKnockoutBracket: false,
  standingsGroupLabel: "League",
  standingsAdvancementLabel: "League table",
} as const satisfies CompetitionConfig;

export const COMPETITIONS = {
  PREMIER_LEAGUE_2024,
  WORLD_CUP_2026,
} as const;

const DEFAULT_COMPETITION_KEY: CompetitionKey = "PREMIER_LEAGUE_2024";

export function getActiveCompetitionKey(): CompetitionKey {
  const configuredCompetition = process.env.API_FOOTBALL_COMPETITION ?? process.env.NEXT_PUBLIC_API_FOOTBALL_COMPETITION;
  return resolveCompetitionKey(configuredCompetition) ?? DEFAULT_COMPETITION_KEY;
}

export function getActiveCompetition(): CompetitionConfig {
  return COMPETITIONS[getActiveCompetitionKey()];
}

export function resolveCompetitionKey(value?: string): CompetitionKey | undefined {
  if (!value) {
    return undefined;
  }

  const normalisedValue = value.trim().toUpperCase().replace(/[-\s]+/g, "_");
  if (normalisedValue in COMPETITIONS) {
    return normalisedValue as CompetitionKey;
  }

  const alias = COMPETITION_ALIASES[normalisedValue];
  return alias;
}

const COMPETITION_ALIASES: Record<string, CompetitionKey> = {
  EPL_2024: "PREMIER_LEAGUE_2024",
  ENGLAND_PREMIER_LEAGUE_2024: "PREMIER_LEAGUE_2024",
  PREMIER_LEAGUE: "PREMIER_LEAGUE_2024",
  WORLD_CUP: "WORLD_CUP_2026",
  FIFA_WORLD_CUP_2026: "WORLD_CUP_2026",
};
