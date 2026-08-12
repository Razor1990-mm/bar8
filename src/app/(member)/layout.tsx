import Link from "next/link";
import { MemberTabBar } from "@/components/MemberTabBar";

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
export default function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
        {/* Avatar menu placeholder — becomes a sheet with My Profile /
            Settings / Sign Out once auth lands */}
        <Link
          href="/members/raza"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-charcoal text-sm text-muted"
        >
          R
        </Link>
      </header>
      {/* pb clears the fixed mobile tab bar */}
      <div className="flex-1 pb-20 md:pb-0">{children}</div>
      <MemberTabBar />
    </div>
  );
}
