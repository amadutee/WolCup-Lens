import type { TeamStats } from "@/lib/types";

type StatKey = keyof TeamStats;
const stats: { key: StatKey; label: string; suffix?: string }[] = [
  { key: "possession", label: "Possession", suffix: "%" },
  { key: "shots", label: "Shots" },
  { key: "shotsOnTarget", label: "Shots on target" },
  { key: "expectedGoals", label: "Expected goals" },
  { key: "passCompletion", label: "Pass completion", suffix: "%" },
  { key: "corners", label: "Corners" },
];

export function StatComparison({ homeStats, awayStats }: { homeStats?: TeamStats; awayStats?: TeamStats }) {
  if (!homeStats || !awayStats) {
    return <p className="rounded-2xl border border-dashed border-white/15 p-5 text-slate-400">Team stats will populate here once the match starts :)</p>;
  }

  return (
    <div className="space-y-4">
      {stats.map(({ key, label, suffix }) => {
        const home = homeStats[key];
        const away = awayStats[key];
        const total = Number(home) + Number(away) || 1;
        return (
          <div key={key}>
            <div className="mb-2 flex justify-between text-sm font-semibold text-slate-200">
              <span>{home}{suffix}</span>
              <span>{label}</span>
              <span>{away}{suffix}</span>
            </div>
            <div className="flex h-3 overflow-hidden rounded-full bg-white/10">
              <div className="bg-pitch-500" style={{ width: `${(Number(home) / total) * 100}%` }} />
              <div className="bg-blue-400" style={{ width: `${(Number(away) / total) * 100}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
