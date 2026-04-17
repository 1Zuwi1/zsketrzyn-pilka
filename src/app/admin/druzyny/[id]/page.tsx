import Link from "next/link";
import { notFound } from "next/navigation";
import { addPlayer, deletePlayer } from "@/lib/actions";
import { getPlayers, getTeam } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function AdminTeamRosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const team = await getTeam(id);
  if (!team) notFound();
  const players = await getPlayers(id);

  return (
    <div className="space-y-8">
      <Link
        href="/admin/druzyny"
        className="mono text-[11px] uppercase tracking-[0.3em] text-ink-soft hover:text-pitch"
      >
        ← Drużyny
      </Link>

      <header className="grid sm:grid-cols-[auto_1fr] gap-0 border-2 border-ink">
        <div
          className="w-full sm:w-40 p-6 flex items-center justify-center border-b-2 sm:border-b-0 sm:border-r-2 border-ink"
          style={{ backgroundColor: team.color }}
        >
          <span className="display text-6xl text-chalk mix-blend-difference">
            {team.shortName.slice(0, 3).toUpperCase()}
          </span>
        </div>
        <div className="p-6 bg-cream">
          <div className="mono text-[11px] uppercase tracking-[0.3em] text-ink-soft">
            Skład drużyny
          </div>
          <h1 className="display text-[clamp(2rem,5vw,4rem)] leading-[0.9]">
            {team.name}
          </h1>
          <div className="mt-2 mono text-xs uppercase tracking-[0.25em] text-ink-soft">
            {players.length} zawodników
          </div>
        </div>
      </header>

      <section className="card p-6">
        <div className="mono text-[11px] uppercase tracking-[0.3em] text-ink-soft">
          Nowy zawodnik
        </div>
        <h2 className="display text-2xl mt-1 mb-4">Dodaj do składu</h2>
        <form
          action={addPlayer}
          className="grid sm:grid-cols-[80px_1fr_180px_auto] gap-3"
        >
          <input type="hidden" name="teamId" value={team.id} />
          <input
            name="number"
            type="number"
            placeholder="Nr"
            min={0}
            className="field text-center"
          />
          <input
            name="name"
            placeholder="Imię i nazwisko"
            required
            className="field"
          />
          <select name="position" defaultValue="" className="field">
            <option value="">— pozycja —</option>
            <option value="Bramkarz">Bramkarz</option>
            <option value="Obrońca">Obrońca</option>
            <option value="Pomocnik">Pomocnik</option>
            <option value="Napastnik">Napastnik</option>
          </select>
          <button type="submit" className="btn-primary">
            Dodaj
          </button>
        </form>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="display text-sm px-2.5 py-1 bg-ink text-lime-soft">
            {String(players.length).padStart(2, "0")}
          </span>
          <h2 className="display text-2xl">Skład</h2>
          <div className="flex-1 border-t-2 border-ink/20" />
        </div>
        {players.length === 0 ? (
          <div className="card p-8 text-center text-ink-soft italic">
            Brak zawodników.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {players.map((p) => (
              <div
                key={p.id}
                className="card flex items-center gap-3 p-3"
              >
                <div
                  className="w-12 h-12 flex items-center justify-center display text-2xl shrink-0 border-2 border-ink"
                  style={{ backgroundColor: team.color }}
                >
                  <span className="text-chalk mix-blend-difference">
                    {p.number ?? "—"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{p.name}</div>
                  {p.position && (
                    <div className="mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
                      {p.position}
                    </div>
                  )}
                </div>
                <form action={deletePlayer}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="teamId" value={team.id} />
                  <button
                    type="submit"
                    className="btn-danger text-xs"
                    aria-label="Usuń"
                  >
                    ✕
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
