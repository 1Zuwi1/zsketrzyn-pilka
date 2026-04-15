import Link from "next/link";
import { createTeam, deleteTeam, updateTeam } from "@/lib/actions";
import { getPlayers, getTeams } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function AdminTeamsPage() {
  const [teams, players] = await Promise.all([getTeams(), getPlayers()]);
  const counts = new Map<string, number>();
  for (const p of players) counts.set(p.teamId, (counts.get(p.teamId) ?? 0) + 1);

  return (
    <div className="space-y-8">
      <section className="card p-6">
        <div className="mono text-[11px] uppercase tracking-[0.3em] text-ink-soft">
          Nowy zespół
        </div>
        <h2 className="display text-3xl mt-1 mb-4">Dodaj drużynę</h2>
        <form
          action={createTeam}
          className="grid sm:grid-cols-[1fr_140px_80px_auto] gap-3"
        >
          <input
            name="name"
            placeholder="Nazwa (np. Klasa 3A)"
            required
            className="field"
          />
          <input
            name="shortName"
            placeholder="Skrót (3A)"
            maxLength={16}
            className="field"
          />
          <input
            type="color"
            name="color"
            defaultValue="#0f3d24"
            className="field !p-1 h-[46px]"
          />
          <button type="submit" className="btn-primary">
            Dodaj
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="display text-sm px-2.5 py-1 bg-ink text-lime">
            {String(teams.length).padStart(2, "0")}
          </span>
          <h2 className="display text-3xl">Zespoły w lidze</h2>
          <div className="flex-1 border-t-2 border-ink/20" />
        </div>

        {teams.length === 0 ? (
          <div className="card p-8 text-center text-ink-soft italic">
            Brak drużyn.
          </div>
        ) : (
          teams.map((t) => (
            <div key={t.id} className="card p-0 overflow-hidden">
              <div className="flex items-center gap-4 p-4 border-b-2 border-ink">
                <div
                  className="w-14 h-14 border-2 border-ink flex items-center justify-center display text-2xl shrink-0"
                  style={{ backgroundColor: t.color }}
                >
                  <span className="text-chalk mix-blend-difference">
                    {t.shortName.slice(0, 3).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="display text-2xl truncate">{t.name}</div>
                  <div className="mono text-[11px] uppercase tracking-[0.25em] text-ink-soft">
                    {counts.get(t.id) ?? 0} zawodników
                  </div>
                </div>
                <Link
                  href={`/admin/druzyny/${t.id}`}
                  className="btn-primary text-sm"
                >
                  Skład →
                </Link>
              </div>
              <form
                action={updateTeam}
                className="grid sm:grid-cols-[1fr_140px_80px_auto_auto] gap-3 p-4 bg-cream-soft"
              >
                <input type="hidden" name="id" value={t.id} />
                <input
                  name="name"
                  defaultValue={t.name}
                  required
                  className="field"
                />
                <input
                  name="shortName"
                  defaultValue={t.shortName}
                  maxLength={16}
                  className="field"
                />
                <input
                  type="color"
                  name="color"
                  defaultValue={t.color}
                  className="field !p-1 h-[46px]"
                />
                <button type="submit" className="btn-ghost text-sm">
                  Zapisz
                </button>
                <button
                  type="submit"
                  formAction={deleteTeam}
                  className="btn-danger text-sm"
                >
                  Usuń
                </button>
              </form>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
