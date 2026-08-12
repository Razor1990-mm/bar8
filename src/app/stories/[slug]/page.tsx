import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";
import { ClubImage } from "@/components/ClubImage";
import { Stat } from "@/components/Stat";
import { SectionHeader } from "@/components/SectionHeader";
import { getStory, getStorySlugs } from "@/lib/data";

export async function generateStaticParams() {
  const slugs = await getStorySlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/stories/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const story = await getStory(slug);
  if (!story) return {};
  return { title: story.title, description: story.dek };
}

/** A single piece of club history: hero, dek, recap, the cars that came.
 *  The photo grid intentionally varies aspect so it reads as a magazine
 *  spread rather than a uniform gallery. */
export default async function StoryPage({
  params,
}: PageProps<"/stories/[slug]">) {
  const { slug } = await params;
  const story = await getStory(slug);
  if (!story) notFound();

  return (
    <main className="relative flex-1">
      <PublicNav />

      <ClubImage
        src={story.heroUrl}
        alt={story.title}
        priority
        sizes="100vw"
        className="aspect-[4/5] w-full md:aspect-[21/9]"
      />

      <section className="mx-auto max-w-[1120px] px-6 py-12 md:px-12 md:py-20">
        <p className="type-label mb-4">
          {story.dateLabel}
          {story.routeLabel ? ` · ${story.routeLabel}` : ""}
        </p>
        <h1 className="type-display mb-6 text-4xl md:text-7xl">
          {story.title}
        </h1>
        <p className="type-editorial text-xl text-bone md:text-2xl">
          {story.dek}
        </p>
      </section>

      <section className="mx-auto max-w-[1120px] px-6 pb-16 md:px-12">
        <div className="type-editorial space-y-6 text-muted">
          {story.body.map((para, i) => (
            <p key={i} className={i === 0 ? "text-lg text-bone/90" : undefined}>
              {para}
            </p>
          ))}
        </div>
      </section>

      {/* Editorial photo grid — varied aspects, full-bleed break */}
      <section className="grid grid-cols-2 gap-2 px-2 pb-16 md:grid-cols-3 md:gap-3 md:px-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <ClubImage
            key={i}
            alt={`${story.title} photograph ${i + 1}`}
            className={
              i === 0
                ? "col-span-2 aspect-[3/2] md:col-span-2 md:row-span-2 md:aspect-auto"
                : "aspect-square"
            }
          />
        ))}
      </section>

      <section className="mx-auto max-w-[1120px] px-6 pb-16 md:px-12">
        <SectionHeader kicker="Cars that came" className="mb-10" />
        <div className="mb-10">
          <Stat value={story.attendeeCount} label="Cars" />
        </div>
        <ul className="grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-3">
          {story.carBreakdown.map((c) => (
            <li
              key={c.label}
              className="flex items-baseline justify-between border-t border-hairline pt-3"
            >
              <span className="text-bone">{c.label}</span>
              <span className="type-data text-muted">{c.count}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-[1120px] px-6 pb-24 md:px-12 md:pb-32">
        <Link href="/stories" className="type-label hover:text-bone">
          ← All stories
        </Link>
      </section>
    </main>
  );
}
