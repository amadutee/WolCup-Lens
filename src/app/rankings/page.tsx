import { RatingBadge } from "@/components/RatingBadge";
import { getTeam } from "@/data/mockData";
import { footballDataProvider } from "@/lib/footballApi";
import { getRatingProvider } from "@/config/ratingProvider";
import type { PlayerRating, Position } from "@/lib/types";

export default async function RankingsPage() {
  const matches = await footballDataProvider.getMatches();
  const ratingProvider = getRatingProvider();
  const ratingsByMatch = await Promise.all(matches.map((match) => ratingProvider.getMatchRatings(match.id)));
  const allRatings = ratingsByMatch.flat();
  const teamRankings = buildTeamRankings(allRatings);
  const positionRankings = buildPositionRankings(allRatings);

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur lg:p-10">
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-pitch-100">Rankings</p>
        <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">Top players, teams, and roles at a glance.</h1>
        <p className="mt-4 max-w-2xl text-slate-300">Rankings are calculated through the configured rating provider while keeping the same tournament view.</p>
      </section>

      <div className="grid gap-8 xl:grid-cols-3">
        <RankingPanel title="Top players">
          {allRatings.slice().sort((a, b) => b.rating - a.rating).map((rating, index) => (
            <RankingRow key={`${rating.playerId}-${index}`} index={index + 1} label={rating.playerName} meta={`${getTeam(rating.teamId).shortName} · ${rating.position}`} rating={rating.rating} />
          ))}
        </RankingPanel>

        <RankingPanel title="Top teams">
          {teamRankings.map((team, index) => (
            <RankingRow key={team.teamId} index={index + 1} label={`${getTeam(team.teamId).flag} ${getTeam(team.teamId).name}`} meta={`${team.players} rated players`} rating={team.rating} />
          ))}
        </RankingPanel>

        <RankingPanel title="Top positions">
          {positionRankings.map((position, index) => (
            <RankingRow key={position.position} index={index + 1} label={position.position} meta={`${position.players} rated players`} rating={position.rating} />
          ))}
        </RankingPanel>
      </div>
    </div>
  );
}

function RankingPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass-card rounded-3xl p-5">
      <h2 className="section-title mb-5">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function RankingRow({ index, label, meta, rating }: { index: number; label: string; meta: string; rating: number }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-ink/40 p-3">
      <span className="w-7 text-center text-sm font-black text-slate-500">{index}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-white">{label}</p>
        <p className="text-sm text-slate-400">{meta}</p>
      </div>
      <RatingBadge rating={rating} size="sm" />
    </div>
  );
}

function buildTeamRankings(ratings: PlayerRating[]) {
  return Object.values(
    ratings.reduce<Record<string, { teamId: string; total: number; players: number }>>((acc, rating) => {
      acc[rating.teamId] ??= { teamId: rating.teamId, total: 0, players: 0 };
      acc[rating.teamId].total += rating.rating;
      acc[rating.teamId].players += 1;
      return acc;
    }, {}),
  )
    .map((team) => ({ ...team, rating: Math.round((team.total / team.players) * 10) / 10 }))
    .sort((a, b) => b.rating - a.rating);
}

function buildPositionRankings(ratings: PlayerRating[]) {
  return Object.values(
    ratings.reduce<Record<Position, { position: Position; total: number; players: number }>>((acc, rating) => {
      acc[rating.position] ??= { position: rating.position, total: 0, players: 0 };
      acc[rating.position].total += rating.rating;
      acc[rating.position].players += 1;
      return acc;
    }, {} as Record<Position, { position: Position; total: number; players: number }>),
  )
    .map((position) => ({ ...position, rating: Math.round((position.total / position.players) * 10) / 10 }))
    .sort((a, b) => b.rating - a.rating);
}
