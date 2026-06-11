import { MatchCard } from "@/components/MatchCard";
import { footballDataProvider } from "@/lib/footballApi";

export const dynamic = "force-dynamic";

const sections = [
  { key: "live", title: "Live now", description: "Momentum, score state, and player ratings as the match unfolds." },
  { key: "upcoming", title: "Upcoming fixtures", description: "Kickoff context and match cards ready for API-powered previews." },
  { key: "recent", title: "Recent results", description: "Final scores and post-match rating summaries." },
] as const;

export default async function Home() {
  const matches = await footballDataProvider.getMatches();

  return (
    <div className="space-y-10">
      <section className="grid gap-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur lg:grid-cols-[1.2fr_0.8fr] lg:p-10">
        <div>
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-pitch-100">World Cup Lens</p>
          <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white md:text-6xl">See every match through transparent performance ratings.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">Track upcoming, live, and recent World Cup matches with explainable 0–10 player ratings designed around role-specific contributions.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {[
            ["16", "Host cities"],
            ["0–10", "Player lens"],
            ["API", "Ready data layer"],
          ].map(([value, label]) => (
            <div key={label} className="rounded-3xl border border-white/10 bg-ink/50 p-5">
              <p className="text-3xl font-black text-pitch-100">{value}</p>
              <p className="text-sm text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {sections.map((section) => {
        const sectionMatches = matches.filter((match) => match.status === section.key);
        return (
          <section key={section.key}>
            <div className="mb-4 flex flex-col justify-between gap-2 md:flex-row md:items-end">
              <div>
                <h2 className="section-title">{section.title}</h2>
                <p className="mt-1 text-slate-400">{section.description}</p>
              </div>
              <span className="text-sm font-semibold text-pitch-100">{sectionMatches.length} matches</span>
            </div>
            {sectionMatches.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {sectionMatches.map((match) => <MatchCard key={match.id} match={match} />)}
              </div>
            ) : (
              <div className="glass-card rounded-3xl p-5 text-sm text-slate-400">No {section.title.toLowerCase()} available right now.</div>
            )}
          </section>
        );
      })}
    </div>
  );
}
