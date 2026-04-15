import type { Metadata } from "next";
import { Anton, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { NavAuth } from "@/components/nav-auth";
import "./globals.css";

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin", "latin-ext"],
  weight: "400",
});
const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin", "latin-ext"],
});
const jetbrains = JetBrains_Mono({
  variable: "--font-jet",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LIGA SZKOLNA — ZS KĘTRZYN",
  description: "Szkolna liga piłki nożnej",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pl"
      className={`${anton.variable} ${instrument.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b-2 border-ink bg-cream">
          <div className="mx-auto max-w-7xl px-5 py-3 flex items-center gap-6 flex-wrap">
            <Link
              href="/"
              className="flex items-baseline gap-2 group"
              aria-label="Strona główna"
            >
              <span
                aria-hidden
                className="inline-flex items-center justify-center w-9 h-9 bg-ink text-lime display text-xl translate-y-[2px] group-hover:bg-pitch transition-colors"
              >
                ⚽
              </span>
              <span className="display text-2xl tracking-tight">
                Liga <span className="text-pitch">Szkolna</span>
              </span>
            </Link>
            <nav className="flex gap-1 ml-2">
              <NavLink href="/">Tabela</NavLink>
              <NavLink href="/mecze">Mecze</NavLink>
              <NavLink href="/druzyny">Drużyny</NavLink>
            </nav>
            <div className="ml-auto">
              <NavAuth />
            </div>
          </div>
          <div className="border-t border-ink/20 bg-ink text-lime overflow-hidden">
            <div className="ticker py-1.5 mono text-[11px] uppercase tracking-[0.2em]">
              {["a", "b"].map((k) => (
                <div key={k} className="flex gap-12 px-6">
                  <span>★ ZS Kętrzyn</span>
                  <span>Sezon 2025/2026</span>
                  <span>★ Liga Szkolna</span>
                  <span>Piłka nożna</span>
                </div>
              ))}
            </div>
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-7xl px-5 py-10">
          {children}
        </main>
        <footer className="border-t-2 border-ink bg-ink text-cream mt-10">
          <div className="mx-auto max-w-7xl px-5 py-6 flex justify-between items-center flex-wrap gap-3 mono text-xs uppercase tracking-widest">
            <span>
              © {new Date().getFullYear()} · Liga Szkolna · ZS Kętrzyn
            </span>
            <span className="text-lime">⚽ Keep it on the ground</span>
          </div>
        </footer>
      </body>
    </html>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="display text-sm tracking-[0.08em] px-3 py-1.5 border-2 border-transparent hover:border-ink transition-colors"
    >
      {children}
    </Link>
  );
}
