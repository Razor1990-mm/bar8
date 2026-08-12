import Link from "next/link";

const links = [
  { href: "/club", label: "Club" },
  { href: "/experiences", label: "Experiences" },
  { href: "/stories", label: "Stories" },
];

/** Public header — wordmark left, three links + join right.
 *  Transparent over hero imagery; minimal chrome. */
export function PublicNav() {
  return (
    <nav className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-5 md:px-12">
      <Link href="/" className="type-display text-lg tracking-tight">
        BAR8
      </Link>
      <div className="flex items-center gap-5 md:gap-8">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="type-label hidden transition-colors hover:text-bone sm:block"
          >
            {l.label}
          </Link>
        ))}
        <Link
          href="/join"
          className="type-label transition-colors hover:text-bone"
        >
          Request to Join
        </Link>
        <Link
          href="/login"
          className="type-label text-bone/70 transition-colors hover:text-bone"
        >
          Member Login
        </Link>
      </div>
    </nav>
  );
}
