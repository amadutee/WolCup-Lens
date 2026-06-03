import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "World Cup Lens",
  description: "Live match context, transparent player ratings, and World Cup rankings.",
};

const navigation = [
  { href: "/", label: "Matches" },
  { href: "/rankings", label: "Rankings" },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
          <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur md:flex-row md:items-center md:justify-between">
            <Link href="/" className="group flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-pitch-500 text-xl font-black text-ink shadow-glow transition group-hover:scale-105">W</span>
              <div>
                <p className="text-lg font-black tracking-tight text-white">World Cup Lens</p>
                <p className="text-xs uppercase tracking-[0.28em] text-pitch-100/70">Match intelligence</p>
              </div>
            </Link>
            <nav className="flex gap-2 rounded-2xl bg-white/[0.04] p-1 text-sm font-semibold text-slate-200">
              {navigation.map((item) => (
                <Link key={item.href} href={item.href} className="rounded-xl px-4 py-2 transition hover:bg-white/10 hover:text-white">
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="mt-12 border-t border-white/10 py-6 text-sm text-slate-400">
            Mock-first architecture prepared for live football API adapters.
          </footer>
        </div>
      </body>
    </html>
  );
}
