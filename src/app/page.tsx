import Link from "next/link";
import Image from "next/image";
import { PublicNav } from "@/components/PublicNav";

/** Public homepage — intrigue over explanation. Full-screen hero,
 *  two CTAs, nothing else above the fold. */
export default function Home() {
  return (
    <main className="relative flex-1">
      <PublicNav />
      <section className="relative flex min-h-svh flex-col justify-end px-6 pb-16 md:px-12 md:pb-24">
        <Image
          src="/imagery/hero.jpg"
          alt="An Audi R8 on a mountain road at dusk"
          fill
          priority
          sizes="100vw"
          className="object-cover [filter:saturate(0.82)_contrast(1.05)]"
        />
        {/* Legibility scrim — image stays the subject, text stays readable */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/20" />
        <div className="relative">
        <p className="type-label mb-6 reveal">BAR8 · Private Drivers Club</p>
        <h1 className="type-display reveal text-5xl md:text-8xl max-w-4xl">
          Built to be driven.
        </h1>
        <p className="type-editorial reveal mt-6 max-w-md text-muted">
          A private community built around great cars, great roads and the
          people behind the wheel.
        </p>
        <div className="reveal mt-10 flex items-center gap-6">
          <Link
            href="/join"
            className="border border-bone px-6 py-3 text-sm font-medium uppercase tracking-widest transition-colors hover:bg-bone hover:text-ink"
          >
            Request to Join
          </Link>
          <Link
            href="/club"
            className="type-label transition-colors hover:text-bone"
          >
            Explore the Club →
          </Link>
        </div>
        </div>
      </section>
    </main>
  );
}
