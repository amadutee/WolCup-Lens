import type { PlayerRating } from "@/lib/types";
import { RatingBadge } from "./RatingBadge";

export function RatingExplanation({ rating }: { rating: PlayerRating }) {
  return (
    <section className="glass-card rounded-3xl p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-pitch-100/80">Rating explanation</p>
          <h2 className="mt-1 text-2xl font-black text-white">{rating.playerName}</h2>
          <p className="text-sm text-slate-400">Base score {rating.baseRating.toFixed(1)} adjusted as the match proceeds.</p>
        </div>
        <RatingBadge rating={rating.rating} size="lg" />
      </div>
      <div className="mt-6 space-y-3">
        {rating.impacts.map((impact) => (
          <div key={`${impact.label}-${impact.value}`} className="rounded-2xl border border-white/10 bg-ink/40 p-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-white">{impact.label}</span>
              <span className="text-slate-300">{impact.value}</span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full ${impact.direction === "negative" ? "ml-auto bg-rose-400" : impact.direction === "positive" ? "bg-pitch-500" : "bg-slate-500"}`}
                  style={{ width: `${Math.min(Math.abs(impact.impact) * 28, 100)}%` }}
                />
              </div>
              <span className={`w-14 text-right text-sm font-black ${impact.direction === "negative" ? "text-rose-300" : impact.direction === "positive" ? "text-pitch-100" : "text-slate-400"}`}>
                {impact.impact > 0 ? "+" : ""}{impact.impact.toFixed(1)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
