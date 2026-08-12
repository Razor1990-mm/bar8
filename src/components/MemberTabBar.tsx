"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/home", label: "Home" },
  { href: "/events", label: "Events" },
  { href: "/members", label: "Members" },
  { href: "/garage", label: "Garage" },
  { href: "/stories", label: "Stories" },
];

/** Member bottom tab bar — mobile only; desktop gets a top nav.
 *  Thumb-reachable, native-feeling, safe-area aware. */
export function MemberTabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="flex">
        {tabs.map((t) => {
          const active = pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex-1 py-3.5 text-center text-[11px] font-medium uppercase tracking-widest transition-colors ${
                active ? "text-bone" : "text-muted"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
