"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";

export function NavAuth() {
  const { data, isPending } = useSession();
  const router = useRouter();
  if (isPending) return <span className="mono text-[11px]">...</span>;
  const user = data?.user as
    | { email: string; role?: string }
    | undefined;
  if (!user) {
    return (
      <Link href="/login" className="btn-ghost inline-block">
        Zaloguj
      </Link>
    );
  }
  const isAdmin = user.role === "admin";
  return (
    <div className="flex items-center gap-2">
      {isAdmin && (
        <Link href="/admin" className="btn-primary inline-block text-sm">
          Panel admina
        </Link>
      )}
      <span className="mono text-[11px] hidden sm:inline max-w-[140px] truncate">
        {user.email}
      </span>
      <button
        type="button"
        className="btn-ghost text-sm"
        onClick={async () => {
          await signOut();
          router.refresh();
          router.push("/");
        }}
      >
        Wyloguj
      </button>
    </div>
  );
}
