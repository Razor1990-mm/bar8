import type { Metadata } from "next";
import { EventCard } from "@/components/EventCard";
import { getEvents } from "@/lib/data";

export const metadata: Metadata = { title: "Events" };

const FILTERS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "drive", label: "Drives" },
  { key: "track", label: "Track" },
  { key: "social", label: "Social" },
  { key: "dinner", label: "Dinners" },
  { key: "trip", label: "Trips" },
  { key: "past", label: "Past" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

/** Events index. Filters are URL state (?filter=track) so WhatsApp links
 *  can deep-link a filtered view; server-rendered, no client JS needed. */
export default async function EventsPage({
  searchParams,
}: PageProps<"/events">) {
  const params = await searchParams;
  const raw = Array.isArray(params.filter) ? params.filter[0] : params.filter;
  const active: FilterKey = FILTERS.some((f) => f.key === raw)
    ? (raw as FilterKey)
    : "upcoming";

  const events = await getEvents();
  const filtered = events.filter((e) => {
    if (active === "upcoming") return !e.isPast;
    if (active === "past") return e.isPast;
    return e.category === active && !e.isPast;
  });

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-10 md:px-12 md:py-16">
      <h1 className="type-display mb-8 text-4xl md:text-6xl">Events</h1>

      {/* Filter row — horizontal scroll on mobile, no wrap */}
      <nav className="mb-10 flex gap-6 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch]">
        {FILTERS.map((f) => (
          <a
            key={f.key}
            href={f.key === "upcoming" ? "/events" : `/events?filter=${f.key}`}
            className={`type-label whitespace-nowrap transition-colors ${
              active === f.key ? "text-bone" : "hover:text-bone"
            }`}
          >
            {f.label}
          </a>
        ))}
      </nav>

      {filtered.length > 0 ? (
        <div className="grid gap-10 md:grid-cols-3">
          {filtered.map((e) => (
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
      ) : (
        <p className="type-editorial border-t border-hairline pt-8 text-muted">
          Nothing here yet. The calendar fills up — check Upcoming.
        </p>
      )}
    </main>
  );
}
