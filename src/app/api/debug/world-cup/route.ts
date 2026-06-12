import { NextResponse } from "next/server";
import { getActiveCompetition } from "@/config/competitions";
import { getCompetitionFixtures } from "@/lib/apiFootball";

export const dynamic = "force-dynamic";

export async function GET() {
  const competition = getActiveCompetition();
  const fixturesUrl = `/fixtures?league=${competition.apiFootballLeagueId}&season=${competition.season}`;
  const standingsUrl = `/standings?league=${competition.apiFootballLeagueId}&season=${competition.season}`;
  const roundsUrl = `/fixtures/rounds?league=${competition.apiFootballLeagueId}&season=${competition.season}`;

  try {
    const fixtures = (await getCompetitionFixtures(competition)).response ?? [];

    return NextResponse.json({
      competition: competition.name,
      leagueId: competition.apiFootballLeagueId,
      season: competition.season,
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
        competition: competition.name,
        leagueId: competition.apiFootballLeagueId,
        season: competition.season,
        fixturesUrl,
        standingsUrl,
        roundsUrl,
        fixtureCount: 0,
        firstFixture: null,
        lastFixture: null,
        error: error instanceof Error ? error.message : "Unable to load competition fixtures.",
      },
      { status: 500 },
    );
  }
}
