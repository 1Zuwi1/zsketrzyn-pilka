import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { query } from "./db";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function isAdmin(userId: string): Promise<boolean> {
  const rows = await query<{ role: string; email: string }>(
    "SELECT role, email FROM user WHERE id = ? LIMIT 1",
    [userId],
  );
  const u = rows[0];
  if (!u) return false;
  if (u.role === "admin") return true;
  const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase();
  if (adminEmail && u.email.toLowerCase() === adminEmail) {
    await query("UPDATE user SET role = 'admin' WHERE id = ?", [userId]);
    return true;
  }
  return false;
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  const ok = await isAdmin(session.user.id);
  if (!ok) redirect("/login?error=brak-uprawnien");
  return session;
}
