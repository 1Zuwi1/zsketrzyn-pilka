import type { FormResult } from "@/lib/types";

const MAX = 5;

const STYLES: Record<FormResult, { label: string; cls: string; title: string }> =
  {
    W: {
      label: "Z",
      cls: "bg-pitch text-cream",
      title: "Zwycięstwo",
    },
    D: {
      label: "R",
      cls: "bg-amber text-ink",
      title: "Remis",
    },
    L: {
      label: "P",
      cls: "bg-rust text-cream",
      title: "Porażka",
    },
  };

export function FormBadges({ form }: { form: FormResult[] }) {
  const recent = form.slice(-MAX);
  const placeholders = Math.max(0, MAX - recent.length);
  return (
    <div className="inline-flex items-center gap-1">
      {Array.from({ length: placeholders }).map((_, i) => (
        <span
          key={`p-${i}`}
          aria-hidden
          className="inline-flex items-center justify-center w-6 h-6 text-[11px] bg-ink/20 text-ink-soft border border-ink/20 display"
          title="Brak danych"
        >
          ?
        </span>
      ))}
      {recent.map((r, i) => {
        const s = STYLES[r];
        return (
          <span
            key={`${i}-${r}`}
            className={`inline-flex items-center justify-center w-6 h-6 text-[11px] display border border-ink/30 ${s.cls}`}
            title={s.title}
          >
            {s.label}
          </span>
        );
      })}
    </div>
  );
}
