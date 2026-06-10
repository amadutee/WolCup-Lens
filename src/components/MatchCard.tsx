import Link from "next/link";
import type { Match } from "@/lib/types";
import { getTeam } from "@/data/mockData";

const statusStyles = {
  live: "bg-red-500/15 text-red-200 ring-red-300/30",
  upcoming: "bg-blue-500/15 text-blue-200 ring-blue-300/30",
  recent: "bg-slate-500/15 text-slate-200 ring-slate-300/30",
};

export function MatchCard({ match }: { match: Match }) {
  const home = match.homeTeam ?? getTeam(match.homeTeamId);
  const away = match.awayTeam ?? getTeam(match.awayTeamId);
  const kickoff = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(match.kickoff));

  return (
    <Link href={`/matches/${match.id}`} className="glass-card group block rounded-3xl p-5 transition hover:-translate-y-1 hover:border-pitch-100/30">
      <div className="mb-5 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-pitch-100">{match.stage}</span>
        <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ring-1 ${statusStyles[match.status]}`}>
          {match.status === "live" ? `${match.minute}' live` : match.status}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <TeamBlock flag={home.flag} name={home.shortName} align="left" />
        <div className="rounded-2xl bg-ink/60 px-4 py-3 text-center">
          <p className="text-2xl font-black text-white">
            {match.homeScore ?? "–"} <span className="text-slate-500">:</span> {match.awayScore ?? "–"}
          </p>
        </div>
        <TeamBlock flag={away.flag} name={away.shortName} align="right" />
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-400">
        <span>{kickoff}</span>
        <span>{match.venue}, {match.city}</span>
      </div>
    </Link>
  );
}

function TeamBlock({ flag, name, align }: { flag: string; name: string; align: "left" | "right" }) {
  return (
    <div className={`flex items-center gap-3 ${align === "right" ? "justify-end text-right" : ""}`}>
      {align === "left" && <span className="text-3xl">{flag}</span>}
      <span className="text-xl font-black text-white">{name}</span>
      {align === "right" && <span className="text-3xl">{flag}</span>}
    </div>
  );
}
