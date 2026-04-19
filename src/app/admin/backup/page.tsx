import { importBackup } from "@/lib/actions";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

type CountRow = { c: number | string };

async function countTable(table: string): Promise<number> {
  const rows = await query<CountRow>(`SELECT COUNT(*) AS c FROM ${table}`);
  return Number(rows[0]?.c ?? 0);
}

export default async function AdminBackupPage() {
  const [teams, players, matches, goals] = await Promise.all([
    countTable("teams"),
    countTable("players"),
    countTable("matches"),
    countTable("match_goals"),
  ]);

  return (
    <div className="space-y-8">
      <section className="card p-6 sm:p-8">
        <div className="mono text-[11px] uppercase tracking-[0.3em] text-ink-soft">
          Eksport
        </div>
        <h2 className="display text-3xl mt-1 mb-4">Pobierz kopię zapasową</h2>
        <p className="text-sm text-ink-soft mb-5">
          Pobierzesz plik JSON ze wszystkimi rekordami bazy (drużyny, zawodnicy,
          mecze, bramki).
        </p>
        <div className="grid sm:grid-cols-4 gap-3 mb-5">
          <Stat label="Drużyny" value={teams} />
          <Stat label="Zawodnicy" value={players} />
          <Stat label="Mecze" value={matches} />
          <Stat label="Bramki" value={goals} />
        </div>
        <a href="/api/admin/backup" download className="btn-primary inline-block">
          Pobierz backup.json
        </a>
      </section>

      <section className="card p-6 sm:p-8">
        <div className="mono text-[11px] uppercase tracking-[0.3em] text-rust">
          Import
        </div>
        <h2 className="display text-3xl mt-1 mb-4">Wczytaj kopię zapasową</h2>
        <p className="text-sm text-ink-soft mb-2">
          Wybierz plik JSON wyeksportowany powyżej. Operacja{" "}
          <strong>usunie wszystkie bieżące rekordy</strong> i zastąpi je danymi
          z pliku.
        </p>
        <p className="text-sm text-ink-soft mb-5">
          Konta użytkowników pozostają nietknięte.
        </p>
        <form action={importBackup} className="grid sm:grid-cols-[1fr_auto_auto] gap-3 items-center">
          <input
            type="file"
            name="file"
            accept="application/json,.json"
            required
            className="field"
          />
          <label className="mono text-xs uppercase tracking-[0.2em] flex items-center gap-2">
            <input type="checkbox" name="confirm" value="1" required />
            Potwierdzam
          </label>
          <button type="submit" className="btn-danger">
            Importuj i nadpisz
          </button>
        </form>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card bg-cream-soft p-4">
      <div className="mono text-[11px] uppercase tracking-[0.3em] text-ink-soft">
        {label}
      </div>
      <div className="display text-4xl leading-none mt-1">{value}</div>
    </div>
  );
}
