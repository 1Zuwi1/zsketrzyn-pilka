import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { query } from "./db";
import type { UserRole } from "./types";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

type UserRow = { role: string; email: string; teamId: string | null };

async function loadUserRow(userId: string): Promise<UserRow | null> {
  const rows = await query<UserRow>(
    "SELECT role, email, teamId FROM user WHERE id = ? LIMIT 1",
    [userId],
  );
  return rows[0] ?? null;
}

export async function getUserRole(
  userId: string,
): Promise<{ role: UserRole | null; teamId: string | null }> {
  const u = await loadUserRow(userId);
  if (!u) return { role: null, teamId: null };
  if (u.role === "admin") return { role: "admin", teamId: null };
  const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase();
  if (adminEmail && u.email.toLowerCase() === adminEmail) {
    // Przy pierwszej promocji wymuś zmianę hasła.
    await query(
      "UPDATE user SET role = 'admin', mustChangePassword = 1 WHERE id = ?",
      [userId],
    );
    return { role: "admin", teamId: null };
  }
  if (u.role === "captain") return { role: "captain", teamId: u.teamId };
  return { role: null, teamId: null };
}

export async function isAdmin(userId: string): Promise<boolean> {
  const r = await getUserRole(userId);
  return r.role === "admin";
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  const r = await getUserRole(session.user.id);
  if (r.role !== "admin") redirect("/login?error=brak-uprawnien");
  if (await getMustChangePassword(session.user.id)) {
    redirect("/zmien-haslo?forced=1");
  }
  return session;
}

export async function requireAdminOrCaptain() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  const r = await getUserRole(session.user.id);
  if (r.role !== "admin" && r.role !== "captain") {
    redirect("/login?error=brak-uprawnien");
  }
  if (await getMustChangePassword(session.user.id)) {
    redirect("/zmien-haslo?forced=1");
  }
  return { session, role: r.role, teamId: r.teamId };
}

export async function getCurrentUserWithRole() {
  const session = await getSession();
  if (!session?.user) return null;
  const r = await getUserRole(session.user.id);
  if (!r.role) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? session.user.email,
    role: r.role,
    teamId: r.teamId,
  };
}

export async function getMustChangePassword(
  userId: string,
): Promise<boolean> {
  const rows = await query<{ mustChangePassword: number }>(
    "SELECT mustChangePassword FROM user WHERE id = ? LIMIT 1",
    [userId],
  );
  return !!rows[0]?.mustChangePassword;
}
