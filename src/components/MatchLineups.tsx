"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { LineupPlayer, PlayerRating, Team, TeamLineup } from "@/lib/types";
import { RatingBadge } from "./RatingBadge";
import { RatingExplanation } from "./RatingExplanation";

type MatchLineupsProps = {
  home: Team;
  away: Team;
  lineups: Record<string, TeamLineup>;
  ratings: PlayerRating[];
};

type PlayerCardProps = {
  player: LineupPlayer;
  rating?: PlayerRating;
  isSelected: boolean;
  onSelect: () => void;
};

export function MatchLineups({ home, away, lineups, ratings }: MatchLineupsProps) {
  const ratingsByPlayer = useMemo(() => new Map(ratings.map((rating) => [rating.playerId, rating])), [ratings]);
  const firstRatedStarter = [lineups[home.id], lineups[away.id]]
    .flatMap((lineup) => lineup?.starters ?? [])
    .map((player) => ratingsByPlayer.get(player.playerId))
    .find(Boolean);
  const [selectedPlayerId, setSelectedPlayerId] = useState(firstRatedStarter?.playerId ?? ratings[0]?.playerId ?? "");
  const selectedRating = ratingsByPlayer.get(selectedPlayerId) ?? firstRatedStarter ?? ratings[0];

  return (
    <section className="glass-card rounded-3xl p-5">
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-pitch-100/80">Tactical view</p>
          <h2 className="section-title">Lineups</h2>
        </div>
        <p className="max-w-xl text-sm text-slate-400">Tap a player to open the pass-rank rating breakdown on the right.</p>
      </div>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_25rem]">
        <div className="grid gap-5 xl:grid-cols-2">
          {[home, away].map((team, index) => (
            <TeamPitch
              key={team.id}
              team={team}
              lineup={lineups[team.id]}
              ratingsByPlayer={ratingsByPlayer}
              selectedPlayerId={selectedPlayerId}
              onSelect={setSelectedPlayerId}
              reverse={index === 1}
            />
          ))}
        </div>

        <aside className="2xl:sticky 2xl:top-6 2xl:self-start">
          {selectedRating ? (
            <RatingExplanation rating={selectedRating} />
          ) : (
            <div className="rounded-3xl border border-white/10 bg-ink/40 p-5 text-sm text-slate-400">
              Rating explanations will appear here once player data is available.
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function TeamPitch({
  team,
  lineup,
  ratingsByPlayer,
  selectedPlayerId,
  onSelect,
  reverse,
}: {
  team: Team;
  lineup?: TeamLineup;
  ratingsByPlayer: Map<string, PlayerRating>;
  selectedPlayerId: string;
  onSelect: (playerId: string) => void;
  reverse: boolean;
}) {
  if (!lineup) {
    return (
      <div className="rounded-[2rem] border border-white/10 bg-ink/40 p-5">
        <h3 className="text-lg font-black text-white">{team.flag} {team.name}</h3>
        <p className="mt-4 text-sm text-slate-400">Lineup pending.</p>
      </div>
    );
  }

  const rows = buildFormationRows(lineup).filter((row) => row.players.length > 0);
  const orderedRows = reverse ? [...rows].reverse() : rows;

  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-emerald-950/50">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-ink/70 p-4">
        <h3 className="text-lg font-black text-white">{team.flag} {team.name}</h3>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-pitch-100">{lineup.formation}</span>
      </div>
      <div className="relative min-h-[38rem] overflow-hidden bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.16)_0_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[length:24px_24px,100%_100%,100%_50%] p-4">
        <div className="pointer-events-none absolute inset-4 rounded-[1.5rem] border-2 border-white/20" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/20" />
        <div className="relative z-10 flex h-full min-h-[35rem] flex-col justify-between gap-4 py-3">
          {orderedRows.map((row, rowIndex) => (
            <div key={`${row.label}-${rowIndex}`} className="flex justify-center gap-2 sm:gap-3">
              {row.players.map((player) => (
                <PlayerCard
                  key={player.playerId}
                  player={player}
                  rating={ratingsByPlayer.get(player.playerId)}
                  isSelected={selectedPlayerId === player.playerId}
                  onSelect={() => onSelect(player.playerId)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlayerCard({ player, rating, isSelected, onSelect }: PlayerCardProps) {
  const topImpact = rating?.impacts.find((impact) => impact.direction === "positive") ?? rating?.impacts[0];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group flex w-[5.6rem] flex-col items-center rounded-2xl border p-2 text-center shadow-lg transition hover:-translate-y-1 hover:bg-ink/80 focus:outline-none focus:ring-2 focus:ring-pitch-100 sm:w-28 ${isSelected ? "border-pitch-100 bg-ink/90 ring-2 ring-pitch-100/50" : "border-white/15 bg-ink/60"}`}
      aria-label={`Open rating explanation for ${player.name}`}
    >
      <span className="relative">
        <Image className="h-14 w-14 rounded-full border-2 border-white/40 object-cover" src={portraitDataUri(player.name, player.playerId)} alt={`${player.name} headshot`} width={56} height={56} unoptimized />
        <span className="absolute -left-1 -top-1 rounded-full bg-white px-1.5 py-0.5 text-[0.65rem] font-black text-ink">{player.shirtNumber}</span>
      </span>
      <span className="mt-2 line-clamp-2 min-h-8 text-[0.72rem] font-black leading-tight text-white">{shortName(player.name)}</span>
      <span className="mt-1 rounded-full bg-white/10 px-2 py-0.5 text-[0.6rem] font-bold text-slate-300">{player.position}</span>
      {rating ? (
        <>
          <span className="mt-2"><RatingBadge rating={rating.rating} size="sm" /></span>
          <span className="mt-2 line-clamp-2 text-[0.65rem] leading-tight text-slate-300">{topImpact ? `${topImpact.label}: ${topImpact.impact > 0 ? "+" : ""}${topImpact.impact.toFixed(1)}` : "Pass rank ready"}</span>
        </>
      ) : (
        <span className="mt-2 rounded-full bg-slate-700 px-2 py-1 text-[0.65rem] font-bold text-slate-300">Pending</span>
      )}
    </button>
  );
}

function buildFormationRows(lineup: TeamLineup) {
  return [
    { label: "FWD", players: lineup.starters.filter((player) => player.position === "FWD") },
    { label: "MID", players: lineup.starters.filter((player) => player.position === "MID") },
    { label: "DEF", players: lineup.starters.filter((player) => player.position === "DEF") },
    { label: "GK", players: lineup.starters.filter((player) => player.position === "GK") },
  ];
}

function shortName(name: string) {
  const parts = name.split(" ");
  return parts.length > 1 ? `${parts[0][0]}. ${parts.slice(1).join(" ")}` : name;
}

function portraitDataUri(name: string, playerId: string) {
  const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const hue = Array.from(playerId).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="hsl(${hue},76%,54%)"/><stop offset="1" stop-color="hsl(${(hue + 55) % 360},76%,38%)"/></linearGradient></defs><rect width="96" height="96" fill="url(#g)"/><circle cx="48" cy="35" r="18" fill="rgba(255,255,255,.82)"/><path d="M18 91c4-22 18-34 30-34s26 12 30 34" fill="rgba(255,255,255,.82)"/><text x="48" y="88" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="800" fill="#07111f">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
