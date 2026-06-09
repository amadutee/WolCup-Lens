import { getTeam } from "@/data/mockData";
import { bracketRounds, type BracketMatch, type BracketTeamSlot } from "@/data/tournamentData";

const statusLabel = {
  live: "Live now",
  recent: "Completed",
  upcoming: "Scheduled",
};

export default function BracketPage() {
  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur lg:p-10">
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-pitch-100">Bracket</p>
        <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white md:text-5xl">A visual knockout path from groups to the final.</h1>
        <p className="mt-4 max-w-2xl text-slate-300">
          Winners move from left to right through the knockout rounds. Open slots stay labeled by seed until group-stage and knockout results fill the path.
        </p>
      </section>

      <section className="glass-card overflow-hidden rounded-[2rem] p-5 lg:p-7">
        <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h2 className="section-title">Knockout road</h2>
            <p className="mt-1 text-slate-400">Quarter-finals, semi-finals, and final connected into one tournament flow.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wide">
            <span className="rounded-full bg-pitch-500/15 px-3 py-1 text-pitch-100 ring-1 ring-pitch-100/30">Winner highlighted</span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-slate-300 ring-1 ring-white/10">TBD slots seeded</span>
          </div>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="grid min-w-[64rem] gap-5 lg:grid-cols-3">
            {bracketRounds.map((round, roundIndex) => (
              <div key={round.name} className="relative">
                {roundIndex > 0 && <div className="absolute -left-5 top-1/2 hidden h-px w-5 bg-pitch-100/30 lg:block" />}
                <div className="mb-4 rounded-2xl border border-white/10 bg-ink/50 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-pitch-100">Round {roundIndex + 1}</p>
                  <h3 className="mt-1 text-xl font-black text-white">{round.name}</h3>
                </div>
                <div className={`grid gap-4 ${round.matches.length === 1 ? "lg:pt-40" : round.matches.length === 2 ? "lg:pt-20" : ""}`}>
                  {round.matches.map((match) => (
                    <BracketCard key={match.id} match={match} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function BracketCard({ match }: { match: BracketMatch }) {
  return (
    <article className="relative rounded-3xl border border-white/10 bg-ink/70 p-4 shadow-glow">
      <div className="mb-3 flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-wide">
        <span className="text-slate-400">{match.label}</span>
        <span className={statusPill[match.status]}>{statusLabel[match.status]}</span>
      </div>

      <div className="space-y-2">
        <TeamSlot slot={match.home} isWinner={match.winnerTeamId === match.home.teamId} />
        <TeamSlot slot={match.away} isWinner={match.winnerTeamId === match.away.teamId} />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-slate-400">
        <span>{match.date}</span>
        <span>{match.venue}</span>
      </div>
    </article>
  );
}

function TeamSlot({ slot, isWinner }: { slot: BracketTeamSlot; isWinner: boolean }) {
  const team = slot.teamId ? getTeam(slot.teamId) : undefined;

  return (
    <div className={`flex items-center gap-3 rounded-2xl border px-3 py-3 ${isWinner ? "border-pitch-100/40 bg-pitch-500/15" : "border-white/10 bg-white/[0.04]"}`}>
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 text-2xl">{team?.flag ?? "TBD"}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-black text-white">{team?.name ?? slot.seed}</p>
        <p className="truncate text-xs text-slate-400">{team ? slot.seed : "Awaiting qualifier"}</p>
      </div>
      <span className={`text-2xl font-black ${isWinner ? "text-pitch-100" : "text-white"}`}>{slot.score ?? "–"}</span>
    </div>
  );
}

const statusPill = {
  live: "rounded-full bg-red-500/15 px-2.5 py-1 text-red-200 ring-1 ring-red-300/30",
  recent: "rounded-full bg-slate-500/15 px-2.5 py-1 text-slate-200 ring-1 ring-slate-300/30",
  upcoming: "rounded-full bg-blue-500/15 px-2.5 py-1 text-blue-200 ring-1 ring-blue-300/30",
};
