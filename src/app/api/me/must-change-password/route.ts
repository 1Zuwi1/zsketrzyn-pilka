import {
  getMustChangePassword,
  getUserRole,
  getSession,
} from "@/lib/auth-helpers";

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return Response.json(
      { authenticated: false, mustChangePassword: false },
      { headers: { "cache-control": "no-store" } },
    );
  }
  const [must, r] = await Promise.all([
    getMustChangePassword(session.user.id),
    getUserRole(session.user.id),
  ]);
  return Response.json(
    {
      authenticated: true,
      mustChangePassword: must,
      role: r.role,
      teamId: r.teamId,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
