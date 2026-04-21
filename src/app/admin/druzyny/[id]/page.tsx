import Link from "next/link";
import { notFound } from "next/navigation";
import { ResetPasswordButton } from "@/components/reset-password-button";
import { addPlayer, deletePlayer, updatePlayer } from "@/lib/actions";
import { getAllUsers, getPlayers, getTeam } from "@/lib/repo";
import { createCaptain, deleteUser } from "@/lib/user-actions";

export const dynamic = "force-dynamic";

export default async function AdminTeamRosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const team = await getTeam(id);
  if (!team) notFound();
  const [players, users] = await Promise.all([getPlayers(id), getAllUsers()]);
  const teamCaptains = users.filter(
    (u) => u.role === "captain" && u.teamId === id,
  );

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
          Kapitan drużyny
        </div>
        <h2 className="display text-2xl mt-1 mb-4">
          Zarządzanie kontem kapitana
        </h2>

        {teamCaptains.length === 0 ? (
          <p className="mb-4 italic text-ink-soft text-sm">
            Ta drużyna nie ma jeszcze kapitana.
          </p>
        ) : (
          <ul className="mb-5 space-y-2">
            {teamCaptains.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-3 p-2 border-2 border-ink/10 bg-cream-soft"
              >
                <div className="w-8 h-8 rounded-full bg-ink text-lime flex items-center justify-center display text-sm shrink-0">
                  {c.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{c.name}</div>
                  <div className="mono text-[10px] uppercase tracking-[0.25em] text-ink-soft truncate">
                    {c.email}
                  </div>
                </div>
                <span className="tag bg-lime text-ink border-ink">Kapitan</span>
                <ResetPasswordButton userId={c.id} userEmail={c.email} />
                <form action={deleteUser}>
                  <input type="hidden" name="userId" value={c.id} />
                  <button
                    type="submit"
                    className="mono text-[11px] uppercase tracking-[0.2em] text-rust hover:underline"
                  >
                    usuń
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form
          action={createCaptain}
          className="grid sm:grid-cols-[1fr_1fr_1fr_auto] gap-3"
        >
          <input type="hidden" name="teamId" value={team.id} />
          <input name="name" placeholder="Imię i nazwisko" className="field" />
          <input
            name="email"
            type="email"
            placeholder="kapitan@szkola.pl"
            required
            className="field"
          />
          <input
            name="password"
            type="password"
            placeholder="Hasło (min. 6)"
            required
            minLength={6}
            className="field"
          />
          <button type="submit" className="btn-primary">
            Dodaj kapitana
          </button>
        </form>
      </section>

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
          <span className="display text-sm px-2.5 py-1 bg-ink text-lime">
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
          <div className="grid gap-3">
            {players.map((p) => (
              <form
                key={p.id}
                action={updatePlayer}
                className="card grid sm:grid-cols-[64px_1fr_180px_auto_auto] items-center gap-3 p-3"
              >
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="teamId" value={team.id} />
                <div
                  className="relative w-14 h-14 border-2 border-ink flex items-center justify-center shrink-0"
                  style={{ backgroundColor: team.color }}
                >
                  <input
                    name="number"
                    type="number"
                    min={0}
                    defaultValue={p.number ?? ""}
                    className="w-full h-full bg-transparent display text-2xl text-center text-chalk mix-blend-difference outline-none"
                    aria-label="Numer"
                  />
                </div>
                <input
                  name="name"
                  defaultValue={p.name}
                  className="field"
                  placeholder="Imię i nazwisko"
                />
                <select
                  name="position"
                  defaultValue={p.position || ""}
                  className="field"
                >
                  <option value="">— pozycja —</option>
                  <option value="Bramkarz">Bramkarz</option>
                  <option value="Obrońca">Obrońca</option>
                  <option value="Pomocnik">Pomocnik</option>
                  <option value="Napastnik">Napastnik</option>
                </select>
                <button type="submit" className="btn-ghost text-xs">
                  Zapisz
                </button>
                <button
                  type="submit"
                  formAction={deletePlayer}
                  className="btn-danger text-xs"
                  aria-label="Usuń"
                >
                  ✕
                </button>
              </form>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
