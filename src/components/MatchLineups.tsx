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
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const selectedRating = selectedPlayerId ? ratingsByPlayer.get(selectedPlayerId) : undefined;

  return (
    <section className="glass-card rounded-3xl p-5">
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-pitch-100/80">Tactical view</p>
          <h2 className="section-title">Lineups</h2>
        </div>
        <p className="max-w-xl text-sm text-slate-400">Both teams share one tactical tile. Tap a rated player to open their pass-rank breakdown in a pop-up.</p>
      </div>

      <CombinedLineupTile
        home={home}
        away={away}
        homeLineup={lineups[home.id]}
        awayLineup={lineups[away.id]}
        ratingsByPlayer={ratingsByPlayer}
        selectedPlayerId={selectedPlayerId}
        onSelect={setSelectedPlayerId}
      />

      {selectedRating ? (
        <RatingExplanationDialog rating={selectedRating} onClose={() => setSelectedPlayerId("")} />
      ) : null}
    </section>
  );
}

function CombinedLineupTile({
  home,
  away,
  homeLineup,
  awayLineup,
  ratingsByPlayer,
  selectedPlayerId,
  onSelect,
}: {
  home: Team;
  away: Team;
  homeLineup?: TeamLineup;
  awayLineup?: TeamLineup;
  ratingsByPlayer: Map<string, PlayerRating>;
  selectedPlayerId: string;
  onSelect: (playerId: string) => void;
}) {
  if (!homeLineup || !awayLineup) {
    return (
      <div className="rounded-[2rem] border border-white/10 bg-ink/40 p-5">
        <h3 className="text-lg font-black text-white">{home.flag} {home.name} vs {away.flag} {away.name}</h3>
        <p className="mt-4 text-sm text-slate-400">Lineups pending.</p>
      </div>
    );
  }

  const homeRows = [...buildFormationRows(homeLineup)].reverse().filter((row) => row.players.length > 0);
  const awayRows = buildFormationRows(awayLineup).filter((row) => row.players.length > 0);

  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-emerald-950/50">
      <TeamHeader team={home} formation={homeLineup.formation} />
      <div className="relative min-h-[64rem] overflow-hidden bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2)_0_2px,transparent_2px),linear-gradient(90deg,rgba(255,255,255,0.12)_2px,transparent_2px),linear-gradient(rgba(255,255,255,0.12)_2px,transparent_2px)] bg-[length:32px_32px,100%_100%,100%_50%] p-4 lg:min-h-[70rem]">
        <PitchMarkings />
        <div className="relative z-10 grid min-h-[61rem] grid-rows-2 gap-8 py-3 lg:min-h-[67rem]">
          <FormationHalf
            rows={homeRows}
            ratingsByPlayer={ratingsByPlayer}
            selectedPlayerId={selectedPlayerId}
            onSelect={onSelect}
          />
          <FormationHalf
            rows={awayRows}
            ratingsByPlayer={ratingsByPlayer}
            selectedPlayerId={selectedPlayerId}
            onSelect={onSelect}
          />
        </div>
      </div>
      <TeamHeader team={away} formation={awayLineup.formation} align="bottom" />
      <BenchAndManagers home={home} away={away} homeLineup={homeLineup} awayLineup={awayLineup} />
      <LineupLegend />
    </div>
  );
}

function TeamHeader({ team, formation, align = "top" }: { team: Team; formation: string; align?: "top" | "bottom" }) {
  return (
    <div className={`flex items-center justify-between gap-3 border-white/10 bg-ink/70 p-4 ${align === "top" ? "border-b" : "border-y"}`}>
      <h3 className="flex items-center gap-3 text-lg font-black text-white">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-2xl shadow-inner">{team.flag}</span>
        {team.name}
      </h3>
      <span className="rounded-full bg-pitch-900/80 px-3 py-1 text-sm font-black text-pitch-100 ring-1 ring-pitch-300/20">{formation}</span>
    </div>
  );
}

function PitchMarkings() {
  return (
    <>
      <div className="pointer-events-none absolute inset-4 rounded-[1.5rem] border-2 border-white/20" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/20" />
      <div className="pointer-events-none absolute left-4 right-4 top-1/2 border-t-2 border-white/20" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/30" />
      <div className="pointer-events-none absolute left-1/2 top-4 h-28 w-1/2 -translate-x-1/2 rounded-b-2xl border-x-2 border-b-2 border-white/20" />
      <div className="pointer-events-none absolute bottom-4 left-1/2 h-28 w-1/2 -translate-x-1/2 rounded-t-2xl border-x-2 border-t-2 border-white/20" />
      <div className="pointer-events-none absolute left-1/2 top-4 h-14 w-1/4 -translate-x-1/2 rounded-b-2xl border-x-2 border-b-2 border-white/20" />
      <div className="pointer-events-none absolute bottom-4 left-1/2 h-14 w-1/4 -translate-x-1/2 rounded-t-2xl border-x-2 border-t-2 border-white/20" />
    </>
  );
}

function FormationHalf({
  rows,
  ratingsByPlayer,
  selectedPlayerId,
  onSelect,
}: {
  rows: ReturnType<typeof buildFormationRows>;
  ratingsByPlayer: Map<string, PlayerRating>;
  selectedPlayerId: string;
  onSelect: (playerId: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-col justify-between gap-3">
      {rows.map((row, rowIndex) => (
        <div key={`${row.label}-${rowIndex}`} className="flex justify-center gap-2 sm:gap-3 lg:gap-5">
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

function BenchAndManagers({ home, away, homeLineup, awayLineup }: { home: Team; away: Team; homeLineup: TeamLineup; awayLineup: TeamLineup }) {
  const maxBenchRows = Math.max(homeLineup.substitutes.length, awayLineup.substitutes.length);

  return (
    <div className="border-t border-white/10 bg-ink/80 p-4">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-white/10 p-4">
          <span className="text-2xl">{home.flag}</span>
          <h3 className="text-xl font-black text-white">Bench</h3>
          <span className="justify-self-end text-2xl">{away.flag}</span>
        </div>
        <div className="divide-y divide-white/10">
          {Array.from({ length: maxBenchRows }).map((_, index) => (
            <div key={index} className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2">
              <BenchPlayer player={homeLineup.substitutes[index]} />
              <BenchPlayer player={awayLineup.substitutes[index]} align="right" />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-2">
        <ManagerCard team={home} manager={homeLineup.manager} />
        <ManagerCard team={away} manager={awayLineup.manager} align="right" />
      </div>
    </div>
  );
}

function BenchPlayer({ player, align = "left" }: { player?: LineupPlayer; align?: "left" | "right" }) {
  if (!player) {
    return <div className="hidden md:block" />;
  }

  return (
    <div className={`flex items-center gap-3 ${align === "right" ? "md:flex-row-reverse md:text-right" : ""}`}>
      <Image className="h-14 w-14 rounded-2xl border border-white/20 object-cover" src={portraitDataUri(player.name, player.playerId)} alt={`${player.name} headshot`} width={56} height={56} unoptimized />
      <div className="min-w-0">
        <p className="truncate font-black text-white">{player.name}</p>
        <p className="text-sm font-semibold text-slate-400">#{player.shirtNumber} · {player.position}</p>
      </div>
    </div>
  );
}

function ManagerCard({ team, manager, align = "left" }: { team: Team; manager?: string; align?: "left" | "right" }) {
  return (
    <div className={`flex items-center gap-3 ${align === "right" ? "md:flex-row-reverse md:text-right" : ""}`}>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-2xl">{team.flag}</span>
      <div>
        <p className="font-black text-white">{manager ?? "Manager pending"}</p>
        <p className="text-sm font-semibold text-slate-400">{team.shortName} manager</p>
      </div>
    </div>
  );
}

function LineupLegend() {
  const items = [
    ["⚽", "Goal"],
    ["🟨", "Yellow card"],
    ["🟥", "Red card"],
    ["⬆️", "Sub in"],
    ["⬇️", "Sub out"],
    ["✚", "Injured"],
  ];

  return (
    <div className="grid gap-2 border-t border-white/10 bg-ink/90 p-4 text-sm font-bold text-slate-400 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(([icon, label]) => (
        <div key={label} className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          {label}
        </div>
      ))}
    </div>
  );
}

function RatingExplanationDialog({ rating, onClose }: { rating: PlayerRating; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Rating explanation for ${rating.playerName}`} onClick={onClose}>
      <div className="relative w-full max-w-xl" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute -right-2 -top-14 flex h-12 w-12 items-center justify-center rounded-full bg-white text-3xl font-light text-ink shadow-xl transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-pitch-100 sm:-right-14 sm:top-0"
          aria-label="Close rating explanation"
        >
          ×
        </button>
        <RatingExplanation rating={rating} />
      </div>
    </div>
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
