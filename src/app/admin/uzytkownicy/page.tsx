import { ResetPasswordButton } from "@/components/reset-password-button";
import { getAllUsers, getTeams } from "@/lib/repo";
import type { AppUser, Team, UserRole } from "@/lib/types";
import {
  createAdmin,
  createCaptain,
  deleteUser,
  updateUserRole,
} from "@/lib/user-actions";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Super admin",
  captain: "Kapitan",
  user: "Kibic",
};

export default async function AdminUsersPage() {
  const [users, teams] = await Promise.all([getAllUsers(), getTeams()]);
  const teamsById = new Map(teams.map((t) => [t.id, t]));

  const admins = users.filter((u) => u.role === "admin");
  const captains = users.filter((u) => u.role === "captain");
  const regulars = users.filter((u) => u.role === "user");

  return (
    <div className="space-y-8">
      <section className="card p-6">
        <div className="mono text-[11px] uppercase tracking-[0.3em] text-ink-soft">
          Nowy super admin
        </div>
        <h2 className="display text-3xl mt-1 mb-4">Utwórz konto admina</h2>
        <p className="text-sm text-ink-soft mb-4">
          Nowy admin przy pierwszym logowaniu zostanie poproszony o ustawienie
          własnego hasła.
        </p>
        <form
          action={createAdmin}
          className="grid sm:grid-cols-[1fr_1fr_1fr_auto] gap-3"
        >
          <input name="name" placeholder="Imię i nazwisko" className="field" />
          <input
            name="email"
            type="email"
            placeholder="admin@szkola.pl"
            required
            className="field"
          />
          <input
            name="password"
            type="password"
            placeholder="Hasło startowe (min. 6)"
            required
            minLength={6}
            className="field"
          />
          <button type="submit" className="btn-primary">
            Utwórz admina
          </button>
        </form>
      </section>

      <section className="card p-6">
        <div className="mono text-[11px] uppercase tracking-[0.3em] text-ink-soft">
          Nowe konto kapitana
        </div>
        <h2 className="display text-3xl mt-1 mb-4">Utwórz kapitana drużyny</h2>
        {teams.length === 0 ? (
          <p className="italic text-ink-soft">
            Dodaj najpierw drużynę, do której przypiszesz kapitana.
          </p>
        ) : (
          <form
            action={createCaptain}
            className="grid sm:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3"
          >
            <input
              name="name"
              placeholder="Imię i nazwisko"
              className="field"
            />
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
            <select name="teamId" required className="field">
              <option value="">Drużyna…</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button type="submit" className="btn-primary">
              Utwórz
            </button>
          </form>
        )}
      </section>

      <UserSection
        title="Super admini"
        tone="ink"
        users={admins}
        teams={teams}
        teamsById={teamsById}
      />
      <UserSection
        title="Kapitanowie"
        tone="lime"
        users={captains}
        teams={teams}
        teamsById={teamsById}
      />
      <UserSection
        title="Kibice"
        tone="cream"
        users={regulars}
        teams={teams}
        teamsById={teamsById}
      />
    </div>
  );
}

function UserSection({
  title,
  tone,
  users,
  teams,
  teamsById,
}: {
  title: string;
  tone: "ink" | "lime" | "cream";
  users: AppUser[];
  teams: Team[];
  teamsById: Map<string, Team>;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <span
          className={`display text-sm px-2.5 py-1 ${
            tone === "ink"
              ? "bg-ink text-lime"
              : tone === "lime"
                ? "bg-lime text-ink"
                : "bg-chalk text-ink border-2 border-ink"
          }`}
        >
          {String(users.length).padStart(2, "0")}
        </span>
        <h2 className="display text-3xl">{title}</h2>
        <div className="flex-1 border-t-2 border-ink/20" />
      </div>

      {users.length === 0 ? (
        <div className="card p-6 text-center italic text-ink-soft">
          Brak kont.
        </div>
      ) : (
        users.map((u) => (
          <UserRow key={u.id} user={u} teams={teams} teamsById={teamsById} />
        ))
      )}
    </section>
  );
}

function UserRow({
  user,
  teams,
  teamsById,
}: {
  user: AppUser;
  teams: Team[];
  teamsById: Map<string, Team>;
}) {
  const team = user.teamId ? teamsById.get(user.teamId) : null;
  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center gap-4 p-4 border-b-2 border-ink/10">
        <div className="w-10 h-10 rounded-full bg-ink text-lime flex items-center justify-center display text-lg shrink-0">
          {user.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="display text-xl truncate">{user.name}</div>
          <div className="mono text-[11px] uppercase tracking-[0.25em] text-ink-soft truncate">
            {user.email}
          </div>
        </div>
        <span
          className={`tag ${
            user.role === "admin"
              ? "bg-ink text-lime border-ink"
              : user.role === "captain"
                ? "bg-lime text-ink border-ink"
                : "bg-chalk border-ink"
          }`}
        >
          {ROLE_LABEL[user.role]}
        </span>
        {team && (
          <span
            className="tag"
            style={{ backgroundColor: team.color, color: "#fafafa" }}
          >
            {team.shortName}
          </span>
        )}
      </div>
      <div className="grid sm:grid-cols-[1fr_auto] items-center gap-3 p-4 bg-cream-soft">
        <form
          action={updateUserRole}
          className="grid sm:grid-cols-[1fr_1fr_auto_auto] items-center gap-3"
        >
          <input type="hidden" name="userId" value={user.id} />
          <select
            name="role"
            defaultValue={user.role}
            className="field"
            aria-label="Rola"
          >
            <option value="user">Kibic</option>
            <option value="captain">Kapitan</option>
            <option value="admin">Super admin</option>
          </select>
          <select
            name="teamId"
            defaultValue={user.teamId ?? ""}
            className="field"
            aria-label="Drużyna"
          >
            <option value="">— brak drużyny —</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-ghost text-sm">
            Zapisz
          </button>
          <button
            type="submit"
            formAction={deleteUser}
            className="btn-danger text-sm"
          >
            Usuń
          </button>
        </form>
        <ResetPasswordButton userId={user.id} userEmail={user.email} />
      </div>
    </div>
  );
}
