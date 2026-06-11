import { NextResponse } from "next/server";
import { WORLD_CUP_2026 } from "@/config/competitions";
import { getWorldCupFixtures } from "@/lib/apiFootball";

export const dynamic = "force-dynamic";

export async function GET() {
  const fixturesUrl = `/fixtures?league=${WORLD_CUP_2026.apiFootballLeagueId}&season=${WORLD_CUP_2026.season}`;
  const standingsUrl = `/standings?league=${WORLD_CUP_2026.apiFootballLeagueId}&season=${WORLD_CUP_2026.season}`;
  const roundsUrl = `/fixtures/rounds?league=${WORLD_CUP_2026.apiFootballLeagueId}&season=${WORLD_CUP_2026.season}`;

  try {
    const fixtures = (await getWorldCupFixtures()).response ?? [];

    return NextResponse.json({
      leagueId: WORLD_CUP_2026.apiFootballLeagueId,
      season: WORLD_CUP_2026.season,
      fixturesUrl,
      standingsUrl,
      roundsUrl,
      fixtureCount: fixtures.length,
      firstFixture: fixtures[0] ?? null,
      lastFixture: fixtures.at(-1) ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        leagueId: WORLD_CUP_2026.apiFootballLeagueId,
        season: WORLD_CUP_2026.season,
        fixturesUrl,
        standingsUrl,
        roundsUrl,
        fixtureCount: 0,
        firstFixture: null,
        lastFixture: null,
        error: error instanceof Error ? error.message : "Unable to load World Cup fixtures.",
      },
      { status: 500 },
    );
  }
}
