import { notFound } from "next/navigation";
import { RatingBadge } from "@/components/RatingBadge";
import { RatingExplanation } from "@/components/RatingExplanation";
import { StatComparison } from "@/components/StatComparison";
import { getTeam } from "@/data/mockData";
import { footballDataProvider } from "@/lib/footballApi";
import { calculateMatchRatings } from "@/lib/rating";

export async function generateStaticParams() {
  const matches = await footballDataProvider.getMatches();
  return matches.map((match) => ({ id: match.id }));
}

export default async function MatchDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await footballDataProvider.getMatch(id);

  if (!match) {
    notFound();
  }

  const home = getTeam(match.homeTeamId);
  const away = getTeam(match.awayTeamId);
  const ratings = calculateMatchRatings(match.playerStats);
  const featuredRating = ratings[0];

  return (
    <div className="space-y-8">
      <section className="glass-card rounded-[2rem] p-6 lg:p-8">
        <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-pitch-100">{match.stage}</p>
            <h1 className="mt-2 text-3xl font-black text-white md:text-5xl">{home.name} vs {away.name}</h1>
            <p className="mt-2 text-slate-400">{match.venue}, {match.city}</p>
          </div>
          <span className="rounded-full bg-red-500/15 px-4 py-2 text-sm font-black uppercase tracking-wide text-red-100 ring-1 ring-red-300/30">
            {match.status === "live" ? `${match.minute}' live` : match.status}
          </span>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-3xl bg-ink/50 p-5 text-center">
          <TeamScore flag={home.flag} name={home.name} score={match.homeScore} />
          <span className="text-3xl font-black text-slate-500">:</span>
          <TeamScore flag={away.flag} name={away.name} score={match.awayScore} />
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-8">
          <section className="glass-card rounded-3xl p-5">
            <h2 className="section-title mb-5">Timeline</h2>
            {match.timeline.length ? (
              <div className="space-y-4">
                {match.timeline.map((event) => (
                  <div key={`${event.minute}-${event.player}-${event.detail}`} className="flex gap-4 rounded-2xl border border-white/10 bg-ink/40 p-4">
                    <span className="w-14 font-black text-pitch-100">{event.minute}{event.stoppage ? `+${event.stoppage}` : ""}'</span>
                    <div>
                      <p className="font-bold text-white">{event.player} · {event.type}</p>
                      <p className="text-sm text-slate-400">{event.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-slate-400">Timeline events will appear once the match starts.</p>}
          </section>

          <section className="glass-card rounded-3xl p-5">
            <h2 className="section-title mb-5">Team stats</h2>
            <StatComparison homeStats={match.teamStats[home.id]} awayStats={match.teamStats[away.id]} />
          </section>

          <section className="glass-card rounded-3xl p-5">
            <h2 className="section-title mb-5">Lineups</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {[home, away].map((team) => {
                const lineup = match.lineups[team.id];
                return (
                  <div key={team.id} className="rounded-2xl border border-white/10 bg-ink/40 p-4">
                    <h3 className="mb-3 text-lg font-black text-white">{team.flag} {team.name} <span className="text-sm text-slate-400">{lineup?.formation}</span></h3>
                    {lineup ? lineup.starters.map((player) => (
                      <div key={player.playerId} className="flex items-center justify-between border-t border-white/10 py-2 text-sm">
                        <span className="text-slate-200">#{player.shirtNumber} {player.name}</span>
                        <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-300">{player.position}</span>
                      </div>
                    )) : <p className="text-sm text-slate-400">Lineup pending.</p>}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="space-y-8">
          {featuredRating && <RatingExplanation rating={featuredRating} />}
          <section className="glass-card rounded-3xl p-5">
            <h2 className="section-title mb-5">Player ratings</h2>
            <div className="space-y-3">
              {ratings.map((rating) => (
                <div key={rating.playerId} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-ink/40 p-3">
                  <RatingBadge rating={rating.rating} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-white">{rating.playerName}</p>
                    <p className="text-sm text-slate-400">{getTeam(rating.teamId).shortName} · {rating.position}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function TeamScore({ flag, name, score }: { flag: string; name: string; score: number | null }) {
  return (
    <div>
      <p className="text-4xl">{flag}</p>
      <p className="mt-2 text-sm font-bold uppercase tracking-wide text-slate-300">{name}</p>
      <p className="mt-2 text-5xl font-black text-white">{score ?? "–"}</p>
    </div>
  );
}
