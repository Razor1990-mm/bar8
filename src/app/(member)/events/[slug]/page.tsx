import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ClubImage } from "@/components/ClubImage";
import { AvatarStack } from "@/components/AvatarStack";
import { SectionHeader } from "@/components/SectionHeader";
import { Stat } from "@/components/Stat";
import { ButtonLink } from "@/components/Button";
import { getEvent, getEventAttendees, getEvents } from "@/lib/fixtures";

export async function generateStaticParams() {
  const events = await getEvents();
  return events.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/events/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) return {};
  return { title: event.title, description: event.subtitle ?? undefined };
}

/** The screen that arrives via WhatsApp. Order matters: what/when → who's
 *  going (social proof before logistics) → RSVP → schedule → route. */
export default async function EventPage({
  params,
}: PageProps<"/events/[slug]">) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();

  const attendees = await getEventAttendees(event);
  const carsComing = attendees.filter((a) => a.car);

  // Cars Attending breakdown — grouped by make, "Other" folds the tail.
  const byMake = new Map<string, number>();
  for (const a of carsComing) {
    const key = `${a.car!.make} ${a.car!.model}`;
    byMake.set(key, (byMake.get(key) ?? 0) + 1);
  }
  const breakdown = [...byMake.entries()].sort((a, b) => b[1] - a[1]);

  const mapsUrl = event.startLocation
    ? `https://maps.apple.com/?q=${encodeURIComponent(event.startLocation)}`
    : null;
  const gmapsUrl = event.startLocation
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.startLocation)}`
    : null;

  return (
    <main>
      <ClubImage
        src={event.heroUrl}
        alt={event.title}
        priority
        sizes="100vw"
        className="aspect-[4/5] w-full md:aspect-[21/9]"
      />

      <div className="mx-auto max-w-[1120px] px-6 md:px-12">
        {/* Header */}
        <section className="py-10 md:py-16">
          <p className="type-label mb-4">
            {event.shortDateLabel} · {event.category.toUpperCase()}
          </p>
          <h1 className="type-display mb-4 text-3xl md:text-6xl">
            {event.title}
          </h1>
          {event.subtitle && (
            <p className="type-editorial mb-6 text-lg text-muted">
              {event.subtitle}
            </p>
          )}
          <div className="type-data space-y-1 text-muted">
            <p className="text-bone">{event.dateLabel}</p>
            {event.routeSummary && <p>{event.routeSummary}</p>}
          </div>
        </section>

        {/* Social proof + RSVP — above the fold on mobile after the hero */}
        <section className="border-t border-hairline py-8">
          <p className="type-data mb-4 text-2xl">
            {event.capacity
              ? `${attendees.length} / ${event.capacity} attending`
              : `${attendees.length} attending`}
          </p>
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
          <div className="flex flex-wrap items-center gap-5">
            {event.lumaUrl ? (
              <ButtonLink href={event.lumaUrl} target="_blank">
                RSVP
              </ButtonLink>
            ) : (
              <span className="type-label">RSVP opens soon</span>
            )}
            {event.whatsappUrl && (
              <ButtonLink
                href={event.whatsappUrl}
                variant="ghost"
                target="_blank"
              >
                Open Event Chat →
              </ButtonLink>
            )}
          </div>
        </section>

        {/* Schedule */}
        {event.schedule.length > 0 && (
          <section className="py-8">
            <SectionHeader kicker="Schedule" className="mb-8" />
            <ol className="space-y-0">
              {event.schedule.map((s) => (
                <li
                  key={`${s.time}-${s.label}`}
                  className="flex items-baseline gap-6 border-t border-hairline py-4 first:border-t-0"
                >
                  <span className="type-data w-24 shrink-0 text-muted">
                    {s.time}
                  </span>
                  <span className="text-bone">{s.label}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Route */}
        <section className="py-8">
          <SectionHeader kicker="Route" className="mb-8" />
          <div className="mb-8 grid grid-cols-2 gap-10 md:grid-cols-4">
            {event.startLocation && (
              <div className="col-span-2">
                <p className="type-label mb-1.5">Start</p>
                <p className="text-bone">{event.startLocation}</p>
              </div>
            )}
            {event.distanceMiles && (
              <Stat value={event.distanceMiles} label="Miles" />
            )}
            {event.estDriveMinutes && (
              <Stat
                value={`${Math.floor(event.estDriveMinutes / 60)}h ${event.estDriveMinutes % 60}m`}
                label="Driving"
              />
            )}
          </div>
          {/* Static route map lands with the Google Maps key */}
          {mapsUrl && gmapsUrl && (
            <div className="flex gap-6">
              <a
                href={mapsUrl}
                className="type-label transition-colors hover:text-bone"
              >
                Apple Maps →
              </a>
              <a
                href={gmapsUrl}
                className="type-label transition-colors hover:text-bone"
              >
                Google Maps →
              </a>
            </div>
          )}
        </section>

        {/* Who's Going */}
        <section className="py-8">
          <SectionHeader kicker="Who's Going" className="mb-8" />
          <div className="grid gap-8 md:grid-cols-3">
            {attendees.map((a) => (
              <Link
                key={a.member.id}
                href={`/members/${a.member.slug}`}
                className="group flex items-center gap-4 border-t border-hairline pt-4"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-charcoal text-muted">
                  {a.member.firstName.charAt(0)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-bone">
                    {a.member.firstName}
                  </p>
                  <p className="type-data truncate text-sm text-muted">
                    {a.car ? a.car.label : "Car TBD"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Cars Attending */}
        {breakdown.length > 0 && (
          <section className="py-8 pb-20">
            <SectionHeader kicker="Cars Attending" className="mb-8" />
            <div className="mb-8">
              <Stat value={carsComing.length} label="Cars confirmed" />
            </div>
            <ul className="grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-3">
              {breakdown.map(([label, count]) => (
                <li
                  key={label}
                  className="flex items-baseline justify-between border-t border-hairline pt-3"
                >
                  <span className="text-bone">{label}</span>
                  <span className="type-data text-muted">{count}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
