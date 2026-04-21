"use server";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { revalidatePath } from "next/cache";
import { auth } from "./auth";
import { getSession, requireAdmin } from "./auth-helpers";
import { query } from "./db";

function str(v: FormDataEntryValue | null): string {
  return (v ?? "").toString().trim();
}

function revalidateUsers() {
  revalidatePath("/admin/uzytkownicy");
  revalidatePath("/admin");
}

function randomPassword(length = 10): string {
  const alphabet =
    "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

async function setUserPasswordHash(userId: string, password: string) {
  const hash = await hashPassword(password);
  const updated = await query(
    "UPDATE account SET password = ? WHERE userId = ? AND providerId = 'credential'",
    [hash, userId],
  );
  return updated;
}

export async function createCaptain(formData: FormData) {
  await requireAdmin();
  const email = str(formData.get("email")).toLowerCase();
  const password = str(formData.get("password"));
  const name = str(formData.get("name")) || email;
  const teamId = str(formData.get("teamId"));

  if (!email || !password || !teamId) {
    throw new Error("E-mail, hasło i drużyna są wymagane.");
  }
  if (password.length < 6) {
    throw new Error("Hasło minimum 6 znaków.");
  }

  const teamRows = await query<{ id: string }>(
    "SELECT id FROM teams WHERE id = ? LIMIT 1",
    [teamId],
  );
  if (!teamRows[0]) throw new Error("Wybrana drużyna nie istnieje.");

  const existing = await query<{ id: string }>(
    "SELECT id FROM user WHERE email = ? LIMIT 1",
    [email],
  );
  if (existing[0]) {
    throw new Error("Użytkownik z tym e-mailem już istnieje.");
  }

  const result = await auth.api.signUpEmail({
    body: { email, password, name },
    asResponse: false,
  });

  const newUserId =
    (result as { user?: { id?: string } })?.user?.id ?? undefined;
  let finalUserId = newUserId;
  if (!finalUserId) {
    const rows = await query<{ id: string }>(
      "SELECT id FROM user WHERE email = ? LIMIT 1",
      [email],
    );
    finalUserId = rows[0]?.id;
  }
  if (!finalUserId) throw new Error("Nie udało się utworzyć konta.");

  // Konto założone przez admina - wymagaj zmiany hasła przy pierwszym logowaniu.
  await query(
    "UPDATE user SET role = 'captain', teamId = ?, mustChangePassword = 1 WHERE id = ?",
    [teamId, finalUserId],
  );

  revalidateUsers();
}

export async function createAdmin(formData: FormData) {
  await requireAdmin();
  const email = str(formData.get("email")).toLowerCase();
  const password = str(formData.get("password"));
  const name = str(formData.get("name")) || email;

  if (!email || !password) {
    throw new Error("E-mail i hasło są wymagane.");
  }
  if (password.length < 6) {
    throw new Error("Hasło minimum 6 znaków.");
  }

  const existing = await query<{ id: string }>(
    "SELECT id FROM user WHERE email = ? LIMIT 1",
    [email],
  );
  if (existing[0]) {
    throw new Error("Użytkownik z tym e-mailem już istnieje.");
  }

  const result = await auth.api.signUpEmail({
    body: { email, password, name },
    asResponse: false,
  });
  let userId = (result as { user?: { id?: string } })?.user?.id;
  if (!userId) {
    const rows = await query<{ id: string }>(
      "SELECT id FROM user WHERE email = ? LIMIT 1",
      [email],
    );
    userId = rows[0]?.id;
  }
  if (!userId) throw new Error("Nie udało się utworzyć konta.");

  await query(
    "UPDATE user SET role = 'admin', teamId = NULL, mustChangePassword = 1 WHERE id = ?",
    [userId],
  );

  revalidateUsers();
}

export async function resetUserPassword(
  formData: FormData,
): Promise<{ ok: true; email: string; password: string } | never> {
  await requireAdmin();
  const userId = str(formData.get("userId"));
  if (!userId) throw new Error("Brak userId.");
  const rows = await query<{ email: string }>(
    "SELECT email FROM user WHERE id = ? LIMIT 1",
    [userId],
  );
  if (!rows[0]) throw new Error("Użytkownik nie istnieje.");

  const newPassword = randomPassword(10);
  await setUserPasswordHash(userId, newPassword);
  await query(
    "UPDATE user SET mustChangePassword = 1, updatedAt = NOW() WHERE id = ?",
    [userId],
  );
  // Wyloguj wszystkie aktywne sesje tego użytkownika.
  await query("DELETE FROM session WHERE userId = ?", [userId]);
  revalidateUsers();
  return { ok: true, email: rows[0].email, password: newPassword };
}

export async function changeOwnPassword(formData: FormData) {
  const session = await getSession();
  if (!session?.user) throw new Error("Nie jesteś zalogowany.");
  const currentPassword = str(formData.get("currentPassword"));
  const newPassword = str(formData.get("newPassword"));
  const confirmPassword = str(formData.get("confirmPassword"));

  if (newPassword.length < 6) {
    throw new Error("Nowe hasło minimum 6 znaków.");
  }
  if (newPassword !== confirmPassword) {
    throw new Error("Hasła nie są identyczne.");
  }

  const accRows = await query<{ password: string | null }>(
    "SELECT password FROM account WHERE userId = ? AND providerId = 'credential' LIMIT 1",
    [session.user.id],
  );
  const hash = accRows[0]?.password;
  if (!hash) throw new Error("Nie znaleziono konta z hasłem.");
  const ok = await verifyPassword({ hash, password: currentPassword });
  if (!ok) throw new Error("Obecne hasło jest nieprawidłowe.");

  await setUserPasswordHash(session.user.id, newPassword);
  await query(
    "UPDATE user SET mustChangePassword = 0, updatedAt = NOW() WHERE id = ?",
    [session.user.id],
  );
}

export async function updateUserRole(formData: FormData) {
  await requireAdmin();
  const userId = str(formData.get("userId"));
  const role = str(formData.get("role"));
  const teamId = str(formData.get("teamId")) || null;

  if (!userId) throw new Error("Brak userId.");
  if (role !== "admin" && role !== "captain" && role !== "user") {
    throw new Error("Niepoprawna rola.");
  }
  if (role === "captain" && !teamId) {
    throw new Error("Kapitan musi mieć przypisaną drużynę.");
  }

  if (teamId) {
    const teamRows = await query<{ id: string }>(
      "SELECT id FROM teams WHERE id = ? LIMIT 1",
      [teamId],
    );
    if (!teamRows[0]) throw new Error("Drużyna nie istnieje.");
  }

  await query("UPDATE user SET role = ?, teamId = ? WHERE id = ?", [
    role,
    role === "captain" ? teamId : null,
    userId,
  ]);
  revalidateUsers();
}

export async function deleteUser(formData: FormData) {
  const session = await requireAdmin();
  const userId = str(formData.get("userId"));
  if (!userId) return;
  if (userId === session.user.id) {
    throw new Error("Nie możesz usunąć swojego konta.");
  }
  await query("DELETE FROM user WHERE id = ?", [userId]);
  revalidateUsers();
}
