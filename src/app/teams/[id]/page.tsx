import Image from "next/image";
import { notFound } from "next/navigation";
import { MatchCard } from "@/components/MatchCard";
import { getActiveCompetition } from "@/config/competitions";
import { footballDataProvider } from "@/lib/footballApi";
import type { Match, Team } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TeamOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [teamMatches, teams] = await Promise.all([
    footballDataProvider.getTeamMatches(id),
    footballDataProvider.getTeams(),
  ]);

  const team = findTeam(id, teamMatches, teams);
  if (!team) {
    notFound();
  }

  const competition = getActiveCompetition();
  const completed = teamMatches.filter((match) => match.status === "recent");
  const live = teamMatches.filter((match) => match.status === "live");
  const upcoming = teamMatches.filter((match) => match.status === "upcoming");

  return (
    <div className="space-y-8">
      <section className="glass-card rounded-[2rem] p-6 lg:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="flex items-center gap-5">
            <TeamMark team={team} />
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-pitch-100">Team overview</p>
              <h1 className="mt-2 text-4xl font-black text-white md:text-6xl">{team.name}</h1>
              <p className="mt-2 max-w-2xl text-slate-300">
                All {competition.name} fixtures for the {competition.season} season that feature {team.name}.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center sm:min-w-96">
            <SummaryStat label="Fixtures" value={teamMatches.length} />
            <SummaryStat label="Live" value={live.length} />
            <SummaryStat label="Completed" value={completed.length} />
          </div>
        </div>
      </section>

      <FixtureSection title="Live fixtures" description="Matches currently in progress." matches={live} />
      <FixtureSection title="Upcoming fixtures" description="Remaining fixtures in the selected season." matches={upcoming} />
      <FixtureSection title="Completed fixtures" description="Final results from the selected season." matches={completed} />
    </div>
  );
}

function findTeam(teamId: string, matches: Match[], teams: Team[]) {
  return (
    teams.find((team) => team.id === teamId) ??
    matches.find((match) => match.homeTeamId === teamId)?.homeTeam ??
    matches.find((match) => match.awayTeamId === teamId)?.awayTeam
  );
}

function TeamMark({ team }: { team: Team }) {
  if (team.logo) {
    return (
      <Image
        src={team.logo}
        alt={`${team.name} logo`}
        width={80}
        height={80}
        className="h-20 w-20 rounded-3xl bg-white object-contain p-3 shadow-xl"
      />
    );
  }

  return <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-5xl shadow-xl">{team.flag}</span>;
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-ink/50 p-4">
      <p className="text-3xl font-black text-pitch-100">{value}</p>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

function FixtureSection({ title, description, matches }: { title: string; description: string; matches: Match[] }) {
  return (
    <section>
      <div className="mb-4 flex flex-col justify-between gap-2 md:flex-row md:items-end">
        <div>
          <h2 className="section-title">{title}</h2>
          <p className="mt-1 text-slate-400">{description}</p>
        </div>
        <span className="text-sm font-semibold text-pitch-100">{matches.length} matches</span>
      </div>
      {matches.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {matches.map((match) => <MatchCard key={match.id} match={match} />)}
        </div>
      ) : (
        <div className="glass-card rounded-3xl p-5 text-sm text-slate-400">No {title.toLowerCase()} available for this team.</div>
      )}
    </section>
  );
}
