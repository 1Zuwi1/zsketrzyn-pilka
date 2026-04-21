import Link from "next/link";

type Tab = {
  href: string;
  label: string;
};

export function MatchTabs({
  matchId,
  active,
}: {
  matchId: string;
  active: "przebieg" | "skladu";
}) {
  const tabs: (Tab & { key: "przebieg" | "skladu" })[] = [
    { key: "przebieg", href: `/mecze/${matchId}`, label: "Wydarzenia" },
    { key: "skladu", href: `/mecze/${matchId}/skladu`, label: "Składy" },
  ];
  return (
    <nav className="flex gap-2 flex-wrap">
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            className={`display text-sm tracking-[0.08em] px-3 py-2 border-2 ${
              isActive
                ? "bg-ink text-lime border-ink"
                : "border-ink hover:bg-ink hover:text-lime"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
