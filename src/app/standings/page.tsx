import { getTeam } from "@/data/mockData";
import { groupStageStandings, type GroupStanding } from "@/data/tournamentData";
import { getWorldCupStandings } from "@/lib/worldCupFixtures";
import type { Team } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function StandingsPage() {
  const standings = await loadStandings();
  const groups = Object.entries(standings);

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur lg:p-10">
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-pitch-100">Standings</p>
        <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white md:text-5xl">World Cup 2026 group tables from API-Football.</h1>
        <p className="mt-4 max-w-2xl text-slate-300">
          Follow each group&apos;s points, goal difference, and recent form from the configured World Cup 2026 API feed. The highlighted qualification zone feeds directly into the knockout bracket path.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        {groups.map(([group, standings]) => (
          <GroupTable key={group} group={group} standings={standings} />
        ))}
      </div>
    </div>
  );
}

async function loadStandings() {
  try {
    const apiStandings = await getWorldCupStandings();
    return Object.keys(apiStandings).length > 0 ? apiStandings : groupStageStandings;
  } catch (error) {
    console.warn("[StandingsPage] Falling back to sample standings.", error);
    return groupStageStandings;
  }
}

function GroupTable({ group, standings }: { group: string; standings: GroupStanding[] }) {
  const sortedStandings = standings.slice().sort((a, b) => {
    const pointDiff = b.points - a.points;
    if (pointDiff !== 0) return pointDiff;

    const goalDiff = b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst);
    if (goalDiff !== 0) return goalDiff;

    return b.goalsFor - a.goalsFor;
  });

  return (
    <section className="glass-card overflow-hidden rounded-3xl">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.04] px-5 py-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-pitch-100">Group {group}</p>
          <h2 className="mt-1 text-2xl font-black text-white">Table</h2>
        </div>
        <span className="rounded-full bg-pitch-500/15 px-3 py-1 text-xs font-bold text-pitch-100 ring-1 ring-pitch-100/30">Top 2 advance</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr className="border-b border-white/10">
              <th className="px-5 py-3">Team</th>
              <th className="px-2 py-3 text-center">P</th>
              <th className="px-2 py-3 text-center">W</th>
              <th className="px-2 py-3 text-center">D</th>
              <th className="px-2 py-3 text-center">L</th>
              <th className="px-2 py-3 text-center">GD</th>
              <th className="px-2 py-3 text-center">Pts</th>
              <th className="px-5 py-3">Form</th>
            </tr>
          </thead>
          <tbody>
            {sortedStandings.map((standing, index) => (
              <StandingRow key={standing.teamId} standing={standing} rank={index + 1} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StandingRow({ standing, rank }: { standing: GroupStanding; rank: number }) {
  const team = resolveStandingTeam(standing);
  const goalDifference = standing.goalsFor - standing.goalsAgainst;
  const qualifies = rank <= 2;

  return (
    <tr className="border-b border-white/5 last:border-0">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-black ${qualifies ? "bg-pitch-500 text-ink" : "bg-white/10 text-slate-400"}`}>{rank}</span>
          <TeamMark team={team} />
          <div>
            <p className="font-bold text-white">{team.name}</p>
            <p className="text-xs text-slate-500">{team.fifaRank ? `FIFA rank #${team.fifaRank}` : team.shortName}</p>
          </div>
        </div>
      </td>
      <td className="px-2 py-4 text-center text-slate-300">{standing.played}</td>
      <td className="px-2 py-4 text-center text-slate-300">{standing.wins}</td>
      <td className="px-2 py-4 text-center text-slate-300">{standing.draws}</td>
      <td className="px-2 py-4 text-center text-slate-300">{standing.losses}</td>
      <td className="px-2 py-4 text-center font-bold text-white">{goalDifference > 0 ? `+${goalDifference}` : goalDifference}</td>
      <td className="px-2 py-4 text-center text-lg font-black text-pitch-100">{standing.points}</td>
      <td className="px-5 py-4">
        <div className="flex gap-1">
          {standing.form.length > 0 ? standing.form.map((result, index) => (
            <span key={`${standing.teamId}-${result}-${index}`} className={`grid h-6 w-6 place-items-center rounded-full text-xs font-black ${formStyle[result]}`}>{result}</span>
          )) : <span className="text-xs text-slate-500">No form</span>}
        </div>
      </td>
    </tr>
  );
}

function resolveStandingTeam(standing: GroupStanding): Team {
  if (standing.team) {
    return standing.team;
  }

  return getTeam(standing.teamId);
}

function TeamMark({ team }: { team: Team }) {
  if (team.logo) {
    return <span className="h-8 w-8 rounded-full bg-white/90 bg-contain bg-center bg-no-repeat p-1" style={{ backgroundImage: `url(${team.logo})` }} />;
  }

  return <span className="text-2xl">{team.flag}</span>;
}

const formStyle = {
  W: "bg-pitch-500 text-ink",
  D: "bg-amber-400/20 text-amber-200",
  L: "bg-red-500/20 text-red-200",
};
