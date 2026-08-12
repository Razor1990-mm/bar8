import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";
import { ClubImage } from "@/components/ClubImage";
import { StatLine } from "@/components/Stat";
import { getStories } from "@/lib/fixtures";

export const metadata: Metadata = {
  title: "Stories",
  description: "Every drive becomes a permanent piece of club history.",
};

/** The archive. Deliberately not a photo grid — each entry is an editorial
 *  record of a day, and the accumulation is the argument for joining. */
export default async function StoriesPage() {
  const stories = await getStories();

  return (
    <main className="relative flex-1">
      <PublicNav />

      <section className="px-6 pb-12 pt-32 md:px-12 md:pb-20 md:pt-44">
        <p className="type-label mb-6">Stories</p>
        <h1 className="type-display max-w-3xl text-4xl md:text-7xl">
          Where we&rsquo;ve been.
        </h1>
      </section>

      <div className="mx-auto max-w-[1120px] px-6 pb-24 md:px-12 md:pb-32">
        {stories.map((story, i) => (
          <Link
            key={story.slug}
            href={`/stories/${story.slug}`}
            className="group block border-t border-hairline py-10 md:py-14"
          >
            <div className="grid gap-6 md:grid-cols-[3fr_2fr] md:items-center md:gap-16">
              <ClubImage
                src={story.heroUrl}
                alt={story.title}
                sizes="(max-width: 768px) 100vw, 60vw"
                className={`w-full transition-transform duration-700 group-hover:scale-[1.01] ${
                  i === 0 ? "aspect-[3/2]" : "aspect-[16/10]"
                }`}
              />
              <div>
                <p className="type-label mb-3">{story.dateLabel}</p>
                <h2 className="type-display mb-4 text-3xl md:text-5xl">
                  {story.title}
                </h2>
                <p className="type-editorial mb-4 text-lg text-muted">
                  {story.dek}
                </p>
                <StatLine items={story.stats} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
