"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function AvatarMenu({
  initials,
  slug,
  isAdmin,
}: {
  initials: string;
  slug: string;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-charcoal text-sm text-muted transition-colors hover:text-bone"
      >
        {initials}
      </button>

      {open && (
        <>
          {/* Mobile: fixed sheet from bottom. Desktop: dropdown under the avatar. */}
          <div
            className="fixed inset-0 z-40 bg-ink/60 md:hidden"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="fixed inset-x-0 bottom-0 z-50 border-t border-hairline bg-ink px-6 py-4 md:absolute md:inset-x-auto md:right-0 md:top-full md:bottom-auto md:mt-2 md:w-56 md:border md:border-hairline md:px-2 md:py-2"
          >
            <MenuLink href={`/members/${slug}`} onNavigate={() => setOpen(false)}>
              My Profile
            </MenuLink>
            <MenuLink href="/garage" onNavigate={() => setOpen(false)}>
              My Garage
            </MenuLink>
            <MenuLink href="/settings" onNavigate={() => setOpen(false)}>
              Settings
            </MenuLink>
            {isAdmin && (
              <MenuLink href="/admin" onNavigate={() => setOpen(false)}>
                Admin
              </MenuLink>
            )}
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="type-label flex min-h-[44px] w-full items-center px-2 text-left text-muted transition-colors hover:text-bone"
              >
                Sign Out
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

function MenuLink({
  href,
  onNavigate,
  children,
}: {
  href: string;
  onNavigate: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className="type-label flex min-h-[44px] items-center px-2 text-bone transition-colors hover:text-muted"
    >
      {children}
    </Link>
  );
}
