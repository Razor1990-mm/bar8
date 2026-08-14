import Link from "next/link";
import { MemberTabBar } from "@/components/MemberTabBar";
import { AvatarMenu } from "@/components/AvatarMenu";
import { getViewer } from "@/lib/viewer";
import { getInitials } from "@/lib/initials";

const desktopLinks = [
  { href: "/home", label: "Home" },
  { href: "/events", label: "Events" },
  { href: "/members", label: "Members" },
  { href: "/garage", label: "Garage" },
  { href: "/stories", label: "Stories" },
];

/** Authenticated shell: top wordmark bar on all sizes, bottom tab bar on
 *  mobile, inline links on desktop. Auth gating arrives with Supabase in
 *  middleware.ts — until then this shell renders for everyone (fixtures). */
export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewer();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-hairline bg-ink/95 px-6 py-4 backdrop-blur md:px-12">
        <Link href="/home" className="type-display text-lg tracking-tight">
          BAR8
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {desktopLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="type-label transition-colors hover:text-bone"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        {viewer && (
          <AvatarMenu
            initials={getInitials(viewer.first_name, viewer.last_name)}
            slug={viewer.slug}
            isAdmin={viewer.is_admin}
          />
        )}
      </header>
      {/* pb clears the fixed mobile tab bar */}
      <div className="flex-1 pb-20 md:pb-0">{children}</div>
      <MemberTabBar />
    </div>
  );
}
