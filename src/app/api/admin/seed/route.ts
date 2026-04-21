import { auth } from "@/lib/auth";
import { query } from "@/lib/db";

// Seed dev-only. Uruchom raz:
//   curl -X POST -H "x-seed-token: $SEED_TOKEN" http://localhost:3000/api/admin/seed
// Ustaw w .env.local:
//   SEED_TOKEN=cos-losowego
//   ADMIN_EMAIL=admin@szkola.pl  (opcjonalne - sprawdzane też przez auth-helpers)

type SeededAccount = {
  email: string;
  password: string;
  role: "admin" | "captain";
  teamShortName?: string;
  name: string;
};

const SEED: SeededAccount[] = [
  {
    email: "admin@szkola.pl",
    password: "admin123",
    role: "admin",
    name: "Super Admin",
  },
  {
    email: "kapitan1@szkola.pl",
    password: "kapitan123",
    role: "captain",
    teamShortName: null as unknown as string,
    name: "Kapitan Drużyny 1",
  },
  {
    email: "kapitan2@szkola.pl",
    password: "kapitan123",
    role: "captain",
    teamShortName: null as unknown as string,
    name: "Kapitan Drużyny 2",
  },
  {
    email: "kapitan3@szkola.pl",
    password: "kapitan123",
    role: "captain",
    teamShortName: null as unknown as string,
    name: "Kapitan Drużyny 3",
  },
];

export async function POST(req: Request) {
  const token = req.headers.get("x-seed-token") ?? "";
  const expected = process.env.SEED_TOKEN ?? "";
  if (!expected || token !== expected) {
    return new Response("Forbidden", { status: 403 });
  }

  const teams = await query<{ id: string; short_name: string; name: string }>(
    "SELECT id, short_name, name FROM teams ORDER BY name LIMIT 3",
  );

  const created: { email: string; role: string; teamId: string | null }[] = [];
  for (let i = 0; i < SEED.length; i++) {
    const acc = SEED[i];
    const existing = await query<{ id: string }>(
      "SELECT id FROM user WHERE email = ? LIMIT 1",
      [acc.email],
    );
    let userId = existing[0]?.id ?? null;
    if (!userId) {
      try {
        const res = await auth.api.signUpEmail({
          body: {
            email: acc.email,
            password: acc.password,
            name: acc.name,
          },
          asResponse: false,
        });
        userId =
          (res as { user?: { id?: string } })?.user?.id ??
          (
            await query<{ id: string }>(
              "SELECT id FROM user WHERE email = ? LIMIT 1",
              [acc.email],
            )
          )[0]?.id ??
          null;
      } catch (e) {
        return new Response(
          `Błąd tworzenia ${acc.email}: ${(e as Error).message}`,
          { status: 500 },
        );
      }
    }
    if (!userId) continue;

    let teamId: string | null = null;
    if (acc.role === "captain") {
      const teamIdx = i - 1;
      teamId = teams[teamIdx]?.id ?? null;
    }
    await query(
      "UPDATE user SET role = ?, teamId = ?, mustChangePassword = 1 WHERE id = ?",
      [acc.role, teamId, userId],
    );
    created.push({ email: acc.email, role: acc.role, teamId });
  }

  return Response.json({
    ok: true,
    created,
    hint: "Zaloguj się przez /login. Hasła domyślne: admin123 / kapitan123 - ZMIEŃ!",
  });
}
