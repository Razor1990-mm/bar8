import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

const links = [
  { href: "/admin/applications", label: "Applications" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/members", label: "Members" },
];

/** Admin shell. Server-side is_admin gate on every request — the proxy
 *  only checks for a session; admin needs the profile flag. Fail closed. */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!supabaseConfigured()) redirect("/login");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) redirect("/home");

  return (
    <div className="min-h-svh">
      <header className="flex items-center justify-between border-b border-hairline px-6 py-4 md:px-12">
        <Link href="/home" className="type-display text-lg tracking-tight">
          BAR8 <span className="type-label ml-2">Admin</span>
        </Link>
        <nav className="flex gap-6">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="type-label transition-colors hover:text-bone"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-[1120px] px-6 py-10 md:px-12">
        {children}
      </main>
    </div>
  );
}
