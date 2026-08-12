import Link from "next/link";
import { ClubImage } from "@/components/ClubImage";
import { AvatarStack } from "@/components/AvatarStack";
import { EventCard } from "@/components/EventCard";
import { SectionHeader } from "@/components/SectionHeader";
import { ButtonLink } from "@/components/Button";
import {
  getEvents,
  getNextEvent,
  getEventAttendees,
  getStories,
} from "@/lib/data";

function greeting(): string {
  // Server-rendered in the club's home timezone; good enough for V1.
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/Los_Angeles",
    }).format(new Date()),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** The member dashboard. Answers, in order: what's next, who's going,
 *  what else is coming, what did I miss. Hardcoded viewer = Raza until
 *  auth lands. */
export default async function HomePage() {
  const next = await getNextEvent();
  const events = await getEvents();
  const stories = await getStories();
  const attendees = next ? await getEventAttendees(next) : [];
  const upcoming = events.filter((e) => !e.isPast && e.slug !== next?.slug);
  const lastStory = stories[0];

  const viewerName = "Raza"; // TODO(auth): from session profile
  const isGoing = attendees.some((a) => a.member.slug === "raza");
  const spotsLeft = next?.capacity ? next.capacity - attendees.length : null;

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-10 md:px-12 md:py-16">
      <p className="type-editorial mb-12 text-2xl text-muted md:text-3xl">
        {greeting()}, <span className="text-bone">{viewerName}</span>.
      </p>

      {next && (
        <section className="mb-16">
          <SectionHeader kicker="Next Drive" className="mb-6" />
          <Link href={`/events/${next.slug}`} className="group block">
            <ClubImage
              src={next.heroUrl}
              alt={next.title}
              priority
              sizes="(max-width: 768px) 100vw, 1120px"
              className="mb-6 aspect-[4/3] w-full transition-transform duration-700 group-hover:scale-[1.005] md:aspect-[21/9]"
            />
            <h1 className="type-display mb-4 text-3xl md:text-6xl">
              {next.title}
            </h1>
          </Link>
          <div className="type-data mb-6 space-y-1 text-muted">
            <p className="text-bone">{next.dateLabel}</p>
            {next.meetTime && (
              <p>
                Meet {next.meetTime}
                {next.departTime ? ` · Depart ${next.departTime}` : ""}
              </p>
            )}
            <p>
              {attendees.length} attending
              {spotsLeft !== null && spotsLeft > 0
                ? ` · ${spotsLeft} spots remaining`
                : ""}
            </p>
          </div>
          <div className="mb-8">
            <AvatarStack
              members={attendees.map((a) => ({
                id: a.member.id,
                name: a.member.name,
                avatarUrl: a.member.avatarUrl,
              }))}
              size={36}
            />
          </div>
          <div className="flex items-center gap-6">
            <ButtonLink href={`/events/${next.slug}`}>View Event</ButtonLink>
            {isGoing ? (
              <span className="type-label text-signal">
                You&rsquo;re going ✓
              </span>
            ) : (
              <ButtonLink href={`/events/${next.slug}`} variant="ghost">
                RSVP →
              </ButtonLink>
            )}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="mb-16">
          <SectionHeader kicker="Coming Up" className="mb-8" />
          <div className="grid gap-10 md:grid-cols-3">
            {upcoming.slice(0, 5).map((e) => (
              <EventCard
                key={e.slug}
                event={{
                  slug: e.slug,
                  title: e.title,
                  dateLabel: e.shortDateLabel,
                  category: e.category.toUpperCase(),
                  imageUrl: e.heroUrl,
                  attending: e.attendance.length,
                  capacity: e.capacity,
                }}
              />
            ))}
          </div>
        </section>
      )}

      {lastStory && (
        <section>
          <SectionHeader kicker="From the Last Drive" className="mb-8" />
          <Link href={`/stories/${lastStory.slug}`} className="group block">
            <ClubImage
              src={lastStory.heroUrl}
              alt={lastStory.title}
              sizes="(max-width: 768px) 100vw, 1120px"
              className="mb-5 aspect-[3/2] w-full transition-transform duration-700 group-hover:scale-[1.005] md:aspect-[21/9]"
            />
            <p className="type-label mb-2">{lastStory.dateLabel}</p>
            <h2 className="type-display text-2xl md:text-4xl">
              {lastStory.title}
            </h2>
            <p className="type-editorial mt-3 text-muted">{lastStory.dek}</p>
          </Link>
        </section>
      )}
    </main>
  );
}
